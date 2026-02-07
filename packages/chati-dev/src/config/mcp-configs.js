/**
 * MCP Registry and Configuration
 * Defines available MCPs and their agent dependencies
 */
export const MCP_CONFIGS = {
  browser: {
    name: 'Browser (Playwright)',
    description: 'Web automation and testing',
    defaultSelected: true,
    requiresEnv: [],
    claudeConfig: {
      command: 'npx',
      args: ['-y', '@playwright/mcp'],
    },
  },
  context7: {
    name: 'Context7',
    description: 'Library documentation search',
    defaultSelected: true,
    requiresEnv: [],
    claudeConfig: {
      command: 'npx',
      args: ['-y', '@context7/mcp'],
    },
  },
  exa: {
    name: 'Exa',
    description: 'Advanced web search',
    defaultSelected: true,
    requiresEnv: ['EXA_API_KEY'],
    claudeConfig: {
      command: 'npx',
      args: ['-y', '@exa/mcp'],
      env: { EXA_API_KEY: '${EXA_API_KEY}' },
    },
  },
  'desktop-commander': {
    name: 'Desktop Commander',
    description: 'File system access',
    defaultSelected: false,
    requiresEnv: [],
    claudeConfig: {
      command: 'npx',
      args: ['-y', '@anthropic/desktop-commander-mcp'],
    },
  },
  'sequential-thinking': {
    name: 'Sequential Thinking',
    description: 'Step-by-step reasoning',
    defaultSelected: false,
    requiresEnv: [],
    claudeConfig: {
      command: 'npx',
      args: ['-y', '@anthropic/sequential-thinking-mcp'],
    },
  },
  github: {
    name: 'GitHub',
    description: 'GitHub API integration',
    defaultSelected: false,
    requiresEnv: ['GITHUB_TOKEN'],
    claudeConfig: {
      command: 'npx',
      args: ['-y', '@anthropic/github-mcp'],
      env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
    },
  },
};

/**
 * Agent-MCP dependency matrix
 */
export const AGENT_MCP_DEPS = {
  orchestrator:       { required: [],                    optional: ['git'] },
  'greenfield-wu':    { required: [],                    optional: [] },
  'brownfield-wu':    { required: ['git'],               optional: ['browser'] },
  brief:              { required: [],                    optional: [] },
  detail:             { required: [],                    optional: ['exa'] },
  architect:          { required: ['context7'],          optional: ['exa', 'git'] },
  ux:                 { required: [],                    optional: ['browser'] },
  phases:             { required: [],                    optional: [] },
  tasks:              { required: [],                    optional: [] },
  'qa-planning':      { required: [],                    optional: [] },
  dev:                { required: ['context7', 'git'],   optional: ['browser', 'coderabbit'] },
  'qa-implementation':{ required: ['git'],               optional: ['browser', 'coderabbit'] },
  devops:             { required: ['git', 'github'],     optional: [] },
};

/**
 * Get list of MCPs for selection prompt
 */
export function getMCPChoices() {
  return Object.entries(MCP_CONFIGS).map(([key, config]) => ({
    value: key,
    label: config.name,
    hint: config.description,
    initialValue: config.defaultSelected,
  }));
}

/**
 * Check MCP warnings for selected project type and MCPs
 */
export function getMCPWarnings(projectType, selectedMCPs) {
  const warnings = [];

  if (projectType === 'brownfield' && !selectedMCPs.includes('git')) {
    warnings.push({
      level: 'critical',
      message: "You selected Brownfield but did not enable 'git' MCP. The brownfield-wu agent requires git for codebase analysis.",
    });
  }

  return warnings;
}

/**
 * Generate MCP config for Claude Code (.claude/mcp.json)
 */
export function generateClaudeMCPConfig(selectedMCPs) {
  const mcpServers = {};
  for (const mcpKey of selectedMCPs) {
    const config = MCP_CONFIGS[mcpKey];
    if (config?.claudeConfig) {
      const entry = {
        command: config.claudeConfig.command,
        args: config.claudeConfig.args,
      };
      if (config.claudeConfig.env) {
        entry.env = config.claudeConfig.env;
      }
      mcpServers[mcpKey] = entry;
    }
  }
  return { mcpServers };
}
