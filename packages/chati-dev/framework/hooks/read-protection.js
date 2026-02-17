#!/usr/bin/env node
/**
 * Read Protection Hook — PreToolUse (Read)
 *
 * BLOCKS reading sensitive files that may contain secrets:
 * - .env files (except .env.example, .env.template)
 * - Private keys (*.pem, *.key) — except signing-public-key.pem
 * - Credentials and secrets files
 * - .git/config (may contain tokens)
 *
 * Enforces Article IV: Secret protection.
 */

import { relative, basename } from 'path';

const SENSITIVE_PATTERNS = [
  /^\.env$/,
  /^\.env\.[^.]+$/,
  /\.pem$/,
  /^credentials\./,
  /^credentials$/,
  /^secrets\./,
  /\.key$/,
  /^\.git\/config$/,
];

const ALLOWED_EXCEPTIONS = [
  /signing-public-key\.pem$/,
  /\.env\.example$/,
  /\.env\.template$/,
];

/**
 * Check if a file path is sensitive (should not be read).
 * @param {string} filePath - Absolute or relative file path
 * @param {string} cwd - Current working directory
 * @returns {{ sensitive: boolean, reason: string }}
 */
function isSensitivePath(filePath, cwd) {
  if (!filePath || typeof filePath !== 'string') {
    return { sensitive: false, reason: '' };
  }

  // Normalize to relative path
  let rel;
  try {
    rel = relative(cwd, filePath);
  } catch {
    rel = filePath;
  }

  const name = basename(rel);

  // Check allowed exceptions first
  for (const pattern of ALLOWED_EXCEPTIONS) {
    if (pattern.test(name) || pattern.test(rel)) {
      return { sensitive: false, reason: '' };
    }
  }

  // Check sensitive patterns against both filename and relative path
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(name) || pattern.test(rel)) {
      return {
        sensitive: true,
        reason: `File matches sensitive pattern: ${pattern.source}`,
      };
    }
  }

  return { sensitive: false, reason: '' };
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const event = JSON.parse(input);
    const toolInput = event.tool_input || {};
    const filePath = toolInput.file_path || '';
    const cwd = event.cwd || process.cwd();

    const result = isSensitivePath(filePath, cwd);

    if (result.sensitive) {
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: `[Article IV] ${result.reason}. Use environment variables or secure vaults instead of reading sensitive files directly.`,
      }));
      return;
    }

    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  } catch {
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  }
}

export { isSensitivePath, SENSITIVE_PATTERNS, ALLOWED_EXCEPTIONS };

// Only run main when executed directly (not imported by tests)
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
