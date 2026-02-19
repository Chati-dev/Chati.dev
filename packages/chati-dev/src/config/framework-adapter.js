/**
 * @fileoverview Framework file adapter for multi-CLI support.
 *
 * Transforms Claude Code-specific framework files (orchestrator, agents,
 * constitution, context) into provider-native versions at install time.
 * Each LLM reads instructions written for it — zero runtime translation.
 *
 * Constitution Article XIX — framework files are pre-adapted per provider.
 */

import { PROVIDER_MODEL_MAPS } from '../installer/templates.js';

// ---------------------------------------------------------------------------
// Adaptable Files
// ---------------------------------------------------------------------------

/**
 * Set of framework file paths (relative to chati.dev/) that need
 * provider-specific adaptation when the selected provider is not Claude.
 */
export const ADAPTABLE_FILES = new Set([
  'constitution.md',
  'orchestrator/chati.md',
  'agents/discover/greenfield-wu.md',
  'agents/discover/brownfield-wu.md',
  'agents/discover/brief.md',
  'agents/plan/detail.md',
  'agents/plan/architect.md',
  'agents/plan/ux.md',
  'agents/plan/phases.md',
  'agents/plan/tasks.md',
  'agents/quality/qa-planning.md',
  'agents/quality/qa-implementation.md',
  'agents/build/dev.md',
  'agents/deploy/devops.md',
  'context/governance.md',
  'context/root.md',
]);

// ---------------------------------------------------------------------------
// Provider Metadata
// ---------------------------------------------------------------------------

const PROVIDER_META = {
  claude: {
    cliName: 'Claude Code',
    contextFile: 'CLAUDE.md',
    localFile: 'CLAUDE.local.md',
  },
  gemini: {
    cliName: 'Gemini CLI',
    contextFile: 'GEMINI.md',
    localFile: '.chati/session.yaml',
  },
  codex: {
    cliName: 'Codex CLI',
    contextFile: 'AGENTS.md',
    localFile: '.chati/session.yaml',
  },
};

// ---------------------------------------------------------------------------
// Replacement Configuration Builder
// ---------------------------------------------------------------------------

/**
 * Build the complete replacement config for a given provider.
 * Returns { strings, patterns } where:
 * - strings: ordered [search, replace] pairs for replaceAll
 * - patterns: { pattern, replacement } objects for regex replace
 *
 * Ordering: most-specific strings first to prevent partial matches.
 */
function buildReplacementConfig(provider) {
  const meta = PROVIDER_META[provider];
  const modelMap = PROVIDER_MODEL_MAPS[provider];

  if (!meta || !modelMap) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const { cliName, contextFile, localFile } = meta;
  const { deep, light, minimal } = modelMap;

  // --- String replacements (ordered, most specific first) ---
  const strings = [
    // File references (most specific first)
    ['CLAUDE.local.md', localFile],
    ['CLAUDE.md', contextFile],
    ['.claude/rules/chati/', 'chati.dev/context/'],

    // Provider name (most specific first)
    ['Claude Code processes', `${cliName} processes`],
    ['Claude Code CLI', cliName],
    ['Claude Code', cliName],

    // Behavioral
    ['NEVER act as generic Claude', 'NEVER act as generic AI assistant'],

    // /model commands (specific model names)
    ['/model opus', `/model ${deep}`],
    ['/model sonnet', `/model ${light}`],
    ['/model haiku', `/model ${minimal}`],
  ];

  // --- Regex patterns for model names in structured contexts ---
  const patterns = [
    // Identity section: **Model**: opus | ...
    { pattern: /(\*\*Model\*\*:\s*)opus/g, replacement: `$1${deep}` },
    { pattern: /(\*\*Model\*\*:\s*)sonnet/g, replacement: `$1${light}` },
    { pattern: /(\*\*Model\*\*:\s*)haiku/g, replacement: `$1${minimal}` },

    // YAML-like blocks: default: sonnet, upgrade_to: opus, etc.
    { pattern: /(default:\s*)opus/g, replacement: `$1${deep}` },
    { pattern: /(default:\s*)sonnet/g, replacement: `$1${light}` },
    { pattern: /(default:\s*)haiku/g, replacement: `$1${minimal}` },
    { pattern: /(upgrade_to:\s*)opus/g, replacement: `$1${deep}` },
    { pattern: /(upgrade_to:\s*)sonnet/g, replacement: `$1${light}` },
    { pattern: /(downgrade_to:\s*)haiku/g, replacement: `$1${minimal}` },
    { pattern: /(downgrade_to:\s*)sonnet/g, replacement: `$1${light}` },
    { pattern: /(recommended:\s*)opus/g, replacement: `$1${deep}` },
    { pattern: /(recommended:\s*)sonnet/g, replacement: `$1${light}` },
    { pattern: /(actual:\s*)opus/g, replacement: `$1${deep}` },
    { pattern: /(actual:\s*)sonnet/g, replacement: `$1${light}` },
    { pattern: /(model:\s*)opus/g, replacement: `$1${deep}` },
    { pattern: /(model:\s*)sonnet/g, replacement: `$1${light}` },

    // Table cells: | opus | or | sonnet | or | haiku |
    { pattern: /(\|\s*)opus(\s*\|)/g, replacement: `$1${deep}$2` },
    { pattern: /(\|\s*)sonnet(\s*\|)/g, replacement: `$1${light}$2` },
    { pattern: /(\|\s*)haiku(\s*\|)/g, replacement: `$1${minimal}$2` },

    // Upgrade/downgrade conditions in prose: "sonnet if ...", "opus if ..."
    // Negative lookbehind prevents double-prefix when deep model contains a tier name (e.g. claude-sonnet)
    { pattern: /(?<!-)opus if /g, replacement: `${deep} if ` },
    { pattern: /(?<!-)sonnet if /g, replacement: `${light} if ` },
    { pattern: /(?<!-)haiku if /g, replacement: `${minimal} if ` },

    // Constitution/governance model tier definitions
    { pattern: /\*\*opus\*\*:/g, replacement: `**${deep}**:` },
    { pattern: /\*\*sonnet\*\*:/g, replacement: `**${light}**:` },
    { pattern: /\*\*haiku\*\*:/g, replacement: `**${minimal}**:` },
    { pattern: /opus \(deep reasoning\)/g, replacement: `${deep} (deep reasoning)` },
    { pattern: /sonnet \(structured\)/g, replacement: `${light} (structured)` },
    { pattern: /haiku \(lightweight\)/g, replacement: `${minimal} (lightweight)` },

    // Provider field in agent Identity: claude (default) with optional conditional
    { pattern: /- \*\*Provider\*\*: claude \(default\)(?:\s*\|[^\n]*)?/g,
      replacement: `- **Provider**: ${provider} (default)` },

    // Provider in table rows: | claude (default) | or | claude (default) | gemini (...) |
    { pattern: /(\|\s*)claude \(default\)(?:\s*\|[^|\n]*)?\s*(\|)/g,
      replacement: `$1${provider} (default) $2` },

    // "claude" as primary provider in prose
    { pattern: /primary provider \(claude\)/g, replacement: `primary provider (${provider})` },
    { pattern: /fallback_provider: claude/g, replacement: `fallback_provider: ${provider}` },
    { pattern: /fall back to the primary provider \(claude\)/g,
      replacement: `fall back to the primary provider (${provider})` },
    { pattern: /primary provider: claude/g, replacement: `primary provider: ${provider}` },

    // /chati providers display: swap PRIMARY designation
    // Note: "Claude Code CLI" may already be replaced by string replacements, so match any trailing text
    { pattern: /claude\s+PRIMARY\s+Enabled\s+.+/g,
      replacement: `${provider}    PRIMARY   Enabled   ${cliName}` },

    // CLAUDE.md Update sections in agents
    { pattern: /### CLAUDE\.md Update/g, replacement: `### ${contextFile} Update` },
    { pattern: /### CLAUDE\.md Final Update/g, replacement: `### ${contextFile} Final Update` },
    { pattern: /Update CLAUDE\.md/g, replacement: `Update ${contextFile}` },
  ];

  return { strings, patterns };
}

// ---------------------------------------------------------------------------
// Main Adapter Function
// ---------------------------------------------------------------------------

/**
 * Adapt a single framework file for the target provider.
 *
 * @param {string} content - Original file content (Claude Code version)
 * @param {string} filePath - Relative path within chati.dev/ (e.g. 'orchestrator/chati.md')
 * @param {string} provider - Target provider: 'gemini', 'codex'
 * @returns {string} Adapted content for the target provider
 */
export function adaptFrameworkFile(content, filePath, provider) {
  if (provider === 'claude') return content;
  if (!content) return content;

  const config = buildReplacementConfig(provider);
  let result = content;

  // 1. Apply ordered string replacements (most specific first)
  for (const [search, replace] of config.strings) {
    result = result.replaceAll(search, replace);
  }

  // 2. Apply regex patterns (model names + structured contexts)
  for (const { pattern, replacement } of config.patterns) {
    result = result.replace(pattern, replacement);
  }

  return result;
}
