/**
 * @fileoverview Agent selection logic for the orchestrator.
 * Determines which agent should act based on session state and intent.
 */

import { INTENT_TYPES } from './intent-classifier.js';

/**
 * The complete agent pipeline in execution order.
 */
export const AGENT_PIPELINE = [
  { name: 'greenfield-wu', phase: 'discover', group: 'wu', parallel: false },
  { name: 'brownfield-wu', phase: 'discover', group: 'wu', parallel: false },
  { name: 'brief', phase: 'discover', group: 'discover', parallel: false },
  { name: 'detail', phase: 'plan', group: 'plan-parallel', parallel: true },
  { name: 'architect', phase: 'plan', group: 'plan-parallel', parallel: true },
  { name: 'ux', phase: 'plan', group: 'plan-parallel', parallel: true },
  { name: 'phases', phase: 'plan', group: 'plan', parallel: false },
  { name: 'tasks', phase: 'plan', group: 'plan', parallel: false },
  { name: 'qa-planning', phase: 'plan', group: 'quality', parallel: false },
  { name: 'dev', phase: 'build', group: 'build', parallel: false },
  { name: 'qa-implementation', phase: 'build', group: 'quality', parallel: false },
  { name: 'devops', phase: 'deploy', group: 'deploy', parallel: false },
];

/**
 * Get agent definition by name.
 *
 * @param {string} name - Agent name
 * @returns {object|null}
 */
function getAgentDef(name) {
  return AGENT_PIPELINE.find((a) => a.name === name) || null;
}

/**
 * Get agents by phase.
 *
 * @param {string} phase - Phase name
 * @returns {object[]}
 */
function getAgentsByPhase(phase) {
  return AGENT_PIPELINE.filter((a) => a.phase === phase);
}

/**
 * Get agents by group.
 *
 * @param {string} group - Group name
 * @returns {object[]}
 */
function getAgentsByGroup(group) {
  return AGENT_PIPELINE.filter((a) => a.group === group);
}

/**
 * Select the appropriate agent for the current context.
 *
 * @param {object} context
 * @param {string} context.intent - Classified intent
 * @param {string} context.mode - Current mode (discover/plan/build/deploy)
 * @param {string} [context.currentAgent] - Currently active agent
 * @param {string[]} [context.completedAgents] - Already completed agents
 * @param {boolean} [context.isGreenfield] - true for new projects, false for existing
 * @returns {{ agent: string, reason: string, parallelGroup: string[]|null }}
 */
export function selectAgent(context) {
  const {
    intent,
    mode,
    currentAgent,
    completedAgents = [],
    isGreenfield = true,
  } = context;

  // If resuming, continue from current agent
  if (intent === INTENT_TYPES.RESUME && currentAgent) {
    const nextInfo = getNextAgent(currentAgent, completedAgents);
    if (nextInfo.next) {
      return {
        agent: nextInfo.next,
        reason: `Resuming after ${currentAgent}`,
        parallelGroup: nextInfo.isParallel ? nextInfo.group : null,
      };
    }
  }

  // If starting fresh with no completed agents
  if (completedAgents.length === 0) {
    // Planning intent starts with WU
    if (intent === INTENT_TYPES.DISCOVER) {
      const wuAgent = isGreenfield ? 'greenfield-wu' : 'brownfield-wu';
      return {
        agent: wuAgent,
        reason: `Starting ${isGreenfield ? 'greenfield' : 'brownfield'} project`,
        parallelGroup: null,
      };
    }

    // Implementation without planning (edge case)
    if (intent === INTENT_TYPES.IMPLEMENTATION && mode === 'build') {
      return {
        agent: 'dev',
        reason: 'Direct implementation request',
        parallelGroup: null,
      };
    }

    // Deploy without prior work (edge case)
    if (intent === INTENT_TYPES.DEPLOY && mode === 'deploy') {
      return {
        agent: 'devops',
        reason: 'Direct deployment request',
        parallelGroup: null,
      };
    }

    // Default: start with WU
    const wuAgent = isGreenfield ? 'greenfield-wu' : 'brownfield-wu';
    return {
      agent: wuAgent,
      reason: 'Starting from beginning of pipeline',
      parallelGroup: null,
    };
  }

  // If there's a current agent, get next in sequence
  if (currentAgent) {
    const nextInfo = getNextAgent(currentAgent, completedAgents);
    if (nextInfo.next) {
      return {
        agent: nextInfo.next,
        reason: `Next agent after ${currentAgent}`,
        parallelGroup: nextInfo.isParallel ? nextInfo.group : null,
      };
    }
  }

  // Find next incomplete agent in current phase
  const phaseAgents = getAgentsByPhase(mode);
  for (const agentDef of phaseAgents) {
    if (!completedAgents.includes(agentDef.name)) {
      // Handle WU fork
      if (agentDef.group === 'wu') {
        const wuAgent = isGreenfield ? 'greenfield-wu' : 'brownfield-wu';
        if (!completedAgents.includes(wuAgent)) {
          return {
            agent: wuAgent,
            reason: `Next incomplete agent in ${mode} phase`,
            parallelGroup: null,
          };
        }
        continue;
      }

      return {
        agent: agentDef.name,
        reason: `Next incomplete agent in ${mode} phase`,
        parallelGroup: agentDef.parallel
          ? getAgentsByGroup(agentDef.group).map((a) => a.name)
          : null,
      };
    }
  }

  // No incomplete agents found - phase might be complete
  return {
    agent: null,
    reason: `No incomplete agents in ${mode} phase`,
    parallelGroup: null,
  };
}

/**
 * Get the next agent in pipeline after a given agent.
 *
 * @param {string} agentName - Current agent
 * @param {string[]} completedAgents - Already completed
 * @returns {{ next: string|null, isParallel: boolean, group: string[] }}
 */
export function getNextAgent(agentName, completedAgents = []) {
  const currentDef = getAgentDef(agentName);
  if (!currentDef) {
    return { next: null, isParallel: false, group: [] };
  }

  const currentIndex = AGENT_PIPELINE.indexOf(currentDef);

  // Look ahead for next incomplete agent
  for (let i = currentIndex + 1; i < AGENT_PIPELINE.length; i++) {
    const nextDef = AGENT_PIPELINE[i];

    // Skip WU fork that doesn't apply
    if (nextDef.group === 'wu') {
      continue;
    }

    // Skip already completed agents
    if (completedAgents.includes(nextDef.name)) {
      continue;
    }

    // Found next agent
    return {
      next: nextDef.name,
      isParallel: nextDef.parallel,
      group: nextDef.parallel
        ? getAgentsByGroup(nextDef.group).map((a) => a.name)
        : [],
    };
  }

  return { next: null, isParallel: false, group: [] };
}

/**
 * Check if an agent is allowed in the current mode.
 *
 * @param {string} agentName
 * @param {string} mode
 * @returns {boolean}
 */
export function isAgentAllowedInMode(agentName, mode) {
  const agentDef = getAgentDef(agentName);
  if (!agentDef) {
    return false;
  }

  // Mode constrains which agents can run
  return agentDef.phase === mode;
}

/**
 * Get parallelizable agents that can run together.
 *
 * @param {string[]} completedAgents
 * @returns {string[][]} Groups of agents that can run in parallel
 */
export function getParallelGroups(completedAgents = []) {
  const groups = [];
  const seenGroups = new Set();

  for (const agentDef of AGENT_PIPELINE) {
    if (!agentDef.parallel) {
      continue;
    }

    if (seenGroups.has(agentDef.group)) {
      continue;
    }

    // Get all agents in this parallel group
    const groupAgents = getAgentsByGroup(agentDef.group);
    const incompleteAgents = groupAgents
      .filter((a) => !completedAgents.includes(a.name))
      .map((a) => a.name);

    if (incompleteAgents.length > 0) {
      groups.push(incompleteAgents);
      seenGroups.add(agentDef.group);
    }
  }

  return groups;
}

/**
 * Get agent definition by name (exported for testing).
 *
 * @param {string} name
 * @returns {object|null}
 */
export function getAgentDefinition(name) {
  return getAgentDef(name);
}

/**
 * Get all agents for a phase (exported for testing).
 *
 * @param {string} phase
 * @returns {object[]}
 */
export function getPhaseAgents(phase) {
  return getAgentsByPhase(phase);
}
