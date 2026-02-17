/**
 * @fileoverview Gotchas auto-capture engine.
 *
 * Monitors agent execution for recurring error patterns.
 * When an error pattern appears 3+ times, it is automatically
 * captured as a gotcha and injected before related tasks.
 *
 * Constitution Article XIII — Memory Governance.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum occurrences before auto-capture triggers */
const AUTO_CAPTURE_THRESHOLD = 3;

/** Time window for counting occurrences (24 hours) */
const CAPTURE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Maximum age before a gotcha is archived (90 days) */
const ARCHIVE_AGE_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Error categories for classification.
 * @enum {string}
 */
const Category = {
  BUILD: 'build',
  TEST: 'test',
  LINT: 'lint',
  RUNTIME: 'runtime',
  INTEGRATION: 'integration',
  SECURITY: 'security',
};

/**
 * Severity levels.
 * @enum {string}
 */
const Severity = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

// ---------------------------------------------------------------------------
// Error Pattern Matching
// ---------------------------------------------------------------------------

/**
 * Known error pattern signatures for classification.
 * Each pattern has a regex, category, and severity.
 */
const ERROR_PATTERNS = [
  { regex: /Cannot find module/i, category: Category.BUILD, severity: Severity.WARNING },
  { regex: /SyntaxError/i, category: Category.BUILD, severity: Severity.CRITICAL },
  { regex: /TypeError/i, category: Category.RUNTIME, severity: Severity.WARNING },
  { regex: /ENOENT/i, category: Category.BUILD, severity: Severity.WARNING },
  { regex: /EACCES/i, category: Category.SECURITY, severity: Severity.CRITICAL },
  { regex: /test.*fail/i, category: Category.TEST, severity: Severity.WARNING },
  { regex: /lint.*error/i, category: Category.LINT, severity: Severity.INFO },
  { regex: /CORS/i, category: Category.INTEGRATION, severity: Severity.WARNING },
  { regex: /401|403|unauthorized/i, category: Category.SECURITY, severity: Severity.CRITICAL },
  { regex: /timeout|ETIMEDOUT/i, category: Category.INTEGRATION, severity: Severity.WARNING },
  { regex: /out of memory|heap/i, category: Category.RUNTIME, severity: Severity.CRITICAL },
  { regex: /deprecated/i, category: Category.BUILD, severity: Severity.INFO },
];

// ---------------------------------------------------------------------------
// Auto-Capture Engine
// ---------------------------------------------------------------------------

/**
 * Normalize an error message into a stable key for deduplication.
 *
 * @param {string} message - Raw error message
 * @returns {string} Normalized key
 */
export function normalizeErrorKey(message) {
  return message
    .replace(/['"][^'"]*['"]/g, '""')       // Replace string literals
    .replace(/\d+/g, 'N')                    // Replace numbers
    .replace(/\/[^\s]+/g, '/PATH')           // Replace file paths
    .replace(/\s+/g, ' ')                    // Normalize whitespace
    .trim()
    .slice(0, 200);                           // Limit length
}

/**
 * Classify an error message into category and severity.
 *
 * @param {string} message - Error message
 * @returns {{ category: string, severity: string }}
 */
export function classifyError(message) {
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.regex.test(message)) {
      return { category: pattern.category, severity: pattern.severity };
    }
  }
  return { category: Category.RUNTIME, severity: Severity.INFO };
}

/**
 * Load the error tracker state from disk.
 *
 * @param {string} projectDir - Project root
 * @returns {{ errors: Record<string, { count: number, firstSeen: string, lastSeen: string, message: string, category: string, severity: string }>, gotchas: string[] }}
 */
export function loadTrackerState(projectDir) {
  const trackerPath = join(projectDir, '.chati', 'error-tracker.json');
  if (!existsSync(trackerPath)) {
    return { errors: {}, gotchas: [] };
  }
  try {
    return JSON.parse(readFileSync(trackerPath, 'utf-8'));
  } catch {
    return { errors: {}, gotchas: [] };
  }
}

/**
 * Save the error tracker state to disk.
 *
 * @param {string} projectDir - Project root
 * @param {object} state - Tracker state
 */
export function saveTrackerState(projectDir, state) {
  const trackerPath = join(projectDir, '.chati', 'error-tracker.json');
  mkdirSync(dirname(trackerPath), { recursive: true });
  writeFileSync(trackerPath, JSON.stringify(state, null, 2));
}

/**
 * Track an error occurrence. If threshold is met, auto-create a gotcha.
 *
 * @param {string} projectDir - Project root
 * @param {string} errorMessage - Raw error message
 * @param {string} [agent] - Agent that encountered the error
 * @returns {{ captured: boolean, gotcha: object|null }}
 */
export function trackError(projectDir, errorMessage, agent) {
  const state = loadTrackerState(projectDir);
  const key = normalizeErrorKey(errorMessage);
  const { category, severity } = classifyError(errorMessage);
  const now = new Date().toISOString();

  // Initialize or update error entry
  if (!state.errors[key]) {
    state.errors[key] = {
      count: 0,
      firstSeen: now,
      lastSeen: now,
      message: errorMessage.slice(0, 500),
      category,
      severity,
    };
  }

  const entry = state.errors[key];

  // Only count within the capture window
  const lastSeen = new Date(entry.lastSeen).getTime();
  if (Date.now() - lastSeen > CAPTURE_WINDOW_MS) {
    entry.count = 0; // Reset if outside window
  }

  entry.count += 1;
  entry.lastSeen = now;

  // Check if threshold is met and gotcha not already created
  let gotcha = null;
  let captured = false;

  if (entry.count >= AUTO_CAPTURE_THRESHOLD && !state.gotchas.includes(key)) {
    gotcha = {
      id: `G-AUTO-${Date.now()}`,
      pattern: key,
      description: entry.message,
      category: entry.category,
      severity: entry.severity,
      discovered_by: agent || 'auto-capture',
      discovered_at: now,
      occurrence_count: entry.count,
      auto_captured: true,
    };

    state.gotchas.push(key);
    captured = true;

    // Append to gotchas runtime file
    const gotchasPath = join(projectDir, '.chati', 'gotchas.json');
    let gotchasList = [];
    if (existsSync(gotchasPath)) {
      try {
        gotchasList = JSON.parse(readFileSync(gotchasPath, 'utf-8'));
      } catch { /* ignore */ }
    }
    gotchasList.push(gotcha);
    writeFileSync(gotchasPath, JSON.stringify(gotchasList, null, 2));
  }

  saveTrackerState(projectDir, state);
  return { captured, gotcha };
}

/**
 * Prune old errors outside the capture window and archive old gotchas.
 *
 * @param {string} projectDir - Project root
 * @returns {{ pruned: number, archived: number }}
 */
export function pruneTracker(projectDir) {
  const state = loadTrackerState(projectDir);
  const now = Date.now();
  let pruned = 0;
  let archived = 0;

  // Prune old error entries
  for (const [key, entry] of Object.entries(state.errors)) {
    const lastSeen = new Date(entry.lastSeen).getTime();
    if (now - lastSeen > CAPTURE_WINDOW_MS) {
      delete state.errors[key];
      pruned++;
    }
  }

  // Archive old gotchas
  const gotchasPath = join(projectDir, '.chati', 'gotchas.json');
  if (existsSync(gotchasPath)) {
    try {
      const gotchasList = JSON.parse(readFileSync(gotchasPath, 'utf-8'));
      const active = gotchasList.filter((g) => {
        const age = now - new Date(g.discovered_at).getTime();
        if (age > ARCHIVE_AGE_MS) {
          archived++;
          return false;
        }
        return true;
      });
      writeFileSync(gotchasPath, JSON.stringify(active, null, 2));
    } catch { /* ignore */ }
  }

  saveTrackerState(projectDir, state);
  return { pruned, archived };
}

export { AUTO_CAPTURE_THRESHOLD, CAPTURE_WINDOW_MS, ARCHIVE_AGE_MS, Category, Severity, ERROR_PATTERNS };
