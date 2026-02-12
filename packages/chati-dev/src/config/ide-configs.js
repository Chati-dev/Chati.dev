/**
 * IDE Configuration Mapping (6 IDEs)
 * Defines where chati.dev agents are deployed per IDE
 */
export const IDE_CONFIGS = {
  'claude-code': {
    name: 'Claude Code',
    description: 'Anthropic official CLI',
    recommended: true,
    configPath: '.claude/commands/',
    rulesFile: '.claude/CLAUDE.md',
    mcpConfigFile: '.claude/mcp.json',
    formatNotes: 'Native markdown format',
  },
  'vscode': {
    name: 'VS Code',
    description: 'Extensions: Continue, Copilot Chat, etc',
    recommended: false,
    configPath: '.vscode/chati/',
    rulesFile: '.vscode/chati/rules.md',
    mcpConfigFile: null,
    formatNotes: 'Markdown with VS Code extension support',
  },
  'antigravity': {
    name: 'AntiGravity',
    description: 'Google agentic development platform',
    recommended: false,
    configPath: '.antigravity/agents/',
    rulesFile: '.antigravity/rules.md',
    mcpConfigFile: null,
    formatNotes: 'Google platform format',
  },
  'cursor': {
    name: 'Cursor',
    description: 'AI-first code editor',
    recommended: false,
    configPath: '.cursor/rules/',
    rulesFile: '.cursorrules',
    mcpConfigFile: null,
    formatNotes: 'Cursor rules format',
  },
  'gemini-cli': {
    name: 'Gemini CLI',
    description: 'Google AI for development',
    recommended: false,
    configPath: '.gemini/agents/',
    rulesFile: '.gemini/instructions.md',
    mcpConfigFile: null,
    formatNotes: 'Gemini agent format',
  },
  'github-copilot': {
    name: 'GitHub Copilot',
    description: 'GitHub AI pair programmer',
    recommended: false,
    configPath: '.github/agents/',
    rulesFile: '.github/copilot-instructions.md',
    mcpConfigFile: null,
    formatNotes: 'GitHub Copilot format',
  },
};

/**
 * Get list of IDEs for selection prompt
 */
export function getIDEChoices() {
  return Object.entries(IDE_CONFIGS).map(([key, config]) => ({
    value: key,
    label: `${config.name}${config.recommended ? ' (Recommended)' : ''}`,
    hint: config.description,
  }));
}
