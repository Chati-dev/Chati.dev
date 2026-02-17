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
  const args = [...provider.baseArgs];

  if (config.model) {
    const resolvedModel = provider.modelMap[config.model] || config.model;
    args.push(provider.modelFlag, resolvedModel);
  }

  return {
    command: provider.command,
    args,
    stdinPrompt: config.prompt || null,
  };
}
