/**
 * @fileoverview Progress reporting for autonomous execution
 * Reports progress to user without blocking the pipeline
 */

/**
 * Build a progress report for the user.
 * @param {object} pipelineState
 * @param {object} [options] - { verbose: boolean }
 * @returns {{ summary: string, details: object, progress: number }}
 */
export function buildProgressReport(pipelineState, options = {}) {
  const { verbose = false } = options;

  const progress = calculateCompletion(pipelineState);
  const summary = verbose
    ? formatDetailedReport(pipelineState)
    : formatProgressLine(pipelineState);

  const details = {
    currentAgent: pipelineState.current_agent,
    currentStage: pipelineState.current_stage,
    agentsCompleted: countCompletedAgents(pipelineState),
    agentsTotal: countTotalAgents(pipelineState),
    lastScore: pipelineState.last_score,
    warnings: pipelineState.warnings || [],
  };

  return {
    summary,
    details,
    progress,
  };
}

/**
 * Format progress as a compact one-line status.
 * Example: "[DISCOVER 2/3] brief ✅ → detail 🔄 (score: 92%)" or "[PLAN 3/6] phases 🔄 (score: 92%)"
 * @param {object} pipelineState
 * @returns {string}
 */
export function formatProgressLine(pipelineState) {
  const stage = pipelineState.current_stage || 'INIT';
  const currentAgent = pipelineState.current_agent || 'none';
  const agentStatus = pipelineState.agent_status || {};

  // Count completed vs total in current stage
  const stageAgents = getStageAgents(stage);
  const completed = stageAgents.filter(a => agentStatus[a] === 'completed').length;
  const total = stageAgents.length;

  // Build agent chain
  const agentChain = buildAgentChain(stageAgents, agentStatus, currentAgent);

  // Add score if available
  const scoreInfo = pipelineState.last_score
    ? ` (score: ${pipelineState.last_score}%)`
    : '';

  return `[${stage} ${completed}/${total}] ${agentChain}${scoreInfo}`;
}

/**
 * Build a detailed multi-line report.
 * @param {object} pipelineState
 * @returns {string}
 */
export function formatDetailedReport(pipelineState) {
  const lines = [];
  const progress = calculateCompletion(pipelineState);
  const stage = pipelineState.current_stage || 'INIT';
  const agentStatus = pipelineState.agent_status || {};

  lines.push(`Progress: ${progress}%`);
  lines.push(`Stage: ${stage}`);
  lines.push('');

  // DISCOVER agents
  lines.push('DISCOVER:');
  const discoverAgents = getStageAgents('DISCOVER');
  discoverAgents.forEach(agent => {
    const status = agentStatus[agent] || 'pending';
    const icon = getStatusIcon(status);
    const isActive = agent === pipelineState.current_agent;
    const prefix = isActive ? '→ ' : '  ';
    lines.push(`${prefix}${icon} ${agent}`);
  });

  lines.push('');

  // PLAN agents
  lines.push('PLAN:');
  const planAgents = getStageAgents('PLAN');
  planAgents.forEach(agent => {
    const status = agentStatus[agent] || 'pending';
    const icon = getStatusIcon(status);
    const isActive = agent === pipelineState.current_agent;
    const prefix = isActive ? '→ ' : '  ';
    lines.push(`${prefix}${icon} ${agent}`);
  });

  lines.push('');

  // BUILD agents
  lines.push('BUILD:');
  const buildAgents = getStageAgents('BUILD');
  buildAgents.forEach(agent => {
    const status = agentStatus[agent] || 'pending';
    const icon = getStatusIcon(status);
    const isActive = agent === pipelineState.current_agent;
    const prefix = isActive ? '→ ' : '  ';
    lines.push(`${prefix}${icon} ${agent}`);
  });

  lines.push('');

  // DEPLOY agents
  lines.push('DEPLOY:');
  const deployAgents = getStageAgents('DEPLOY');
  deployAgents.forEach(agent => {
    const status = agentStatus[agent] || 'pending';
    const icon = getStatusIcon(status);
    const isActive = agent === pipelineState.current_agent;
    const prefix = isActive ? '→ ' : '  ';
    lines.push(`${prefix}${icon} ${agent}`);
  });

  // Add warnings if any
  if (pipelineState.warnings && pipelineState.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    pipelineState.warnings.forEach(warning => {
      lines.push(`  ⚠ ${warning}`);
    });
  }

  return lines.join('\n');
}

/**
 * Calculate overall pipeline completion percentage.
 * @param {object} pipelineState
 * @returns {number} 0-100
 */
export function calculateCompletion(pipelineState) {
  const agentStatus = pipelineState.agent_status || {};
  const allAgents = getAllAgents();

  const completed = Object.values(agentStatus).filter(s => s === 'completed').length;
  const total = allAgents.length;

  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

/**
 * Get agents for a specific stage.
 * @param {string} stage
 * @returns {string[]}
 */
function getStageAgents(stage) {
  const stages = {
    DISCOVER: ['greenfield-wu', 'brownfield-wu', 'brief'],
    PLAN: ['detail', 'architect', 'ux', 'phases', 'tasks', 'qa-planning'],
    BUILD: ['dev', 'qa-implementation'],
    DEPLOY: ['devops'],
  };

  return stages[stage] || [];
}

/**
 * Get all agents in order.
 * @returns {string[]}
 */
function getAllAgents() {
  return [
    ...getStageAgents('DISCOVER'),
    ...getStageAgents('PLAN'),
    ...getStageAgents('BUILD'),
    ...getStageAgents('DEPLOY'),
  ];
}

/**
 * Build agent chain visualization.
 * @param {string[]} agents
 * @param {object} agentStatus
 * @param {string} currentAgent
 * @returns {string}
 */
function buildAgentChain(agents, agentStatus, currentAgent) {
  const parts = [];

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const status = agentStatus[agent] || 'pending';
    const isActive = agent === currentAgent;

    if (status === 'completed') {
      parts.push(`${agent} ✅`);
    } else if (isActive) {
      parts.push(`${agent} 🔄`);
    } else if (status === 'failed') {
      parts.push(`${agent} ❌`);
    } else {
      // Don't show pending agents in compact view
      break;
    }

    if (i < agents.length - 1 && (status === 'completed' || isActive)) {
      parts.push('→');
    }
  }

  return parts.join(' ');
}

/**
 * Get status icon for agent.
 * @param {string} status
 * @returns {string}
 */
function getStatusIcon(status) {
  const icons = {
    completed: '✅',
    in_progress: '🔄',
    failed: '❌',
    pending: '⏸',
    skipped: '⏭',
    preview: '👁',
  };

  return icons[status] || '⏸';
}

/**
 * Count completed agents.
 * @param {object} pipelineState
 * @returns {number}
 */
function countCompletedAgents(pipelineState) {
  const agentStatus = pipelineState.agent_status || {};
  return Object.values(agentStatus).filter(s => s === 'completed').length;
}

/**
 * Count total agents.
 * @param {object} _pipelineState
 * @returns {number}
 */
function countTotalAgents(_pipelineState) {
  return getAllAgents().length;
}

/**
 * Get progress summary by stage.
 * @param {object} pipelineState
 * @returns {{ discover: number, plan: number, build: number, deploy: number }}
 */
export function getStageProgress(pipelineState) {
  const agentStatus = pipelineState.agent_status || {};

  const getProgress = (stage) => {
    const agents = getStageAgents(stage);
    const completed = agents.filter(a => agentStatus[a] === 'completed').length;
    return agents.length > 0 ? Math.round((completed / agents.length) * 100) : 0;
  };

  return {
    discover: getProgress('DISCOVER'),
    plan: getProgress('PLAN'),
    build: getProgress('BUILD'),
    deploy: getProgress('DEPLOY'),
  };
}
