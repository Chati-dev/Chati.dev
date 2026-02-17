/**
 * @fileoverview Shared YAML config parser for provider configuration.
 *
 * Extracts provider enabled/primary status and agent overrides from
 * config.yaml using lightweight regex-based parsing. Used by
 * cli-registry.js, context-file-generator.js, and health/engine.js.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Parse provider configuration from config.yaml.
 *
 * @param {string} projectDir - Project root directory
 * @returns {{ primary: string, enabled: string[], raw: string|null }}
 */
export function parseProviderConfig(projectDir) {
  const configPath = join(projectDir, 'chati.dev', 'config.yaml');
  if (!existsSync(configPath)) {
    return { primary: 'claude', enabled: ['claude'], raw: null };
  }

  const raw = readFileSync(configPath, 'utf-8');
  const providers = ['claude', 'gemini', 'codex', 'copilot'];
  const enabled = [];
  let primary = 'claude';

  for (const name of providers) {
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

  return { primary, enabled, raw };
}

/**
 * Parse agent override block from config.yaml.
 *
 * @param {string} raw - Raw config.yaml content
 * @param {string} agent - Agent name
 * @returns {{ provider: string, model: string }|null}
 */
export function parseAgentOverride(raw, agent) {
  const escaped = agent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const overrideBlock = raw.match(new RegExp(`^\\s+${escaped}:\\s*\\n((?:\\s+\\w+:.*\\n?)*)`, 'm'));
  if (!overrideBlock) return null;

  const block = overrideBlock[1];
  const providerMatch = block.match(/provider:\s*(\S+)/);
  const modelMatch = block.match(/model:\s*(\S+)/);

  if (providerMatch && modelMatch) {
    return { provider: providerMatch[1], model: modelMatch[1] };
  }
  return null;
}

/**
 * Get list of enabled non-Claude providers.
 *
 * @param {string} projectDir - Project root directory
 * @returns {string[]} List of enabled provider names (excludes claude)
 */
export function getEnabledNonClaudeProviders(projectDir) {
  const { enabled } = parseProviderConfig(projectDir);
  return enabled.filter(p => p !== 'claude');
}

/**
 * Check if a CLI command is available on the system.
 * Cross-platform: uses 'which' on Unix, 'where' on Windows.
 *
 * @param {string} command - CLI command name
 * @returns {Promise<boolean>}
 */
export async function isCommandAvailable(command) {
  const { execFileSync } = await import('child_process');
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(cmd, [command], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
