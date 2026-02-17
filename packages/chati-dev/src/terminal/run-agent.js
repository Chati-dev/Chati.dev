#!/usr/bin/env node
/**
 * CLI runner for single-agent terminal execution.
 *
 * Called by the orchestrator via the Bash tool to spawn an agent
 * in a separate Claude Code process with the correct model.
 *
 * Usage:
 *   node run-agent.js --agent detail --task-id expand-prd \
 *     --project-dir /path/to/project --previous-agent brief \
 *     --timeout 600000
 *
 * Outputs JSON to stdout for the orchestrator to parse.
 */

import { fileURLToPath } from 'url';
import { buildAgentPrompt } from './prompt-builder.js';
import { spawnTerminal } from './spawner.js';
import { parseAgentOutput } from './handoff-parser.js';

// ---------------------------------------------------------------------------
// CLI argument parsing (no external deps)
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = 'true';
      }
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);

  // Validate required args
  if (!args.agent) {
    outputError('Missing required argument: --agent');
    process.exit(1);
  }
  if (!args['task-id']) {
    outputError('Missing required argument: --task-id');
    process.exit(1);
  }

  const projectDir = args['project-dir'] || process.cwd();
  const timeout = parseInt(args.timeout, 10) || 600_000; // default 10 minutes

  // Load session state if available
  let sessionState = {};
  try {
    const { existsSync, readFileSync } = await import('fs');
    const { join } = await import('path');
    const sessionPath = join(projectDir, '.chati', 'session.yaml');
    if (existsSync(sessionPath)) {
      const raw = readFileSync(sessionPath, 'utf-8');
      sessionState = parseSimpleYaml(raw);
    }
  } catch {
    // Session state is optional — continue without it
  }

  // Build the agent prompt
  let promptResult;
  try {
    promptResult = buildAgentPrompt({
      agent: args.agent,
      taskId: args['task-id'],
      projectDir,
      previousAgent: args['previous-agent'] || null,
      workflow: args.workflow || null,
      sessionState,
      additionalContext: args['additional-context'] || null,
    });
  } catch (err) {
    outputError(`Failed to build prompt: ${err.message}`);
    process.exit(1);
  }

  // Spawn the agent terminal
  const startTime = Date.now();
  let handle;

  try {
    handle = spawnTerminal({
      agent: args.agent,
      taskId: args['task-id'],
      model: promptResult.model,
      prompt: promptResult.prompt,
      workingDir: projectDir,
      timeout,
    });
  } catch (err) {
    outputError(`Failed to spawn terminal: ${err.message}`);
    process.exit(1);
  }

  // Wait for the process to complete
  try {
    await waitForExit(handle, timeout);
  } catch (err) {
    outputError(`Terminal execution failed: ${err.message}`);
    process.exit(2);
  }

  const elapsed = Date.now() - startTime;
  const stdout = handle.stdout.join('');
  const stderr = handle.stderr.join('');

  // Parse the handoff from stdout
  const parsed = parseAgentOutput(stdout);

  if (parsed.found) {
    outputResult({
      status: parsed.handoff.status,
      agent: args.agent,
      model: promptResult.model,
      exitCode: handle.exitCode,
      handoff: parsed.handoff,
      elapsed,
    });
  } else {
    // No handoff block found — return raw output
    outputResult({
      status: handle.exitCode === 0 ? 'partial' : 'error',
      agent: args.agent,
      model: promptResult.model,
      exitCode: handle.exitCode,
      handoff: null,
      rawOutput: stdout.slice(0, 5000), // Truncate to avoid huge JSON
      stderr: stderr.slice(0, 2000),
      elapsed,
    });
  }

  process.exit(handle.exitCode === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wait for a terminal handle's process to exit.
 */
function waitForExit(handle, timeout) {
  return new Promise((resolve, reject) => {
    if (handle.status === 'exited') {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      if (handle.process && typeof handle.process.kill === 'function') {
        try { handle.process.kill('SIGKILL'); } catch { /* ignore */ }
      }
      handle.status = 'exited';
      handle.exitCode = -2;
      reject(new Error(`Terminal timed out after ${Math.round(timeout / 1000)}s`));
    }, timeout);

    handle.process.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });

    handle.process.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Output a structured JSON result to stdout.
 */
function outputResult(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

/**
 * Output an error as JSON to stdout (so orchestrator can parse it).
 */
function outputError(message) {
  process.stdout.write(JSON.stringify({ status: 'error', error: message }) + '\n');
}

/**
 * Minimal YAML parser for session.yaml (handles flat and one-level nested keys).
 */
function parseSimpleYaml(content) {
  const result = {};
  let currentSection = null;

  for (const line of content.split('\n')) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();
    const kvMatch = trimmed.match(/^([\w_-]+):\s*(.*)/);

    if (kvMatch) {
      const key = kvMatch[1];
      const value = kvMatch[2].trim().replace(/^["']|["']$/g, '');

      if (indent === 0) {
        if (value === '' || value === undefined) {
          // Section header
          currentSection = key;
          result[key] = result[key] || {};
        } else {
          result[key] = value;
          currentSection = null;
        }
      } else if (currentSection && indent > 0) {
        if (typeof result[currentSection] !== 'object') {
          result[currentSection] = {};
        }
        result[currentSection][key] = value;
      }
    }
  }

  return result;
}

// Guard pattern (per project convention)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    outputError(err.message);
    process.exit(1);
  });
}

export { parseArgs, waitForExit, parseSimpleYaml };
