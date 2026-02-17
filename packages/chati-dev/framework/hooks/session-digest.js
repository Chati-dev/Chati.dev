#!/usr/bin/env node
/**
 * Session Digest Hook — PreCompact (runs before Claude compacts context)
 *
 * Saves a summary of the current session state so it can be
 * recovered after context compaction. Writes to .chati/memories/shared/session/.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

function extractDigest(projectDir) {
  const sessionPath = join(projectDir, '.chati', 'session.yaml');
  if (!existsSync(sessionPath)) return null;

  const raw = readFileSync(sessionPath, 'utf-8');
  const extract = (key) => {
    const match = raw.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'));
    return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
  };

  return {
    timestamp: new Date().toISOString(),
    mode: extract('mode') || 'discover',
    currentAgent: extract('current_agent') || 'none',
    pipelinePosition: extract('pipeline_position') || 'unknown',
    workflow: extract('workflow') || 'unknown',
  };
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const event = JSON.parse(input);
    const projectDir = event.cwd || process.cwd();
    const digest = extractDigest(projectDir);

    if (digest) {
      const digestDir = join(projectDir, '.chati', 'memories', 'shared', 'session');
      mkdirSync(digestDir, { recursive: true });

      const fileName = `digest-${Date.now()}.yaml`;
      const content = Object.entries(digest)
        .map(([k, v]) => `${k}: "${v}"`)
        .join('\n');

      writeFileSync(join(digestDir, fileName), content + '\n', 'utf-8');
    }

    process.stdout.write(JSON.stringify({ result: 'allow' }));
  } catch {
    process.stdout.write(JSON.stringify({ result: 'allow' }));
  }
}

// Only run main when executed directly (not imported by tests)
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
