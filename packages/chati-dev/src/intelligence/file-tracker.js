/**
 * @fileoverview File evolution tracker.
 *
 * Records file modifications by agent for rollback detection,
 * conflict prevention in parallel execution, and audit trail.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * @typedef {object} FileEvent
 * @property {string} file - Relative file path
 * @property {string} agent - Agent that modified the file
 * @property {'create'|'modify'|'delete'} action - Type of modification
 * @property {string} timestamp - ISO timestamp
 * @property {string} [provider] - CLI provider used
 */

const TRACKER_FILE = '.chati/file-evolution.json';

/**
 * Load file evolution history.
 *
 * @param {string} projectDir
 * @returns {FileEvent[]}
 */
export function loadHistory(projectDir) {
  const trackerPath = join(projectDir, TRACKER_FILE);
  if (!existsSync(trackerPath)) return [];
  try {
    return JSON.parse(readFileSync(trackerPath, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Record a file modification event.
 *
 * @param {string} projectDir
 * @param {Omit<FileEvent, 'timestamp'>} event
 * @returns {FileEvent}
 */
export function recordEvent(projectDir, event) {
  const history = loadHistory(projectDir);
  const entry = { ...event, timestamp: new Date().toISOString() };
  history.push(entry);

  const trackerPath = join(projectDir, TRACKER_FILE);
  mkdirSync(dirname(trackerPath), { recursive: true });
  writeFileSync(trackerPath, JSON.stringify(history, null, 2));

  return entry;
}

/**
 * Get files modified by a specific agent.
 *
 * @param {string} projectDir
 * @param {string} agent
 * @returns {FileEvent[]}
 */
export function getAgentFiles(projectDir, agent) {
  return loadHistory(projectDir).filter((e) => e.agent === agent);
}

/**
 * Detect potential conflicts between parallel agents.
 * Returns files that were modified by multiple agents.
 *
 * @param {string} projectDir
 * @param {string[]} agents - Active parallel agents
 * @returns {{ file: string, agents: string[] }[]}
 */
export function detectConflicts(projectDir, agents) {
  const history = loadHistory(projectDir);
  const fileAgentMap = new Map();

  for (const event of history) {
    if (agents.includes(event.agent)) {
      if (!fileAgentMap.has(event.file)) {
        fileAgentMap.set(event.file, new Set());
      }
      fileAgentMap.get(event.file).add(event.agent);
    }
  }

  const conflicts = [];
  for (const [file, agentSet] of fileAgentMap) {
    if (agentSet.size > 1) {
      conflicts.push({ file, agents: [...agentSet] });
    }
  }

  return conflicts;
}

/**
 * Prune history older than specified days.
 *
 * @param {string} projectDir
 * @param {number} [days=30]
 * @returns {number} Number of entries pruned
 */
export function pruneHistory(projectDir, days = 30) {
  const history = loadHistory(projectDir);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = history.filter((e) => new Date(e.timestamp).getTime() > cutoff);
  const pruned = history.length - filtered.length;

  const trackerPath = join(projectDir, TRACKER_FILE);
  mkdirSync(dirname(trackerPath), { recursive: true });
  writeFileSync(trackerPath, JSON.stringify(filtered, null, 2));

  return pruned;
}
