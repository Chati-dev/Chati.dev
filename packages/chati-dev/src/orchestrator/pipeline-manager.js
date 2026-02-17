/**
 * @fileoverview Pipeline lifecycle management.
 * Manages the complete pipeline state and transitions.
 */

import { AGENT_PIPELINE, getNextAgent } from './agent-selector.js';

/**
 * Pipeline phases in order.
 */
export const PIPELINE_PHASES = ['discover', 'plan', 'build', 'deploy'];

/**
 * Agent status values.
 */
export const AGENT_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
  NEEDS_REVALIDATION: 'needs_revalidation',
  FAILED: 'failed',
};

/**
 * Required QA score for phase transitions.
 */
const QA_PLANNING_THRESHOLD = 95;
const QA_IMPLEMENTATION_THRESHOLD = 95;

/**
 * Initialize a new pipeline for a project.
 *
 * @param {object} options - { isGreenfield, mode }
 * @returns {object} Pipeline state
 */
export function initPipeline(options = {}) {
  const { isGreenfield = true, mode = 'discover' } = options;

  const agents = {};
  for (const agentDef of AGENT_PIPELINE) {
    // Skip the WU agent that doesn't apply
    if (agentDef.group === 'wu') {
      const shouldInclude = isGreenfield
        ? agentDef.name === 'greenfield-wu'
        : agentDef.name === 'brownfield-wu';
      if (!shouldInclude) {
        continue;
      }
    }

    agents[agentDef.name] = {
      status: AGENT_STATUS.PENDING,
      score: null,
      startedAt: null,
      completedAt: null,
    };
  }

  return {
    phase: mode,
    isGreenfield,
    startedAt: new Date().toISOString(),
    completedAt: null,
    agents,
    completedAgents: [],
    currentAgent: null,
    modeTransitions: [],
    history: [],
  };
}

/**
 * Advance the pipeline after an agent completes.
 *
 * @param {object} pipelineState - Current state
 * @param {string} completedAgent - Agent that just finished
 * @param {object} [results] - Agent results (score, outputs)
 * @returns {{ state: object, nextAction: string, nextAgent: string|null, needsModeSwitch: boolean }}
 */
export function advancePipeline(pipelineState, completedAgent, results = {}) {
  const newState = { ...pipelineState };

  // Update completed agent status
  if (!newState.agents[completedAgent]) {
    throw new Error(`Unknown agent: ${completedAgent}`);
  }

  newState.agents[completedAgent] = {
    ...newState.agents[completedAgent],
    status: AGENT_STATUS.COMPLETED,
    score: results.score || null,
    completedAt: new Date().toISOString(),
  };

  // Add to completed list if not already there
  if (!newState.completedAgents.includes(completedAgent)) {
    newState.completedAgents.push(completedAgent);
  }

  // Add to history
  newState.history.push({
    agent: completedAgent,
    action: 'completed',
    timestamp: new Date().toISOString(),
    score: results.score || null,
  });

  // Special handling for QA agents - check if they meet thresholds
  const isQAAgent = completedAgent === 'qa-planning' || completedAgent === 'qa-implementation';
  if (isQAAgent) {
    const transitionCheck = checkPhaseTransition(newState);

    if (transitionCheck.canAdvance) {
      // User Preview gate: when QA-Implementation passes in build phase,
      // don't advance to deploy yet — let user preview first.
      if (completedAgent === 'qa-implementation' && newState.phase === 'build') {
        return {
          state: newState,
          nextAction: 'user_preview',
          nextAgent: null,
          needsModeSwitch: false,
          previewContext: {
            qaScore: newState.agents['qa-implementation'].score,
          },
        };
      }

      // QA passed - advance to next phase
      const currentPhaseIndex = PIPELINE_PHASES.indexOf(newState.phase);
      if (currentPhaseIndex < PIPELINE_PHASES.length - 1) {
        const nextPhase = PIPELINE_PHASES[currentPhaseIndex + 1];

        newState.modeTransitions.push({
          from: newState.phase,
          to: nextPhase,
          trigger: 'autonomous',
          timestamp: new Date().toISOString(),
          reason: transitionCheck.reason,
        });

        newState.phase = nextPhase;

        return {
          state: newState,
          nextAction: 'advance_phase',
          nextAgent: getFirstAgentInPhase(newState, nextPhase),
          needsModeSwitch: true,
        };
      }

      // Pipeline complete
      newState.completedAt = new Date().toISOString();
      return {
        state: newState,
        nextAction: 'complete',
        nextAgent: null,
        needsModeSwitch: false,
      };
    } else {
      // QA failed - wait for issues to be fixed
      return {
        state: newState,
        nextAction: 'wait',
        nextAgent: null,
        needsModeSwitch: false,
      };
    }
  }

  // Check if phase transition is possible for non-QA agents
  const transitionCheck = checkPhaseTransition(newState);

  if (transitionCheck.canAdvance) {
    // Advance to next phase
    const currentPhaseIndex = PIPELINE_PHASES.indexOf(newState.phase);
    if (currentPhaseIndex < PIPELINE_PHASES.length - 1) {
      const nextPhase = PIPELINE_PHASES[currentPhaseIndex + 1];

      newState.modeTransitions.push({
        from: newState.phase,
        to: nextPhase,
        trigger: 'autonomous',
        timestamp: new Date().toISOString(),
        reason: transitionCheck.reason,
      });

      newState.phase = nextPhase;

      return {
        state: newState,
        nextAction: 'advance_phase',
        nextAgent: getFirstAgentInPhase(newState, nextPhase),
        needsModeSwitch: true,
      };
    }

    // Pipeline complete
    newState.completedAt = new Date().toISOString();
    return {
      state: newState,
      nextAction: 'complete',
      nextAgent: null,
      needsModeSwitch: false,
    };
  }

  // Continue in current phase
  const nextInfo = getNextAgent(completedAgent, newState.completedAgents);

  if (nextInfo.next) {
    newState.currentAgent = nextInfo.next;
    if (newState.agents[nextInfo.next]) {
      newState.agents[nextInfo.next].status = AGENT_STATUS.IN_PROGRESS;
      newState.agents[nextInfo.next].startedAt = new Date().toISOString();
    }

    return {
      state: newState,
      nextAction: 'continue',
      nextAgent: nextInfo.next,
      needsModeSwitch: false,
    };
  }

  // No next agent but can't advance phase - stuck
  return {
    state: newState,
    nextAction: 'wait',
    nextAgent: null,
    needsModeSwitch: false,
  };
}

/**
 * Get first agent in a phase.
 *
 * @param {object} state - Pipeline state
 * @param {string} phase - Target phase
 * @returns {string|null}
 */
function getFirstAgentInPhase(state, phase) {
  for (const agentDef of AGENT_PIPELINE) {
    if (agentDef.phase !== phase) {
      continue;
    }

    // Skip WU fork that doesn't apply
    if (agentDef.group === 'wu') {
      const targetAgent = state.isGreenfield ? 'greenfield-wu' : 'brownfield-wu';
      if (agentDef.name !== targetAgent) {
        continue;
      }
    }

    if (state.agents[agentDef.name]) {
      return agentDef.name;
    }
  }

  return null;
}

/**
 * Check if pipeline can transition to next phase.
 *
 * @param {object} pipelineState
 * @returns {{ canAdvance: boolean, reason: string, requiredScore: number|null }}
 */
export function checkPhaseTransition(pipelineState) {
  const { phase, agents } = pipelineState;

  // Check based on current phase
  if (phase === 'discover') {
    // DISCOVER -> PLAN transition: all discover agents must be completed
    // (brief must be done to advance to plan)
    return {
      canAdvance: true,
      reason: 'Discover phase agents completed',
      requiredScore: null,
    };
  }

  if (phase === 'plan') {
    // Need QA-Planning to be completed with score >= 95
    const qaPlanning = agents['qa-planning'];
    if (!qaPlanning) {
      return {
        canAdvance: false,
        reason: 'QA-Planning agent not in pipeline',
        requiredScore: null,
      };
    }

    if (qaPlanning.status !== AGENT_STATUS.COMPLETED) {
      return {
        canAdvance: false,
        reason: 'QA-Planning not yet completed',
        requiredScore: QA_PLANNING_THRESHOLD,
      };
    }

    if (qaPlanning.score === null || qaPlanning.score < QA_PLANNING_THRESHOLD) {
      return {
        canAdvance: false,
        reason: `QA-Planning score ${qaPlanning.score || 0} below threshold ${QA_PLANNING_THRESHOLD}`,
        requiredScore: QA_PLANNING_THRESHOLD,
      };
    }

    return {
      canAdvance: true,
      reason: `QA-Planning approved with score ${qaPlanning.score}`,
      requiredScore: null,
    };
  }

  if (phase === 'build') {
    // Need dev and QA-Implementation completed
    const dev = agents['dev'];
    const qaImpl = agents['qa-implementation'];

    if (!dev || !qaImpl) {
      return {
        canAdvance: false,
        reason: 'Build agents not in pipeline',
        requiredScore: null,
      };
    }

    if (dev.status !== AGENT_STATUS.COMPLETED) {
      return {
        canAdvance: false,
        reason: 'Dev agent not yet completed',
        requiredScore: null,
      };
    }

    if (qaImpl.status !== AGENT_STATUS.COMPLETED) {
      return {
        canAdvance: false,
        reason: 'QA-Implementation not yet completed',
        requiredScore: QA_IMPLEMENTATION_THRESHOLD,
      };
    }

    if (qaImpl.score === null || qaImpl.score < QA_IMPLEMENTATION_THRESHOLD) {
      return {
        canAdvance: false,
        reason: `QA-Implementation score ${qaImpl.score || 0} below threshold ${QA_IMPLEMENTATION_THRESHOLD}`,
        requiredScore: QA_IMPLEMENTATION_THRESHOLD,
      };
    }

    return {
      canAdvance: true,
      reason: `QA-Implementation approved with score ${qaImpl.score}`,
      requiredScore: null,
    };
  }

  if (phase === 'deploy') {
    // Deploy is final phase
    const devops = agents['devops'];
    if (!devops) {
      return {
        canAdvance: false,
        reason: 'DevOps agent not in pipeline',
        requiredScore: null,
      };
    }

    if (devops.status === AGENT_STATUS.COMPLETED) {
      return {
        canAdvance: true,
        reason: 'DevOps completed - pipeline finished',
        requiredScore: null,
      };
    }

    return {
      canAdvance: false,
      reason: 'DevOps not yet completed',
      requiredScore: null,
    };
  }

  return {
    canAdvance: false,
    reason: `Unknown phase: ${phase}`,
    requiredScore: null,
  };
}

/**
 * Get pipeline progress summary.
 *
 * @param {object} pipelineState
 * @returns {{ phase: string, progress: number, completedAgents: string[], currentAgent: string|null, nextAgent: string|null }}
 */
export function getPipelineProgress(pipelineState) {
  const { phase, agents, completedAgents, currentAgent } = pipelineState;

  // Calculate progress percentage
  const totalAgents = Object.keys(agents).length;
  const completed = completedAgents.length;
  const progress = totalAgents > 0 ? (completed / totalAgents) * 100 : 0;

  // Find next agent
  let nextAgent = null;
  if (currentAgent) {
    const nextInfo = getNextAgent(currentAgent, completedAgents);
    nextAgent = nextInfo.next;
  }

  return {
    phase,
    progress: Math.round(progress),
    completedAgents,
    currentAgent,
    nextAgent,
  };
}

/**
 * Reset pipeline to a specific agent (for rollback/deviation).
 *
 * @param {object} pipelineState
 * @param {string} targetAgent
 * @returns {object} Updated pipeline state
 */
export function resetPipelineTo(pipelineState, targetAgent) {
  const newState = { ...pipelineState };

  // Find target agent in pipeline
  const targetDef = AGENT_PIPELINE.find((a) => a.name === targetAgent);
  if (!targetDef) {
    throw new Error(`Unknown target agent: ${targetAgent}`);
  }

  // Reset phase to target agent's phase
  newState.phase = targetDef.phase;

  // Find all agents after target in pipeline
  const targetIndex = AGENT_PIPELINE.findIndex((a) => a.name === targetAgent);
  const agentsToReset = AGENT_PIPELINE.slice(targetIndex).map((a) => a.name);

  // Reset their status
  for (const agentName of agentsToReset) {
    if (newState.agents[agentName]) {
      newState.agents[agentName] = {
        status: AGENT_STATUS.PENDING,
        score: null,
        startedAt: null,
        completedAt: null,
      };
    }
  }

  // Update completed agents list
  newState.completedAgents = newState.completedAgents.filter(
    (name) => !agentsToReset.includes(name)
  );

  // Set current agent
  newState.currentAgent = targetAgent;
  if (newState.agents[targetAgent]) {
    newState.agents[targetAgent].status = AGENT_STATUS.IN_PROGRESS;
    newState.agents[targetAgent].startedAt = new Date().toISOString();
  }

  // Add to history
  newState.history.push({
    agent: targetAgent,
    action: 'reset_to',
    timestamp: new Date().toISOString(),
    reason: 'Pipeline rollback',
  });

  return newState;
}

/**
 * Check if pipeline is complete.
 *
 * @param {object} pipelineState
 * @returns {boolean}
 */
export function isPipelineComplete(pipelineState) {
  return pipelineState.completedAt !== null;
}

/**
 * Mark an agent as in progress.
 *
 * @param {object} pipelineState
 * @param {string} agentName
 * @returns {object} Updated pipeline state
 */
export function markAgentInProgress(pipelineState, agentName) {
  const newState = { ...pipelineState };

  if (!newState.agents[agentName]) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  newState.agents[agentName] = {
    ...newState.agents[agentName],
    status: AGENT_STATUS.IN_PROGRESS,
    startedAt: new Date().toISOString(),
  };

  newState.currentAgent = agentName;

  return newState;
}

/**
 * Confirm user preview decision and advance pipeline accordingly.
 * Called by the orchestrator after the user evaluates the local preview.
 *
 * @param {object} pipelineState - Current state (phase must be 'build')
 * @param {'approve_keep'|'approve_kill'|'adjust'|'rethink'} decision
 * @returns {{ state: object, nextAction: string, nextAgent: string|null, needsModeSwitch: boolean, serverAction?: string }}
 */
export function confirmPreview(pipelineState, decision) {
  const newState = { ...pipelineState };

  if (decision === 'approve_keep' || decision === 'approve_kill') {
    const nextPhase = 'deploy';

    newState.modeTransitions.push({
      from: 'build',
      to: nextPhase,
      trigger: 'user_preview_approved',
      timestamp: new Date().toISOString(),
      reason: `User approved preview (server: ${decision === 'approve_keep' ? 'kept alive' : 'killed'})`,
    });

    newState.phase = nextPhase;

    newState.history.push({
      agent: 'orchestrator',
      action: 'preview_approved',
      timestamp: new Date().toISOString(),
      decision,
    });

    return {
      state: newState,
      nextAction: 'advance_phase',
      nextAgent: getFirstAgentInPhase(newState, nextPhase),
      needsModeSwitch: true,
      serverAction: decision === 'approve_kill' ? 'kill' : 'keep',
    };
  }

  if (decision === 'adjust') {
    newState.history.push({
      agent: 'orchestrator',
      action: 'preview_adjust',
      timestamp: new Date().toISOString(),
    });

    return {
      state: newState,
      nextAction: 'continue',
      nextAgent: 'dev',
      needsModeSwitch: false,
    };
  }

  if (decision === 'rethink') {
    newState.history.push({
      agent: 'orchestrator',
      action: 'preview_rethink',
      timestamp: new Date().toISOString(),
    });

    return {
      state: newState,
      nextAction: 'deviation',
      nextAgent: null,
      needsModeSwitch: false,
    };
  }

  throw new Error(`Invalid preview decision: ${decision}`);
}
