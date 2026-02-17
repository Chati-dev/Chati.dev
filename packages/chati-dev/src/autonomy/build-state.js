/**
 * @fileoverview Build state manager with checkpoint-based persistence.
 *
 * Manages the state of autonomous build execution, including
 * checkpoints saved after each task completion, abandoned build
 * detection, and attempt logging.
 *
 * Constitution Article XVII — Execution Mode Governance.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum iterations per individual task before giving up */
export const MAX_ITERATIONS_PER_TASK = 10;

/** Global timeout for an autonomous build session (30 minutes) */
export const GLOBAL_TIMEOUT_MS = 30 * 60 * 1000;

/** Time after which a build is considered abandoned (1 hour) */
export const ABANDONED_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * Build status enum.
 * @enum {string}
 */
export const BuildStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  ABANDONED: 'abandoned',
  FAILED: 'failed',
  COMPLETED: 'completed',
};

/**
 * Task checkpoint status.
 * @enum {string}
 */
export const CheckpointStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
};

// ---------------------------------------------------------------------------
// State Schema
// ---------------------------------------------------------------------------

/**
 * @typedef {object} TaskCheckpoint
 * @property {string} taskId
 * @property {string} status - CheckpointStatus
 * @property {number} attempts - Number of execution attempts
 * @property {string|null} lastAttempt - ISO timestamp of last attempt
 * @property {string|null} output - Last output summary
 * @property {string|null} error - Last error message (if failed)
 */

/**
 * @typedef {object} BuildState
 * @property {string} sessionId - Build session identifier
 * @property {string} status - BuildStatus
 * @property {TaskCheckpoint[]} checkpoints - Per-task checkpoints
 * @property {string} startedAt - ISO timestamp
 * @property {string|null} lastCheckpoint - ISO timestamp of last checkpoint
 * @property {string|null} completedAt - ISO timestamp of completion
 * @property {number} totalAttempts - Total execution attempts across all tasks
 */

const BUILD_STATE_FILE = '.chati/build-state.json';

// ---------------------------------------------------------------------------
// State Management
// ---------------------------------------------------------------------------

/**
 * Initialize a new build state.
 *
 * @param {string[]} taskIds - Array of task IDs to execute
 * @returns {BuildState}
 */
export function createBuildState(taskIds) {
  return {
    sessionId: `build-${Date.now()}`,
    status: BuildStatus.PENDING,
    checkpoints: taskIds.map((taskId) => ({
      taskId,
      status: CheckpointStatus.PENDING,
      attempts: 0,
      lastAttempt: null,
      output: null,
      error: null,
    })),
    startedAt: new Date().toISOString(),
    lastCheckpoint: null,
    completedAt: null,
    totalAttempts: 0,
  };
}

/**
 * Load build state from disk.
 *
 * @param {string} projectDir
 * @returns {BuildState|null}
 */
export function loadBuildState(projectDir) {
  const statePath = join(projectDir, BUILD_STATE_FILE);
  if (!existsSync(statePath)) return null;
  try {
    const state = JSON.parse(readFileSync(statePath, 'utf-8'));

    // Check for abandoned builds
    if (state.status === BuildStatus.IN_PROGRESS && state.lastCheckpoint) {
      const elapsed = Date.now() - new Date(state.lastCheckpoint).getTime();
      if (elapsed > ABANDONED_THRESHOLD_MS) {
        state.status = BuildStatus.ABANDONED;
      }
    }

    return state;
  } catch {
    return null;
  }
}

/**
 * Save build state to disk.
 *
 * @param {string} projectDir
 * @param {BuildState} state
 */
export function saveBuildState(projectDir, state) {
  const statePath = join(projectDir, BUILD_STATE_FILE);
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * Update a task checkpoint.
 *
 * @param {BuildState} state
 * @param {string} taskId
 * @param {Partial<TaskCheckpoint>} update
 * @returns {BuildState}
 */
export function updateCheckpoint(state, taskId, update) {
  const checkpoint = state.checkpoints.find((c) => c.taskId === taskId);
  if (!checkpoint) {
    throw new Error(`Task "${taskId}" not found in build state`);
  }

  Object.assign(checkpoint, update);
  state.lastCheckpoint = new Date().toISOString();

  if (update.attempts !== undefined) {
    state.totalAttempts = state.checkpoints.reduce((sum, c) => sum + c.attempts, 0);
  }

  return state;
}

/**
 * Mark the build as started.
 *
 * @param {BuildState} state
 * @returns {BuildState}
 */
export function startBuild(state) {
  state.status = BuildStatus.IN_PROGRESS;
  state.startedAt = new Date().toISOString();
  return state;
}

/**
 * Mark the build as completed.
 *
 * @param {BuildState} state
 * @returns {BuildState}
 */
export function completeBuild(state) {
  state.status = BuildStatus.COMPLETED;
  state.completedAt = new Date().toISOString();
  return state;
}

/**
 * Mark the build as failed.
 *
 * @param {BuildState} state
 * @param {string} [reason]
 * @returns {BuildState}
 */
export function failBuild(state, _reason) {
  state.status = BuildStatus.FAILED;
  state.completedAt = new Date().toISOString();
  return state;
}

/**
 * Get the next pending task checkpoint.
 *
 * @param {BuildState} state
 * @returns {TaskCheckpoint|null}
 */
export function getNextPendingTask(state) {
  return state.checkpoints.find(
    (c) => c.status === CheckpointStatus.PENDING || c.status === CheckpointStatus.IN_PROGRESS,
  ) || null;
}

/**
 * Check if a task has exceeded max iterations.
 *
 * @param {TaskCheckpoint} checkpoint
 * @returns {boolean}
 */
export function isTaskExhausted(checkpoint) {
  return checkpoint.attempts >= MAX_ITERATIONS_PER_TASK;
}

/**
 * Check if the global timeout has been exceeded.
 *
 * @param {BuildState} state
 * @returns {boolean}
 */
export function isTimedOut(state) {
  const elapsed = Date.now() - new Date(state.startedAt).getTime();
  return elapsed > GLOBAL_TIMEOUT_MS;
}

/**
 * Get build progress summary.
 *
 * @param {BuildState} state
 * @returns {{ total: number, completed: number, failed: number, pending: number, progress: number }}
 */
export function getProgress(state) {
  const total = state.checkpoints.length;
  const completed = state.checkpoints.filter((c) => c.status === CheckpointStatus.COMPLETED).length;
  const failed = state.checkpoints.filter((c) => c.status === CheckpointStatus.FAILED).length;
  const pending = state.checkpoints.filter(
    (c) => c.status === CheckpointStatus.PENDING || c.status === CheckpointStatus.IN_PROGRESS,
  ).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, failed, pending, progress };
}

/**
 * Clear build state (after completion or manual reset).
 *
 * @param {string} projectDir
 */
export function clearBuildState(projectDir) {
  const statePath = join(projectDir, BUILD_STATE_FILE);
  if (existsSync(statePath)) {
    const { unlinkSync } = require('fs');
    unlinkSync(statePath);
  }
}
