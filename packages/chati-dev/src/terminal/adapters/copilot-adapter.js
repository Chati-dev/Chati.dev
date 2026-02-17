/**
 * @fileoverview GitHub Copilot CLI adapter.
 *
 * Translates chati.dev spawning config into Copilot CLI
 * command, arguments, and environment variables.
 */

/**
 * Build Copilot CLI command and arguments.
 *
 * @param {import('../spawner.js').SpawnConfig} config
 * @param {import('../cli-registry.js').ProviderConfig} provider
 * @returns {{ command: string, args: string[], stdinPrompt: string|null }}
 */
export function buildCommand(config, provider) {
  const args = ['-p'];

  if (config.model) {
    const resolvedModel = provider.modelMap[config.model] || config.model;
    args.push('--model', resolvedModel);
  }

  return {
    command: 'copilot',
    args,
    stdinPrompt: config.prompt || null,
  };
}

/**
 * Build environment variables specific to Copilot CLI.
 *
 * @param {import('../spawner.js').SpawnConfig} config
 * @returns {Record<string, string>}
 */
export function buildEnv(config) {
  return {};
}
