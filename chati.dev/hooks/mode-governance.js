#!/usr/bin/env node
/**
 * Mode Governance Hook — PreToolUse (Write/Edit)
 *
 * BLOCKS write operations outside the scope of the current mode:
 * - planning mode: can only write to chati.dev/ and .chati/
 * - build mode: can write anywhere
 * - deploy mode: can write anywhere + infra
 *
 * Constitution Article XI enforcement.
 */

import { existsSync, readFileSync } from 'fs';
import { join, relative, isAbsolute } from 'path';

const MODE_SCOPES = {
  planning: {
    allowed: ['chati.dev/', '.chati/', 'chati.dev/artifacts/'],
    description: 'Planning mode: write only to chati.dev/ and .chati/',
  },
  build: {
    allowed: ['*'],
    description: 'Build mode: full write access',
  },
  deploy: {
    allowed: ['*'],
    description: 'Deploy mode: full write access including infrastructure',
  },
};

// Maps session states to governance modes (Article XI)
const STATE_TO_GOVERNANCE_MODE = {
  discover: 'planning',
  plan: 'planning',
  planning: 'planning',
  build: 'build',
  validate: 'build',
  deploy: 'deploy',
  completed: 'deploy',
};

function getCurrentMode(projectDir) {
  const sessionPath = join(projectDir, '.chati', 'session.yaml');
  if (!existsSync(sessionPath)) return 'planning'; // Default to most restrictive

  const raw = readFileSync(sessionPath, 'utf-8');
  const match = raw.match(/^\s*mode:\s*(.+)$/m);
  const state = match ? match[1].trim().replace(/^["']|["']$/g, '') : 'discover';
  return STATE_TO_GOVERNANCE_MODE[state] || 'planning';
}

function isPathAllowed(filePath, projectDir, mode) {
  const scope = MODE_SCOPES[mode];
  if (!scope) return false;

  const rel = isAbsolute(filePath) ? relative(projectDir, filePath) : filePath;
  // Block paths that escape the project — regardless of mode
  if (rel.startsWith('..')) return false;

  if (scope.allowed.includes('*')) return true;
  return scope.allowed.some(prefix => rel.startsWith(prefix));
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const event = JSON.parse(input);
    const projectDir = event.cwd || process.cwd();
    const toolInput = event.tool_input || {};
    const filePath = toolInput.file_path || toolInput.path || '';

    if (!filePath) {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
      return;
    }

    const mode = getCurrentMode(projectDir);

    if (isPathAllowed(filePath, projectDir, mode)) {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
    } else {
      const scope = MODE_SCOPES[mode];
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: `[Article XI] ${scope.description}. Cannot write to "${filePath}" in ${mode} mode.`,
      }));
    }
  } catch {
    // On error, allow (fail-open to avoid blocking legitimate work)
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  }
}

export { getCurrentMode, isPathAllowed, MODE_SCOPES, STATE_TO_GOVERNANCE_MODE };

// Only run main when executed directly (not imported by tests)
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
