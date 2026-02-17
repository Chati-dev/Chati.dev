/**
 * @fileoverview Terminal spawner for multi-agent parallel execution.
 *
 * Spawns separate Claude Code CLI processes so that multiple agents
 * can work concurrently.  The heavy lifting is split into pure,
 * testable helpers (buildSpawnCommand) and a thin runtime layer
 * (spawnTerminal) that actually calls child_process.spawn.
 */

import { spawn } from 'child_process';
import { validateWriteScopes, buildIsolationEnv } from './isolation.js';
import { getProvider } from './cli-registry.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _counter = 0;

/**
 * Generate a unique terminal identifier.
 *
 * @param {string} agent - Agent name
 * @returns {string} Unique ID in the form "agent-<timestamp>-<counter>"
 */
function generateTerminalId(agent) {
  _counter += 1;
  return `${agent}-${Date.now()}-${_counter}`;
}

/**
 * Reset the internal counter (useful in tests).
 */
export function _resetCounter() {
  _counter = 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SpawnConfig
 * @property {string} agent           - Agent name (e.g. "architect")
 * @property {string} taskId          - Task identifier
 * @property {string} [model]         - LLM model tier name (e.g. opus, pro, codex, claude-sonnet)
 * @property {string} [provider]      - CLI provider name (claude, gemini, codex, copilot)
 * @property {string} [prompt]        - Full prompt string (from prompt-builder, piped via stdin)
 * @property {object} [contextPayload] - Context to inject via env var
 * @property {string[]} [writeScope]   - Override write scope
 * @property {string} [workingDir]     - Working directory for the process
 * @property {number} [timeout]        - Max execution time in ms
 */

/**
 * @typedef {object} TerminalHandle
 * @property {string} id         - Unique terminal ID
 * @property {object|null} process - child_process.ChildProcess (null when dry)
 * @property {string} agent      - Agent name
 * @property {string} taskId     - Task identifier
 * @property {string} model      - Model used for this terminal
 * @property {string} startedAt  - ISO timestamp
 * @property {string} status     - "running" | "exited" | "killed"
 * @property {number|null} exitCode - Process exit code (null while running)
 * @property {string[]} stdout   - Captured stdout lines
 * @property {string[]} stderr   - Captured stderr lines
 * @property {number} timeout    - Max execution time in ms
 */

/**
 * Build the CLI command, arguments and environment for spawning a
 * Claude Code terminal.  This is a **pure function** -- it does not
 * perform any I/O and is therefore fully testable in isolation.
 *
 * @param {SpawnConfig} config
 * @returns {{ command: string, args: string[], env: Record<string, string>, terminalId: string, prompt: string|null }}
 */
export function buildSpawnCommand(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('buildSpawnCommand requires a config object');
  }
  if (!config.agent || typeof config.agent !== 'string') {
    throw new Error('config.agent is required and must be a string');
  }
  if (!config.taskId || typeof config.taskId !== 'string') {
    throw new Error('config.taskId is required and must be a string');
  }

  const terminalId = generateTerminalId(config.agent);
  const isolationEnv = buildIsolationEnv(config.agent);

  const env = {
    ...isolationEnv,
    CHATI_TERMINAL_ID: terminalId,
    CHATI_AGENT: config.agent,
    CHATI_TASK_ID: config.taskId,
    CHATI_SPAWNED: 'true',
  };

  if (config.contextPayload) {
    try {
      env.CHATI_CONTEXT = JSON.stringify(config.contextPayload);
    } catch {
      env.CHATI_CONTEXT = '{}';
    }
  }

  // Resolve CLI provider — defaults to claude for backwards compatibility
  const providerName = config.provider || 'claude';
  let command, args, prompt;

  try {
    const provider = getProvider(providerName);
    const adapterResult = provider.adapter.buildCommand(config, provider);
    command = adapterResult.command;
    args = adapterResult.args;
    prompt = adapterResult.stdinPrompt;
  } catch (err) {
    // Fallback to claude if provider resolution fails (backwards compatibility)
    console.error(`[chati] Provider "${providerName}" resolution failed: ${err.message}. Falling back to claude.`);
    command = 'claude';
    args = ['--print', '--dangerously-skip-permissions'];
    if (config.model) {
      const claudeProvider = getProvider('claude');
      const resolvedModel = claudeProvider.modelMap[config.model] || config.model;
      args.push('--model', resolvedModel);
    }
    prompt = config.prompt || null;
  }

  return { command, args, env, terminalId, prompt };
}

/**
 * Spawn a new terminal process for an agent task.
 *
 * @param {SpawnConfig} config
 * @returns {TerminalHandle}
 */
export function spawnTerminal(config) {
  const { command, args, env, terminalId, prompt } = buildSpawnCommand(config);

  const cwd = config.workingDir || process.cwd();
  const timeout = config.timeout || 300_000; // default 5 minutes

  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Pipe prompt via stdin (avoids shell argument length limits)
  if (prompt) {
    child.stdin.write(prompt);
  }
  child.stdin.end();

  /** @type {TerminalHandle} */
  const handle = {
    id: terminalId,
    process: child,
    agent: config.agent,
    taskId: config.taskId,
    model: config.model || 'unknown',
    startedAt: new Date().toISOString(),
    status: 'running',
    exitCode: null,
    stdout: [],
    stderr: [],
    timeout,
  };

  // Capture output (capped at ~10MB to prevent unbounded memory growth)
  const MAX_BUFFER_CHUNKS = 10_000;
  if (child.stdout) {
    child.stdout.on('data', (chunk) => {
      if (handle.stdout.length < MAX_BUFFER_CHUNKS) {
        handle.stdout.push(chunk.toString());
      }
    });
  }
  if (child.stderr) {
    child.stderr.on('data', (chunk) => {
      if (handle.stderr.length < MAX_BUFFER_CHUNKS) {
        handle.stderr.push(chunk.toString());
      }
    });
  }

  child.on('exit', (code) => {
    handle.status = 'exited';
    handle.exitCode = code;
  });

  child.on('error', (err) => {
    handle.status = 'exited';
    handle.exitCode = -1;
    handle.stderr.push(`spawn error: ${err.message}`);
  });

  // Enforce timeout — kill process if it exceeds max execution time
  const timeoutTimer = setTimeout(() => {
    if (handle.status === 'running') {
      handle.stderr.push(`timeout: process exceeded ${timeout}ms limit`);
      killTerminal(handle);
    }
  }, timeout);

  // Clear timer when process exits normally
  child.on('exit', () => clearTimeout(timeoutTimer));

  return handle;
}

/**
 * Spawn a group of terminals concurrently.
 * Validates write scopes before spawning to prevent conflicts.
 *
 * @param {SpawnConfig[]} configs
 * @returns {{ groupId: string, terminals: TerminalHandle[], startedAt: string }}
 * @throws {Error} When write scope conflicts are detected
 */
export function spawnParallelGroup(configs) {
  if (!Array.isArray(configs) || configs.length === 0) {
    throw new Error('spawnParallelGroup requires a non-empty array of configs');
  }

  const validation = validateWriteScopes(configs);
  if (!validation.valid) {
    const details = validation.conflicts
      .map(c => `${c.agents.join(' vs ')} on ${c.path}`)
      .join('; ');
    throw new Error(`Write scope conflicts detected: ${details}`);
  }

  const groupId = `group-${Date.now()}`;
  const terminals = configs.map(cfg => spawnTerminal(cfg));

  return {
    groupId,
    terminals,
    startedAt: new Date().toISOString(),
  };
}

/**
 * Gracefully kill a spawned terminal.
 * Sends SIGTERM first; if the process is still alive after 5 seconds,
 * escalates to SIGKILL.
 *
 * @param {TerminalHandle} handle
 * @returns {Promise<{ killed: boolean, exitCode: number|null }>}
 */
export function killTerminal(handle) {
  if (!handle || !handle.process) {
    return Promise.resolve({ killed: false, exitCode: handle?.exitCode ?? null });
  }

  if (handle.status === 'exited') {
    return Promise.resolve({ killed: false, exitCode: handle.exitCode });
  }

  return new Promise((resolve) => {
    const forceKillTimer = setTimeout(() => {
      try {
        handle.process.kill('SIGKILL');
      } catch {
        // already dead -- ignore
      }
    }, 5000);

    handle.process.once('exit', (code) => {
      clearTimeout(forceKillTimer);
      handle.status = 'killed';
      handle.exitCode = code;
      resolve({ killed: true, exitCode: code });
    });

    try {
      handle.process.kill('SIGTERM');
    } catch {
      clearTimeout(forceKillTimer);
      handle.status = 'killed';
      resolve({ killed: false, exitCode: handle.exitCode });
    }
  });
}

/**
 * Return the current status snapshot of a terminal.
 *
 * @param {TerminalHandle} handle
 * @returns {{ id: string, agent: string, model: string, status: string, elapsed: number, exitCode: number|null }}
 */
export function getTerminalStatus(handle) {
  if (!handle) {
    return { id: 'unknown', agent: 'unknown', model: 'unknown', status: 'unknown', elapsed: 0, exitCode: null };
  }

  const elapsed = Date.now() - new Date(handle.startedAt).getTime();

  return {
    id: handle.id,
    agent: handle.agent,
    model: handle.model || 'unknown',
    status: handle.status,
    elapsed,
    exitCode: handle.exitCode,
  };
}
