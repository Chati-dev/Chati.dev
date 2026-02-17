/**
 * @fileoverview Claude Code CLI adapter.
 *
 * Translates chati.dev spawning config into Claude Code CLI
 * command, arguments, and environment variables.
 */

/**
 * @typedef {import('../cli-registry.js').ProviderConfig} ProviderConfig
 * @typedef {import('../spawner.js').SpawnConfig} SpawnConfig
 */

/**
 * Build Claude Code CLI command and arguments.
 *
 * @param {SpawnConfig} config - Spawn configuration
 * @param {ProviderConfig} provider - Provider definition from registry
 * @returns {{ command: string, args: string[], stdinPrompt: string|null }}
 */
export function buildCommand(config, provider) {
  const args = ['--print', '--dangerously-skip-permissions'];

  if (config.model) {
    const resolvedModel = provider.modelMap[config.model] || config.model;
    args.push('--model', resolvedModel);
  }

  return {
    command: 'claude',
    args,
    stdinPrompt: config.prompt || null,
  };
}

/**
 * Build environment variables specific to Claude Code.
 *
 * @param {SpawnConfig} config
 * @returns {Record<string, string>}
 */
export function buildEnv(config) {
  return {};
}
