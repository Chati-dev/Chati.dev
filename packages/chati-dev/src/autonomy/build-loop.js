/**
 * @fileoverview Autonomous build loop (Ralph Wiggum v2).
 *
 * Executes tasks autonomously with checkpoint-based state management,
 * retry logic, and quality gate integration.
 *
 * Named "Ralph Wiggum" internally — the autonomous execution mode
 * that iterates until all tasks are complete or escalation is needed.
 *
 * Constitution Article XVII — Execution Mode Governance.
 */

import {
  createBuildState,
  loadBuildState,
  saveBuildState,
  startBuild,
  completeBuild,
  failBuild,
  updateCheckpoint,
  getNextPendingTask,
  isTaskExhausted,
  isTimedOut,
  getProgress,
  CheckpointStatus,
  BuildStatus,
} from './build-state.js';

// ---------------------------------------------------------------------------
// Build Loop
// ---------------------------------------------------------------------------

/**
 * @typedef {object} BuildLoopConfig
 * @property {string} projectDir - Project root directory
 * @property {string[]} taskIds - Task IDs to execute
 * @property {function(string): Promise<{success: boolean, output: string}>} executor - Task execution function
 * @property {function(object): void} [onProgress] - Progress callback
 * @property {boolean} [resume=false] - Whether to resume from existing state
 */

/**
 * @typedef {object} BuildLoopResult
 * @property {string} status - Final build status
 * @property {number} completed - Tasks completed
 * @property {number} failed - Tasks failed
 * @property {number} totalAttempts - Total execution attempts
 * @property {string} duration - Human-readable duration
 */

/**
 * Run the autonomous build loop.
 *
 * Loop logic:
 * 1. Load or create build state
 * 2. Get next pending task
 * 3. Execute task
 * 4. Save checkpoint
 * 5. If task failed and not exhausted, retry
 * 6. If task exhausted, mark as failed and continue
 * 7. Repeat until all tasks complete or global timeout
 *
 * @param {BuildLoopConfig} config
 * @returns {Promise<BuildLoopResult>}
 */
export async function runBuildLoop(config) {
  const { projectDir, taskIds, executor, onProgress, resume = false } = config;

  // Load or create state
  let state = resume ? loadBuildState(projectDir) : null;

  if (!state || state.status === BuildStatus.COMPLETED || state.status === BuildStatus.ABANDONED) {
    state = createBuildState(taskIds);
  }

  state = startBuild(state);
  saveBuildState(projectDir, state);

  const startTime = Date.now();

  // Main loop
  while (true) {
    // Check global timeout
    if (isTimedOut(state)) {
      state = failBuild(state, 'Global timeout exceeded');
      saveBuildState(projectDir, state);
      break;
    }

    // Get next task
    const checkpoint = getNextPendingTask(state);
    if (!checkpoint) {
      // All tasks processed
      const hasFailures = state.checkpoints.some((c) => c.status === CheckpointStatus.FAILED);
      if (hasFailures) {
        state = failBuild(state, 'Some tasks failed');
      } else {
        state = completeBuild(state);
      }
      saveBuildState(projectDir, state);
      break;
    }

    // Check if task is exhausted
    if (isTaskExhausted(checkpoint)) {
      state = updateCheckpoint(state, checkpoint.taskId, {
        status: CheckpointStatus.FAILED,
        error: `Exceeded max iterations (${checkpoint.attempts})`,
      });
      saveBuildState(projectDir, state);

      if (onProgress) {
        onProgress({ type: 'task_exhausted', taskId: checkpoint.taskId, attempts: checkpoint.attempts });
      }
      continue;
    }

    // Mark task as in progress
    state = updateCheckpoint(state, checkpoint.taskId, {
      status: CheckpointStatus.IN_PROGRESS,
      attempts: checkpoint.attempts + 1,
      lastAttempt: new Date().toISOString(),
    });
    saveBuildState(projectDir, state);

    if (onProgress) {
      const progress = getProgress(state);
      onProgress({ type: 'task_started', taskId: checkpoint.taskId, attempt: checkpoint.attempts + 1, progress });
    }

    // Execute task
    try {
      const result = await executor(checkpoint.taskId);

      if (result.success) {
        state = updateCheckpoint(state, checkpoint.taskId, {
          status: CheckpointStatus.COMPLETED,
          output: result.output?.slice(0, 1000) || 'Completed',
          error: null,
        });

        if (onProgress) {
          onProgress({ type: 'task_completed', taskId: checkpoint.taskId });
        }
      } else {
        state = updateCheckpoint(state, checkpoint.taskId, {
          status: CheckpointStatus.IN_PROGRESS, // Will retry
          error: result.output?.slice(0, 500) || 'Task failed',
        });

        if (onProgress) {
          onProgress({ type: 'task_failed', taskId: checkpoint.taskId, attempt: checkpoint.attempts + 1, error: result.output });
        }
      }
    } catch (err) {
      state = updateCheckpoint(state, checkpoint.taskId, {
        status: CheckpointStatus.IN_PROGRESS, // Will retry
        error: err.message?.slice(0, 500) || 'Execution error',
      });
    }

    saveBuildState(projectDir, state);
  }

  const duration = Date.now() - startTime;
  const progress = getProgress(state);

  return {
    status: state.status,
    completed: progress.completed,
    failed: progress.failed,
    totalAttempts: state.totalAttempts,
    duration: `${Math.round(duration / 1000)}s`,
  };
}

/**
 * Get current build loop status without executing.
 *
 * @param {string} projectDir
 * @returns {object|null}
 */
export function getBuildStatus(projectDir) {
  const state = loadBuildState(projectDir);
  if (!state) return null;

  return {
    sessionId: state.sessionId,
    status: state.status,
    progress: getProgress(state),
    startedAt: state.startedAt,
    lastCheckpoint: state.lastCheckpoint,
  };
}
