/**
 * Task Executor — Executes a task definition with PRISM context injection.
 *
 * The executor prepares the full execution context for an agent by:
 * 1. Loading the task definition
 * 2. Injecting PRISM context layers
 * 3. Building the instruction payload
 * 4. Validating criteria post-execution (for autonomous mode)
 */

/**
 * Build the execution payload for a task.
 *
 * This produces the complete context that gets injected into
 * the agent's prompt when executing a task.
 *
 * @param {object} task - Task definition from loader
 * @param {object} options
 * @param {object} [options.prismContext] - PRISM context output (xml, bracket, layers)
 * @param {object} [options.handoff] - Handoff data from previous agent
 * @param {object} [options.sessionState] - Current session state
 * @param {string} [options.mode] - Execution mode ('human-in-the-loop' | 'autonomous')
 * @returns {{ payload: object, warnings: string[] }}
 */
export function buildExecutionPayload(task, options = {}) {
  const warnings = [];

  if (!task) {
    return { payload: null, warnings: ['No task provided to executor.'] };
  }

  const mode = options.mode || 'human-in-the-loop';
  const isAutonomous = mode === 'autonomous';

  // Warn if task requires input but we're in autonomous mode
  if (task.requires_input && isAutonomous) {
    warnings.push(
      `Task '${task.id}' requires user input but running in autonomous mode. ` +
      'Gate will pause for input.'
    );
  }

  // Warn if task doesn't support autonomous gate but mode is autonomous
  if (isAutonomous && !task.autonomous_gate) {
    warnings.push(
      `Task '${task.id}' does not have autonomous_gate enabled. ` +
      'Human validation will be required.'
    );
  }

  const payload = {
    task: {
      id: task.id,
      agent: task.agent,
      phase: task.phase,
      instructions: task.instructions,
      criteria: task.criteria,
      outputs: task.outputs,
      handoff_to: task.handoff_to,
    },
    context: {
      prism: options.prismContext || null,
      handoff: options.handoff || null,
      session: sanitizeSessionState(options.sessionState),
    },
    execution: {
      mode,
      autonomous_gate: task.autonomous_gate,
      requires_input: task.requires_input,
      parallelizable: task.parallelizable,
    },
  };

  return { payload, warnings };
}

/**
 * Validate task execution results against criteria.
 *
 * Each criterion is a string describing what must be true.
 * The validator returns a structured result for the orchestrator
 * to decide whether to proceed or require intervention.
 *
 * @param {object} task - Task definition
 * @param {object} results - Execution results to validate
 * @param {string[]} [results.completedCriteria] - Criteria marked as met
 * @param {string[]} [results.outputs] - Produced output files
 * @param {number} [results.confidence] - Self-reported confidence (0-100)
 * @returns {{ valid: boolean, score: number, unmet: string[], details: string }}
 */
export function validateResults(task, results = {}) {
  if (!task || !task.criteria || task.criteria.length === 0) {
    return { valid: true, score: 100, unmet: [], details: 'No criteria defined.' };
  }

  const completed = new Set(results.completedCriteria || []);
  const unmet = [];

  for (const criterion of task.criteria) {
    if (!completed.has(criterion)) {
      unmet.push(criterion);
    }
  }

  const score = Math.round(((task.criteria.length - unmet.length) / task.criteria.length) * 100);

  // Check outputs
  const expectedOutputs = task.outputs || [];
  const producedOutputs = results.outputs || [];
  const missingOutputs = expectedOutputs.filter(o => !producedOutputs.includes(o));

  if (missingOutputs.length > 0) {
    unmet.push(`Missing outputs: ${missingOutputs.join(', ')}`);
  }

  // Confidence check for autonomous mode
  const confidence = results.confidence ?? 100;
  const confidenceMet = confidence >= 90;

  const valid = unmet.length === 0 && confidenceMet;

  let details;
  if (valid) {
    details = `All ${task.criteria.length} criteria met. Confidence: ${confidence}%.`;
  } else {
    const parts = [];
    if (unmet.length > 0) parts.push(`${unmet.length} unmet criteria`);
    if (!confidenceMet) parts.push(`Low confidence: ${confidence}%`);
    details = parts.join('. ');
  }

  return { valid, score, unmet, details };
}

/**
 * Determine the post-execution action based on validation results.
 *
 * @param {object} validation - Result from validateResults
 * @param {string} mode - 'autonomous' | 'human-in-the-loop'
 * @param {object} task - Task definition
 * @returns {{ action: string, reason: string }}
 *   action: 'proceed' | 'retry' | 'escalate' | 'gate'
 */
export function determinePostAction(validation, mode, task) {
  // Human-in-the-loop always gates
  if (mode !== 'autonomous') {
    return {
      action: 'gate',
      reason: 'Human-in-the-loop mode requires user approval.',
    };
  }

  // Autonomous mode with autonomous gate
  if (validation.valid) {
    return {
      action: 'proceed',
      reason: `All criteria met (score: ${validation.score}%). Proceeding to ${task.handoff_to || 'next'}.`,
    };
  }

  // Partial pass — try to determine severity
  if (validation.score >= 90) {
    return {
      action: 'gate',
      reason: `Score ${validation.score}% is close but below threshold. Human review recommended.`,
    };
  }

  if (validation.score >= 50) {
    return {
      action: 'retry',
      reason: `Score ${validation.score}%. ${validation.unmet.length} criteria unmet. Retry with focused attention.`,
    };
  }

  return {
    action: 'escalate',
    reason: `Score ${validation.score}%. Major gaps detected. Escalating to orchestrator.`,
  };
}

/**
 * Sanitize session state to remove sensitive or oversized data.
 */
function sanitizeSessionState(state) {
  if (!state) return null;

  return {
    mode: state.mode || 'discover',
    current_agent: state.current_agent || null,
    pipeline_position: state.pipeline_position || null,
    completed_agents: state.completed_agents || [],
    phase: state.phase || null,
  };
}
