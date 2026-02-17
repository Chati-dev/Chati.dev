/**
 * @fileoverview Gemini CLI adapter.
 *
 * Translates chati.dev spawning config into Gemini CLI
 * command, arguments, and environment variables.
 */

/**
 * Build Gemini CLI command and arguments.
 *
 * @param {import('../spawner.js').SpawnConfig} config
 * @param {import('../cli-registry.js').ProviderConfig} provider
 * @returns {{ command: string, args: string[], stdinPrompt: string|null }}
 */
export function buildCommand(config, provider) {
  const args = [];

  if (config.model) {
    const resolvedModel = provider.modelMap[config.model] || config.model;
    args.push('--model', resolvedModel);
  }

  // Gemini CLI uses --prompt for non-interactive mode
  // When stdin is piped, Gemini reads from stdin automatically
  args.push('--prompt');

  return {
    command: 'gemini',
    args,
    stdinPrompt: config.prompt || null,
  };
}

/**
 * Build environment variables specific to Gemini CLI.
 *
 * @param {import('../spawner.js').SpawnConfig} config
 * @returns {Record<string, string>}
 */
export function buildEnv(config) {
  return {};
}
