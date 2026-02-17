/**
 * @fileoverview Wave analyzer for task parallelization.
 *
 * Analyzes task dependencies to group them into waves —
 * sets of tasks that can execute in parallel because they
 * have no inter-dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {object} TaskNode
 * @property {string} id - Task identifier
 * @property {string[]} dependencies - IDs of tasks this depends on
 * @property {string[]} [writeScope] - Files/dirs this task writes to
 */

/**
 * @typedef {object} Wave
 * @property {number} index - Wave number (0-based)
 * @property {string[]} taskIds - Task IDs in this wave
 */

// ---------------------------------------------------------------------------
// Wave Analysis
// ---------------------------------------------------------------------------

/**
 * Build a dependency graph and compute waves using topological sorting.
 *
 * @param {TaskNode[]} tasks - Array of tasks with dependencies
 * @returns {Wave[]}
 * @throws {Error} When circular dependencies are detected
 */
export function analyzeWaves(tasks) {
  if (!tasks || tasks.length === 0) return [];

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const inDegree = new Map();
  const adjList = new Map();

  // Initialize
  for (const task of tasks) {
    inDegree.set(task.id, 0);
    adjList.set(task.id, []);
  }

  // Build adjacency and in-degree
  for (const task of tasks) {
    for (const dep of task.dependencies || []) {
      if (taskMap.has(dep)) {
        adjList.get(dep).push(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
      }
    }
  }

  // Kahn's algorithm with wave grouping
  const waves = [];
  const remaining = new Set(tasks.map((t) => t.id));

  while (remaining.size > 0) {
    // Find all tasks with no pending dependencies (in-degree 0)
    const wave = [];
    for (const id of remaining) {
      if ((inDegree.get(id) || 0) === 0) {
        wave.push(id);
      }
    }

    if (wave.length === 0) {
      const circular = [...remaining].join(', ');
      throw new Error(`Circular dependency detected among tasks: ${circular}`);
    }

    waves.push({ index: waves.length, taskIds: wave });

    // Remove wave tasks and update in-degrees
    for (const id of wave) {
      remaining.delete(id);
      for (const dependent of adjList.get(id) || []) {
        inDegree.set(dependent, (inDegree.get(dependent) || 0) - 1);
      }
    }
  }

  return waves;
}

/**
 * Validate that tasks within a wave don't have write scope conflicts.
 *
 * @param {TaskNode[]} tasks - All tasks
 * @param {Wave} wave - Wave to validate
 * @returns {{ valid: boolean, conflicts: { taskA: string, taskB: string, path: string }[] }}
 */
export function validateWaveScopes(tasks, wave) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const conflicts = [];

  const waveTasks = wave.taskIds.map((id) => taskMap.get(id)).filter(Boolean);

  for (let i = 0; i < waveTasks.length; i++) {
    for (let j = i + 1; j < waveTasks.length; j++) {
      const scopeA = waveTasks[i].writeScope || [];
      const scopeB = waveTasks[j].writeScope || [];

      for (const pathA of scopeA) {
        for (const pathB of scopeB) {
          if (pathA === pathB || pathA.startsWith(pathB + '/') || pathB.startsWith(pathA + '/')) {
            conflicts.push({
              taskA: waveTasks[i].id,
              taskB: waveTasks[j].id,
              path: pathA,
            });
          }
        }
      }
    }
  }

  return { valid: conflicts.length === 0, conflicts };
}

/**
 * Get a summary of the wave analysis.
 *
 * @param {Wave[]} waves
 * @returns {{ totalWaves: number, totalTasks: number, maxParallel: number, sequential: boolean }}
 */
export function getWaveSummary(waves) {
  const totalTasks = waves.reduce((sum, w) => sum + w.taskIds.length, 0);
  const maxParallel = Math.max(...waves.map((w) => w.taskIds.length), 0);

  return {
    totalWaves: waves.length,
    totalTasks,
    maxParallel,
    sequential: waves.every((w) => w.taskIds.length === 1),
  };
}
