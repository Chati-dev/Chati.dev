/**
 * @fileoverview Health check engine for chati.dev.
 *
 * Validates framework integrity, CLI availability, session state,
 * hook health, dependencies, and provider authentication.
 * Constitution Article XIV — Framework Registry Governance.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { isCommandAvailable, parseProviderConfig } from '../utils/config-parser.js';

// ---------------------------------------------------------------------------
// Check Result Types
// ---------------------------------------------------------------------------

/**
 * @typedef {object} CheckResult
 * @property {string} name - Check name
 * @property {'pass'|'warn'|'fail'} status - Check status
 * @property {string} message - Human-readable result
 * @property {number} duration - Execution time in ms
 */

/**
 * @typedef {object} HealthReport
 * @property {number} score - Overall score (0-100)
 * @property {number} total - Total checks run
 * @property {number} passed - Checks passed
 * @property {number} warned - Checks with warnings
 * @property {number} failed - Checks failed
 * @property {CheckResult[]} checks - Individual check results
 * @property {string} timestamp - ISO timestamp
 */

// ---------------------------------------------------------------------------
// Individual Checks
// ---------------------------------------------------------------------------

/**
 * Check if configured CLI providers are available on the system.
 *
 * @param {string} projectDir
 * @returns {Promise<CheckResult>}
 */
export async function checkCliAvailability(projectDir) {
  const start = Date.now();
  const configPath = join(projectDir, 'chati.dev', 'config.yaml');

  if (!existsSync(configPath)) {
    return { name: 'cli-availability', status: 'warn', message: 'No config.yaml found', duration: Date.now() - start };
  }

  const { enabled } = parseProviderConfig(projectDir);
  const missing = [];

  for (const provider of enabled) {
    const available = await isCommandAvailable(provider);
    if (!available) {
      missing.push(provider);
    }
  }

  if (missing.length > 0) {
    return { name: 'cli-availability', status: 'warn', message: `Missing CLIs: ${missing.join(', ')}`, duration: Date.now() - start };
  }

  return { name: 'cli-availability', status: 'pass', message: 'All enabled CLIs available', duration: Date.now() - start };
}

/**
 * Validate framework file integrity against entity registry.
 *
 * @param {string} projectDir
 * @returns {Promise<CheckResult>}
 */
export async function checkFrameworkIntegrity(projectDir) {
  const start = Date.now();
  const registryPath = join(projectDir, 'chati.dev', 'data', 'entity-registry.yaml');

  if (!existsSync(registryPath)) {
    return { name: 'framework-integrity', status: 'warn', message: 'No entity registry found', duration: Date.now() - start };
  }

  const raw = readFileSync(registryPath, 'utf-8');
  const pathMatches = raw.match(/path:\s*["']?([^\s"']+)["']?/gm) || [];
  let missing = 0;

  for (const match of pathMatches) {
    const filePath = match.replace(/path:\s*["']?/, '').replace(/["']?$/, '');
    if (!existsSync(join(projectDir, filePath))) {
      missing++;
    }
  }

  if (missing > 0) {
    return { name: 'framework-integrity', status: 'warn', message: `${missing} registered entities missing from filesystem`, duration: Date.now() - start };
  }

  return { name: 'framework-integrity', status: 'pass', message: 'All registered entities exist', duration: Date.now() - start };
}

/**
 * Validate session.yaml structure.
 *
 * @param {string} projectDir
 * @returns {Promise<CheckResult>}
 */
export async function checkSessionState(projectDir) {
  const start = Date.now();
  const sessionPath = join(projectDir, '.chati', 'session.yaml');

  if (!existsSync(sessionPath)) {
    return { name: 'session-state', status: 'pass', message: 'No active session (expected for new projects)', duration: Date.now() - start };
  }

  const raw = readFileSync(sessionPath, 'utf-8');
  const requiredFields = ['project', 'language'];
  const missingFields = requiredFields.filter((f) => !raw.includes(`${f}:`));

  if (missingFields.length > 0) {
    return { name: 'session-state', status: 'warn', message: `Session missing fields: ${missingFields.join(', ')}`, duration: Date.now() - start };
  }

  return { name: 'session-state', status: 'pass', message: 'Session state valid', duration: Date.now() - start };
}

/**
 * Verify that hooks are functional.
 *
 * @param {string} projectDir
 * @returns {Promise<CheckResult>}
 */
export async function checkHooksHealth(projectDir) {
  const start = Date.now();
  const hooksDir = join(projectDir, 'chati.dev', 'hooks');

  if (!existsSync(hooksDir)) {
    return { name: 'hooks-health', status: 'fail', message: 'Hooks directory not found', duration: Date.now() - start };
  }

  const expectedHooks = ['prism-engine.js', 'model-governance.js', 'mode-governance.js', 'constitution-guard.js', 'read-protection.js', 'session-digest.js'];
  const missing = expectedHooks.filter((h) => !existsSync(join(hooksDir, h)));

  if (missing.length > 0) {
    return { name: 'hooks-health', status: 'fail', message: `Missing hooks: ${missing.join(', ')}`, duration: Date.now() - start };
  }

  return { name: 'hooks-health', status: 'pass', message: 'All 6 hooks present', duration: Date.now() - start };
}

/**
 * Verify system dependencies.
 *
 * @returns {Promise<CheckResult>}
 */
export async function checkDependencies() {
  const start = Date.now();
  const issues = [];

  const { execSync } = await import('child_process');

  // Check Node.js version
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    const major = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
    if (major < 20) {
      issues.push(`Node.js ${nodeVersion} < required v20`);
    }
  } catch {
    issues.push('Node.js not found');
  }

  // Check git
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch {
    issues.push('git not found');
  }

  if (issues.length > 0) {
    return { name: 'dependencies', status: 'fail', message: issues.join('; '), duration: Date.now() - start };
  }

  return { name: 'dependencies', status: 'pass', message: 'All dependencies satisfied', duration: Date.now() - start };
}

/**
 * Check git repository status.
 *
 * @param {string} projectDir
 * @returns {Promise<CheckResult>}
 */
export async function checkGitStatus(projectDir) {
  const start = Date.now();

  if (!existsSync(join(projectDir, '.git'))) {
    return { name: 'git-status', status: 'warn', message: 'Not a git repository', duration: Date.now() - start };
  }

  return { name: 'git-status', status: 'pass', message: 'Git repository detected', duration: Date.now() - start };
}

// ---------------------------------------------------------------------------
// Health Engine
// ---------------------------------------------------------------------------

/**
 * Run all health checks and produce a report.
 *
 * @param {string} projectDir - Project root directory
 * @returns {Promise<HealthReport>}
 */
export async function runHealthChecks(projectDir) {
  const checks = [
    checkCliAvailability(projectDir),
    checkFrameworkIntegrity(projectDir),
    checkSessionState(projectDir),
    checkHooksHealth(projectDir),
    checkDependencies(),
    checkGitStatus(projectDir),
  ];

  const results = await Promise.allSettled(checks);
  const checkResults = results.map((r) => {
    if (r.status === 'fulfilled') return r.value;
    return { name: 'unknown', status: 'fail', message: r.reason?.message || 'Check failed', duration: 0 };
  });

  const passed = checkResults.filter((c) => c.status === 'pass').length;
  const warned = checkResults.filter((c) => c.status === 'warn').length;
  const failed = checkResults.filter((c) => c.status === 'fail').length;
  const total = checkResults.length;
  const score = Math.round((passed / total) * 100);

  return {
    score,
    total,
    passed,
    warned,
    failed,
    checks: checkResults,
    timestamp: new Date().toISOString(),
  };
}
