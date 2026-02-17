import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Bundled fallback strings (English) for when i18n files aren't available
const FALLBACK_EN = {
  installer: {
    welcome: 'Welcome to Chati.dev',
    select_language: 'Select your language:',
    project_type: 'What type of project are you setting up?',
    greenfield: 'Greenfield (new project from scratch)',
    brownfield: 'Brownfield (existing project integration)',
    detected_brownfield: 'Detected package.json and src/ in current directory',
    suggestion_brownfield: 'Suggestion: Brownfield',
    confirmation_title: 'Installation Summary',
    project_label: 'Project',
    language_label: 'Language',
    ides_label: 'IDEs',
    mcps_label: 'MCPs',
    will_install: 'Will install:',
    agents_count: '13 agent definitions (DISCOVER, PLAN, BUILD, DEPLOY phases)',
    workflows_count: '6 workflow blueprints',
    templates_count: '6 templates (PRD, Brownfield PRD, Architecture, Task, QA Gate, Quick Brief)',
    constitution: 'Constitution (17 Articles + Preamble)',
    session_mgmt: 'Session management system',
    quality_gates: 'Quality gates (4-tier validation)',
    proceed: 'Proceed with installation?',
    installing: 'Installing Chati.dev...',
    created_chati: 'Created .chati/ session directory',
    created_framework: 'Created chati.dev/ system directory (agents, templates, workflows)',
    created_commands: 'Created .claude/commands/ (thin router)',
    installed_constitution: 'Installed Constitution (Articles I-XVII)',
    created_session: 'Created session.yaml schema',
    created_claude_md: 'Created CLAUDE.md',
    configured_mcps: 'Configured MCPs:',
    validating: 'Validating installation...',
    agents_valid: 'All 13 agents implement 8 protocols',
    handoff_ok: 'Handoff protocol: OK',
    validation_ok: 'Self-validation criteria: OK',
    constitution_ok: 'Constitution: 17 articles verified',
    created_memories: 'Created .chati/memories/ (Memory Layer)',
    installed_intelligence: 'Installed Intelligence Layer (Context Engine, Memory, Registry)',
    intelligence_valid: 'Intelligence: 6 spec files verified',
    registry_valid: 'Entity Registry: valid',
    memories_valid: 'Memory directory tree: valid',
    session_ok: 'Session schema: valid',
    success: 'Chati.dev installed successfully!',
    quick_start_title: 'Quick Start',
    quick_start_1: 'Open your IDE',
    quick_start_2: 'Type: /chati',
    quick_start_3: 'The orchestrator will guide you through the process',
  },
  agents: {
    starting: 'Starting agent: {agent}',
    completed: 'Agent {agent} completed with score {score}%',
    refining: 'Refining artifacts for consistency...',
    running_validations: 'Running additional validations...',
    blocked: 'Blocker detected: {blocker}',
  },
  options: {
    continue: 'Continue with {agent} (Recommended)',
    review: 'Review last result',
    status: 'View full status',
    enter_prompt: 'Enter the number or describe what you want to do:',
  },
  status: {
    project: 'Project',
    type: 'Type',
    phase: 'Phase',
    mode: 'Mode',
    language: 'Language',
    ide: 'IDE',
    current_agent: 'Current Agent',
    last_handoff: 'Last Handoff',
    backlog_items: 'Backlog Items',
    high_priority: 'high priority',
  },
  errors: {
    session_corrupted: 'Session file appears corrupted. Attempting recovery...',
    handoff_missing: 'Handoff not found. Using session.yaml + CLAUDE.md as fallback.',
    agent_failed: 'Agent failed after 3 attempts. Escalating to user.',
    mcp_required: "Required MCP '{mcp}' is not configured. Installation instructions:",
    mcp_optional: "Optional MCP '{mcp}' not configured. Skipping related functionality.",
  },
};

let currentStrings = FALLBACK_EN;
let currentLanguage = 'en';

/**
 * Load i18n strings for a given language
 * Tries: 1) installed chati.dev/i18n/ in target project, 2) bundled assets, 3) fallback
 */
export function loadLanguage(lang, targetDir = null) {
  currentLanguage = lang;

  if (lang === 'en') {
    currentStrings = FALLBACK_EN;
    return currentStrings;
  }

  // Try to load from installed project i18n
  const paths = [
    targetDir && join(targetDir, 'chati.dev', 'i18n', `${lang}.yaml`),
    join(__dirname, '..', '..', 'assets', 'i18n', `${lang}.yaml`),
  ].filter(Boolean);

  for (const filePath of paths) {
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const parsed = yaml.load(content);
        currentStrings = parsed;
        return currentStrings;
      } catch {
        // Fall through to next path
      }
    }
  }

  // Fallback to English
  currentStrings = FALLBACK_EN;
  return currentStrings;
}

/**
 * Get a translated string by dot-notation key
 * Supports interpolation: t('agents.completed', { agent: 'Brief', score: 97 })
 */
export function t(key, vars = {}) {
  const keys = key.split('.');
  let value = currentStrings;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English
      value = FALLBACK_EN;
      for (const fk of keys) {
        if (value && typeof value === 'object' && fk in value) {
          value = value[fk];
        } else {
          return key; // Return key itself if not found
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') return key;

  // Interpolate variables
  return value.replace(/\{(\w+)\}/g, (_, varName) => {
    return vars[varName] !== undefined ? String(vars[varName]) : `{${varName}}`;
  });
}

export function getCurrentLanguage() {
  return currentLanguage;
}

export const SUPPORTED_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Portugues' },
  { value: 'es', label: 'Espanol' },
  { value: 'fr', label: 'Francais' },
];
