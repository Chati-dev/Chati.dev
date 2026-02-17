import yaml from 'js-yaml';

/**
 * Generate session.yaml content
 */
export function generateSessionYaml(config) {
  const { projectName, projectType, language, selectedIDEs, selectedMCPs } = config;

  const session = {
    project: {
      name: projectName,
      type: projectType,
      state: 'discover',
    },
    execution_mode: 'interactive',
    current_agent: '',
    language: language,
    ides: selectedIDEs,
    mcps: selectedMCPs,
    user_level: 'auto',
    user_level_confidence: 0.0,
    agents: {},
    backlog: [],
    last_handoff: '',
    deviations: [],
  };

  // Initialize all 12 agent statuses
  const agentNames = [
    'greenfield-wu', 'brownfield-wu', 'brief', 'detail',
    'architect', 'ux', 'phases', 'tasks',
    'qa-planning', 'dev', 'qa-implementation', 'devops',
  ];

  for (const agent of agentNames) {
    session.agents[agent] = {
      status: 'pending',
      score: 0,
      criteria_count: 0,
      completed_at: null,
    };
  }

  return yaml.dump(session, { lineWidth: -1, quotingType: '"', forceQuotes: false });
}

/**
 * Generate config.yaml content
 */
export function generateConfigYaml(config) {
  const { version, projectType, language, selectedIDEs } = config;

  const configData = {
    version: version,
    installed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    installer_version: version,
    project_type: projectType,
    language: language,
    ides: selectedIDEs,
  };

  return yaml.dump(configData, { lineWidth: -1, quotingType: '"', forceQuotes: false });
}

/**
 * Generate CLAUDE.md content (minimal — framework rules auto-loaded from .claude/rules/chati/)
 */
export function generateClaudeMd(config) {
  const { projectName, projectType, language } = config;

  return `# ${projectName}

## Project Context
- **Type**: ${projectType === 'greenfield' ? 'Greenfield (new project)' : 'Brownfield (existing project)'}
- **Language**: ${language}

## Chati.dev
Framework rules loaded from \`.claude/rules/chati/\`. Runtime state in \`CLAUDE.local.md\`.
Type \`/chati\` to start.
`;
}

/**
 * Generate CLAUDE.local.md content (runtime state — auto-gitignored, never committed)
 */
export function generateClaudeLocalMd() {
  return `# Chati.dev Runtime State

## Session Lock
**Status: INACTIVE** — Type \`/chati\` to activate.

<!-- SESSION-LOCK:INACTIVE -->

## Current State
- **Agent**: None (ready to start)
- **Pipeline**: Pre-start
- **Mode**: interactive

## Recent Decisions
_No decisions yet. Start with /chati._

---
_Auto-updated by Chati.dev orchestrator_
`;
}
