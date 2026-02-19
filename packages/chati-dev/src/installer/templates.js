import yaml from 'js-yaml';

/**
 * Generate session.yaml content
 */
export function generateSessionYaml(config) {
  const { projectName, projectType, language, selectedIDEs, selectedMCPs, llmProvider } = config;

  const session = {
    project: {
      name: projectName,
      type: projectType,
      state: 'discover',
    },
    execution_mode: 'interactive',
    execution_profile: 'guided',
    current_agent: '',
    language: language,
    ides: selectedIDEs,
    mcps: selectedMCPs,
    providers_enabled: [llmProvider || 'claude'],
    user_level: 'auto',
    user_level_confidence: 0.0,
    agents: {},
    backlog: [],
    last_handoff: '',
    deviations: [],
    profile_transitions: [],
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
 * Optimal model assignments per provider.
 * Deep reasoning agents (architect, qa, dev, detail, brownfield-wu) get the top model.
 * Lightweight agents (brief, phases, ux, greenfield-wu, devops, orchestrator) get the fast model.
 */
const PROVIDER_MODEL_MAPS = {
  claude: {
    deep: 'opus', light: 'sonnet', minimal: 'haiku',
    agents: {
      orchestrator: 'sonnet', 'greenfield-wu': 'haiku', 'brownfield-wu': 'opus',
      brief: 'sonnet', detail: 'opus', architect: 'opus', ux: 'sonnet',
      phases: 'sonnet', tasks: 'sonnet', 'qa-planning': 'opus',
      dev: 'opus', 'qa-implementation': 'opus', devops: 'sonnet',
    },
  },
  gemini: {
    deep: 'pro', light: 'flash', minimal: 'flash',
    agents: {
      orchestrator: 'flash', 'greenfield-wu': 'flash', 'brownfield-wu': 'pro',
      brief: 'flash', detail: 'pro', architect: 'pro', ux: 'flash',
      phases: 'flash', tasks: 'flash', 'qa-planning': 'pro',
      dev: 'pro', 'qa-implementation': 'pro', devops: 'flash',
    },
  },
  codex: {
    deep: 'codex', light: 'mini', minimal: 'mini',
    agents: {
      orchestrator: 'mini', 'greenfield-wu': 'mini', 'brownfield-wu': 'codex',
      brief: 'mini', detail: 'codex', architect: 'codex', ux: 'mini',
      phases: 'mini', tasks: 'mini', 'qa-planning': 'codex',
      dev: 'codex', 'qa-implementation': 'codex', devops: 'mini',
    },
  },
  copilot: {
    deep: 'claude-sonnet', light: 'claude-sonnet', minimal: 'gpt-5',
    agents: {
      orchestrator: 'claude-sonnet', 'greenfield-wu': 'gpt-5', 'brownfield-wu': 'claude-sonnet',
      brief: 'claude-sonnet', detail: 'claude-sonnet', architect: 'claude-sonnet', ux: 'claude-sonnet',
      phases: 'claude-sonnet', tasks: 'claude-sonnet', 'qa-planning': 'claude-sonnet',
      dev: 'claude-sonnet', 'qa-implementation': 'claude-sonnet', devops: 'claude-sonnet',
    },
  },
};

/**
 * Generate config.yaml content
 */
export function generateConfigYaml(config) {
  const { version, projectType, language, selectedIDEs, llmProvider } = config;
  const provider = llmProvider || 'claude';

  const configData = {
    version: version,
    installed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    installer_version: version,
    project_type: projectType,
    language: language,
    ides: selectedIDEs,
    providers: {
      claude: { enabled: true, primary: provider === 'claude' },
      gemini: { enabled: provider === 'gemini' || selectedIDEs.includes('gemini-cli'), model_default: 'pro', primary: provider === 'gemini' },
      codex: { enabled: provider === 'codex' || selectedIDEs.includes('codex-cli'), model_default: 'codex', primary: provider === 'codex' },
      copilot: { enabled: provider === 'copilot' || selectedIDEs.includes('github-copilot'), primary: provider === 'copilot' },
    },
  };

  // Add agent_overrides with optimal model map for the selected provider
  if (provider !== 'claude') {
    const modelMap = PROVIDER_MODEL_MAPS[provider];
    if (modelMap) {
      configData.agent_overrides = {};
      for (const [agent, model] of Object.entries(modelMap.agents)) {
        configData.agent_overrides[agent] = { provider, model };
      }
    }
  }

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
 * Generate Codex CLI command (.codex/commands/chati.md)
 *
 * Codex CLI supports /chati slash command via .codex/commands/.
 * Also reads AGENTS.md for project context (auto-generated by context-file-generator).
 */
export function generateCodexRouter() {
  return `# /chati — Thin Router

## CRITICAL — Language Override

Read \`.chati/session.yaml\` field \`language\` BEFORE anything else.
ALL responses MUST be in this language. This overrides any global setting.

| Value | Language |
|-------|----------|
| \`en\`  | English |
| \`pt\`  | Portugues |
| \`es\`  | Espanol |
| \`fr\`  | Francais |

If session.yaml does not exist or has no language field, default to English.

## Load

Read and execute the full orchestrator at \`chati.dev/orchestrator/chati.md\`.

Pass through all context: session state, handoffs, artifacts, and user input.

**Context to pass:**
- \`.chati/session.yaml\` (session state — includes language)
- \`AGENTS.md\` (project context — auto-generated)
- \`chati.dev/artifacts/handoffs/\` (latest handoff)
- \`chati.dev/config.yaml\` (version info)
`;
}

/**
 * Generate Gemini CLI TOML command (.gemini/commands/chati.toml)
 *
 * Gemini CLI custom commands use TOML format with `description` and `prompt` fields.
 * Supports {{args}} for user arguments and @{file} for file injection.
 */
export function generateGeminiRouter() {
  return `description = "Activate Chati.dev orchestrator"
prompt = """
CRITICAL — Language Override:
Read \`.chati/session.yaml\` field \`language\` BEFORE anything else.
ALL responses MUST be in this language (en, pt, es, fr).
If session.yaml does not exist or has no language field, default to English.

Read and execute the full orchestrator at \`chati.dev/orchestrator/chati.md\`.

Context to load:
- \`.chati/session.yaml\` (session state — includes language)
- \`chati.dev/artifacts/handoffs/\` (latest handoff)
- \`chati.dev/config.yaml\` (version info)

User input: {{args}}
"""
`;
}

/**
 * Generate GitHub Copilot agent file (.github/agents/chati.md)
 *
 * Copilot CLI uses .github/agents/*.md for custom agents.
 * The user invokes with @chati in the Copilot CLI.
 */
export function generateCopilotAgent() {
  return `# Chati.dev Orchestrator

You are the Chati.dev orchestrator agent for GitHub Copilot CLI.

## CRITICAL — Language Override

Read \`.chati/session.yaml\` field \`language\` BEFORE anything else.
ALL responses MUST be in this language. This overrides any global setting.

| Value | Language |
|-------|----------|
| \`en\`  | English |
| \`pt\`  | Portugues |
| \`es\`  | Espanol |
| \`fr\`  | Francais |

If session.yaml does not exist or has no language field, default to English.

## Load

Read and execute the full orchestrator at \`chati.dev/orchestrator/chati.md\`.

Pass through all context: session state, handoffs, artifacts, and user input.

**Context to pass:**
- \`.chati/session.yaml\` (session state — includes language)
- \`chati.dev/artifacts/handoffs/\` (latest handoff)
- \`chati.dev/config.yaml\` (version info)
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
