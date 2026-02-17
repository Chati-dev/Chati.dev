#!/usr/bin/env node
/**
 * PRISM Engine Hook — UserPromptSubmit
 *
 * Injects PRISM context block into every user prompt.
 * Reads session state to determine bracket, agent, and mode,
 * then runs the PRISM pipeline to produce XML context.
 *
 * Claude Code Hook: triggers on every user message submission.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Read session.yaml and extract key fields for PRISM.
 */
function readSessionState(projectDir) {
  const sessionPath = join(projectDir, '.chati', 'session.yaml');
  if (!existsSync(sessionPath)) return null;

  const raw = readFileSync(sessionPath, 'utf-8');
  // Lightweight YAML extraction (avoid dependency)
  const extract = (key) => {
    const match = raw.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'));
    return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
  };

  return {
    mode: extract('mode') || 'discover',
    currentAgent: extract('current_agent') || null,
    workflow: extract('workflow') || null,
    pipelinePosition: extract('pipeline_position') || null,
    turnCount: parseInt(extract('turn_count') || '0', 10),
  };
}

/**
 * Main hook handler.
 * Reads stdin for hook event, outputs context to inject.
 */
async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const event = JSON.parse(input);
    const projectDir = event.cwd || process.cwd();
    const session = readSessionState(projectDir);

    if (!session) {
      // No active session — don't inject anything
      process.stdout.write(JSON.stringify({ result: 'allow' }));
      return;
    }

    // Estimate remaining context from turn count
    const maxTurns = 40;
    const remainingPercent = Math.max(0, Math.round((1 - session.turnCount / maxTurns) * 100));

    // Determine bracket
    let bracket = 'FRESH';
    if (remainingPercent < 25) bracket = 'CRITICAL';
    else if (remainingPercent < 40) bracket = 'DEPLETED';
    else if (remainingPercent < 60) bracket = 'MODERATE';

    // Load agent memory (if active agent has MEMORY.md)
    let memoryBlock = '';
    if (session.currentAgent) {
      const memoryPath = join(projectDir, '.chati', 'memories', session.currentAgent, 'MEMORY.md');
      if (existsSync(memoryPath)) {
        const raw = readFileSync(memoryPath, 'utf-8').trim();
        if (raw) {
          const trimmed = raw.slice(0, 500);
          memoryBlock = `  <agent-memory agent="${session.currentAgent}">\n${trimmed}\n  </agent-memory>`;
        }
      }
    }

    // Build minimal context block (full PRISM pipeline is used by orchestrator internally)
    const contextBlock = [
      `<chati-context bracket="${bracket}">`,
      `  <mode>${session.mode}</mode>`,
      session.currentAgent ? `  <agent>${session.currentAgent}</agent>` : '',
      session.pipelinePosition ? `  <pipeline-position>${session.pipelinePosition}</pipeline-position>` : '',
      memoryBlock,
      bracket === 'CRITICAL' ? '  <advisory>Context running low. Consider handoff or summary.</advisory>' : '',
      '</chati-context>',
    ].filter(Boolean).join('\n');

    process.stdout.write(JSON.stringify({
      result: 'allow',
      prefix: contextBlock,
    }));
  } catch {
    // On error, allow without injection
    process.stdout.write(JSON.stringify({ result: 'allow' }));
  }
}

export { readSessionState };

// Only run main when executed directly (not imported by tests)
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
