/**
 * @fileoverview CLI Provider Registry for multi-CLI agent execution.
 *
 * Central registry of all supported CLI providers with their capabilities,
 * command syntax, model maps, and feature support. This is the source of
 * truth for multi-CLI governance (Constitution Article XIX).
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as adapters from './adapters/index.js';

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
    baseArgs: ['--prompt'],
    modelFlag: '--model',
    stdinSupport: true,
    hooksSupport: true,
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
      mini: 'gpt-5.1-codex-mini',
    },
    adapter: adapters.codex,
  },
  copilot: {
    name: 'copilot',
    command: 'copilot',
    baseArgs: ['-p'],
    modelFlag: '--model',
    stdinSupport: true,
    hooksSupport: true,
    mcpSupport: true,
    contextFile: null,
    modelMap: {
      'claude-sonnet': 'claude-sonnet-4.5',
      'gpt-5': 'gpt-5.1',
    },
    adapter: adapters.copilot,
  },
};

// ---------------------------------------------------------------------------
// Provider Resolution
// ---------------------------------------------------------------------------

/**
 * Get a provider configuration by name.
 *
 * @param {string} name - Provider name (claude, gemini, codex, copilot)
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
  const configPath = join(projectDir, 'chati.dev', 'config.yaml');
  if (!existsSync(configPath)) {
    return { primary: 'claude', enabled: ['claude'] };
  }

  const raw = readFileSync(configPath, 'utf-8');

  // Lightweight YAML extraction (avoid dependency in spawning path)
  const enabled = [];
  let primary = 'claude';

  for (const name of Object.keys(PROVIDERS)) {
    const enabledMatch = raw.match(new RegExp(`${name}:[\\s\\S]*?enabled:\\s*(true|false)`, 'm'));
    if (enabledMatch && enabledMatch[1] === 'true') {
      enabled.push(name);
    }
    const primaryMatch = raw.match(new RegExp(`${name}:[\\s\\S]*?primary:\\s*(true|false)`, 'm'));
    if (primaryMatch && primaryMatch[1] === 'true') {
      primary = name;
    }
  }

  // Claude is always enabled as fallback
  if (!enabled.includes('claude')) {
    enabled.unshift('claude');
  }

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

  // Check agent_overrides in config.yaml
  const configPath = join(projectDir, 'chati.dev', 'config.yaml');
  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, 'utf-8');
    const overrideMatch = raw.match(new RegExp(`${agent}:\\s*\\{[^}]*provider:\\s*(\\w+)[^}]*model:\\s*(\\w+)`, 'm'));
    if (overrideMatch) {
      const overrideProvider = overrideMatch[1];
      if (enabled.includes(overrideProvider)) {
        return { provider: overrideProvider, model: overrideMatch[2] };
      }
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

  // Fallback to primary
  return { provider: primary, model: 'sonnet' };
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

  const { execSync } = await import('child_process');
  try {
    execSync(`which ${provider.command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export { PROVIDERS };
