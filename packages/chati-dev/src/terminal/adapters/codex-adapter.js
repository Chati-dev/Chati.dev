/**
 * @fileoverview OpenAI Codex CLI adapter.
 *
 * Translates chati.dev spawning config into Codex CLI
 * command, arguments, and environment variables.
 */

/**
 * Build Codex CLI command and arguments.
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

  // Codex exec reads prompt from stdin when `-` is passed
  args.push('-');

  return {
    command: provider.command,
    args,
    stdinPrompt: config.prompt || null,
  };
}
