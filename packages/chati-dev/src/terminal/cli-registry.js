/**
 * @fileoverview CLI Provider Registry for multi-CLI agent execution.
 *
 * Central registry of all supported CLI providers with their capabilities,
 * command syntax, model maps, and feature support. This is the source of
 * truth for multi-CLI governance (Constitution Article XIX).
 */

import * as adapters from './adapters/index.js';
import { parseProviderConfig, parseAgentOverride } from '../utils/config-parser.js';

// ---------------------------------------------------------------------------
// Provider Definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {object} ProviderConfig
 * @property {string} name - Provider identifier
 * @property {string} command - CLI command name
 * @property {string[]} baseArgs - Default CLI arguments for non-interactive mode
 * @property {string} modelFlag - CLI flag for model selection
 * @property {boolean} stdinSupport - Whether prompts can be piped via stdin
 * @property {boolean} hooksSupport - Whether the CLI supports hooks (event middleware)
 * @property {boolean} mcpSupport - Whether the CLI supports MCP servers
 * @property {string|null} contextFile - Project context file name (CLAUDE.md, GEMINI.md, etc.)
 * @property {Record<string, string>} modelMap - Tier-to-model-id mapping
 * @property {object} adapter - CLI-specific adapter module
 */

/** @type {Record<string, ProviderConfig>} */
const PROVIDERS = {
  claude: {
    name: 'claude',
    command: 'claude',
    baseArgs: ['--print', '--dangerously-skip-permissions'],
    modelFlag: '--model',
    stdinSupport: true,
    hooksSupport: true,
    mcpSupport: true,
    contextFile: 'CLAUDE.md',
    modelMap: {
      opus: 'claude-opus-4-6',
      sonnet: 'claude-sonnet-4-5-20250929',
      haiku: 'claude-haiku-4-5-20251001',
    },
    adapter: adapters.claude,
  },
  gemini: {
    name: 'gemini',
    command: 'gemini',
    baseArgs: [],
    modelFlag: '--model',
    stdinSupport: true,
    hooksSupport: false,
    mcpSupport: true,
    contextFile: 'GEMINI.md',
    modelMap: {
      pro: 'gemini-2.5-pro',
      flash: 'gemini-2.5-flash',
    },
    adapter: adapters.gemini,
  },
  codex: {
    name: 'codex',
    command: 'codex',
    baseArgs: ['exec'],
    modelFlag: '-m',
    stdinSupport: true,
    hooksSupport: false,
    mcpSupport: true,
    contextFile: 'AGENTS.md',
    modelMap: {
      codex: 'gpt-5.3-codex',
      mini: 'codex-mini-latest',
    },
    adapter: adapters.codex,
  },
};

// ---------------------------------------------------------------------------
// Provider Resolution
// ---------------------------------------------------------------------------

/**
 * Get a provider configuration by name.
 *
 * @param {string} name - Provider name (claude, gemini, codex)
 * @returns {ProviderConfig}
 * @throws {Error} When provider is not found
 */
export function getProvider(name) {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown CLI provider: "${name}". Available: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  return provider;
}

/**
 * Get all registered providers.
 *
 * @returns {Record<string, ProviderConfig>}
 */
export function getAllProviders() {
  return { ...PROVIDERS };
}

/**
 * Load enabled providers from project config.yaml.
 *
 * @param {string} projectDir - Project root directory
 * @returns {{ primary: string, enabled: string[] }}
 */
export function loadEnabledProviders(projectDir) {
  const { primary, enabled } = parseProviderConfig(projectDir);
  return { primary, enabled };
}

/**
 * Resolve which provider should be used for a given agent.
 * Priority: agent_overrides > agent default > primary provider.
 *
 * @param {string} agent - Agent name
 * @param {string} projectDir - Project root directory
 * @param {Record<string, {provider: string, model: string, tier: string}>} agentModels - Agent model assignments
 * @returns {{ provider: string, model: string }}
 */
export function resolveProviderForAgent(agent, projectDir, agentModels) {
  const { primary, enabled } = loadEnabledProviders(projectDir);

  // Check agent_overrides in config.yaml (block-style YAML)
  const { raw } = parseProviderConfig(projectDir);
  if (raw) {
    const override = parseAgentOverride(raw, agent);
    if (override && enabled.includes(override.provider)) {
      return override;
    }
  }

  // Use agent's default assignment
  const agentConfig = agentModels[agent];
  if (agentConfig) {
    const agentProvider = agentConfig.provider || primary;
    if (enabled.includes(agentProvider)) {
      return { provider: agentProvider, model: agentConfig.model };
    }
  }

  // Fallback to primary provider with its default light-tier model
  const provider = PROVIDERS[primary];
  const defaultModel = provider ? Object.keys(provider.modelMap)[0] : 'sonnet';
  return { provider: primary, model: defaultModel };
}

/**
 * Check if a provider CLI is available on the system.
 *
 * @param {string} name - Provider name
 * @returns {Promise<boolean>}
 */
export async function isProviderAvailable(name) {
  const provider = PROVIDERS[name];
  if (!provider) return false;

  const { execFileSync } = await import('child_process');
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(cmd, [provider.command], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export { PROVIDERS };
