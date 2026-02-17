#!/usr/bin/env node

/**
 * IDE Sync — Synchronizes agent files to IDE-specific locations.
 *
 * Exports:
 *   IDE_CONFIGS — Map of IDE names to their config.
 *   syncToIDE(targetDir, frameworkDir, ideName) → { synced: number, files: [] }
 *   syncAllIDEs(targetDir, frameworkDir, installedIDEs) → { results: { ide: syncResult } }
 *   detectInstalledIDEs(targetDir) → string[]
 *   buildIDEContent(agentContent, format, agentName) → transformed content
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, basename, relative } from 'path';

/**
 * IDE configuration definitions.
 */
export const IDE_CONFIGS = {
  'claude-code': {
    commandDir: '.claude/commands/',
    extension: '.md',
    format: 'markdown',
    description: 'Claude Code (Anthropic)',
  },
  cursor: {
    rulesDir: '.cursor/rules/',
    extension: '.mdc',
    format: 'cursor-rules',
    description: 'Cursor',
  },
  windsurf: {
    rulesDir: '.windsurf/rules/',
    extension: '.md',
    format: 'markdown',
    description: 'Windsurf',
  },
  vscode: {
    configDir: '.vscode/',
    extension: '.md',
    format: 'markdown',
    description: 'Visual Studio Code',
  },
  antigravity: {
    agentsDir: '.antigravity/agents/',
    extension: '.md',
    format: 'markdown',
    description: 'AntiGravity',
  },
  'gemini-cli': {
    commandDir: '.gemini/commands/',
    extension: '.toml',
    format: 'toml',
    description: 'Gemini CLI',
  },
  'github-copilot': {
    agentsDir: '.github/agents/',
    extension: '.md',
    format: 'markdown',
    description: 'GitHub Copilot',
  },
};

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Collect all agent .md files from the framework directory.
 * @param {string} frameworkDir - Path to the framework directory.
 * @returns {object[]} Array of { name, path, content }.
 */
function collectAgentFiles(frameworkDir) {
  const agents = [];

  // Collect agents from subdirectories
  const agentsDir = join(frameworkDir, 'agents');
  if (existsSync(agentsDir)) {
    const categories = readdirSync(agentsDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);

    for (const category of categories) {
      const catDir = join(agentsDir, category);
      try {
        const files = readdirSync(catDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
          const fullPath = join(catDir, file);
          agents.push({
            name: basename(file, '.md'),
            path: fullPath,
            content: readFileSync(fullPath, 'utf8'),
            category,
          });
        }
      } catch {
        // Skip unreadable directories
      }
    }
  }

  // Collect orchestrator
  const orchPath = join(frameworkDir, 'orchestrator', 'chati.md');
  if (existsSync(orchPath)) {
    agents.push({
      name: 'chati',
      path: orchPath,
      content: readFileSync(orchPath, 'utf8'),
      category: 'orchestrator',
    });
  }

  return agents;
}

/**
 * Get the target directory path for a specific IDE.
 * @param {string} targetDir - Project root directory.
 * @param {string} ideName - IDE identifier.
 * @returns {string} Target directory for sync.
 */
function getIDETargetDir(targetDir, ideName) {
  const config = IDE_CONFIGS[ideName];
  if (!config) return null;

  // Pick the first defined directory key
  const dirKey = config.commandDir || config.rulesDir || config.configDir
    || config.agentsDir || config.instructionsDir;

  return join(targetDir, dirKey);
}

/**
 * Transform agent markdown content for a specific IDE format.
 * @param {string} agentContent - Raw agent markdown content.
 * @param {string} format - Target format ('markdown' | 'cursor-rules').
 * @param {string} agentName - Agent name for metadata.
 * @returns {string} Transformed content.
 */
export function buildIDEContent(agentContent, format, agentName = '') {
  switch (format) {
    case 'cursor-rules': {
      // Cursor uses .mdc format with YAML-like frontmatter
      const lines = [
        '---',
        `description: chati.dev agent — ${agentName}`,
        'globs:',
        'alwaysApply: false',
        '---',
        '',
        agentContent,
      ];
      return lines.join('\n');
    }

    case 'toml': {
      // Gemini CLI uses TOML format for commands
      return `description = "chati.dev agent — ${agentName}"\n\nprompt = """\n${agentContent}\n"""\n`;
    }

    case 'markdown':
    default:
      return agentContent;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect which IDEs have existing config directories in the project.
 * @param {string} targetDir - Project root directory.
 * @returns {string[]} Array of detected IDE names.
 */
export function detectInstalledIDEs(targetDir) {
  const detected = [];

  for (const [ideName, config] of Object.entries(IDE_CONFIGS)) {
    const dirKey = config.commandDir || config.rulesDir || config.configDir
      || config.agentsDir || config.instructionsDir;
    const checkDir = dirKey.split('/')[0]; // Check first directory component

    if (existsSync(join(targetDir, checkDir))) {
      detected.push(ideName);
    }
  }

  return detected;
}

/**
 * Sync agent files to a specific IDE's location.
 * @param {string} targetDir - Project root directory.
 * @param {string} frameworkDir - Path to the framework directory.
 * @param {string} ideName - IDE identifier.
 * @returns {{ synced: number, files: string[], errors: string[] }}
 */
export function syncToIDE(targetDir, frameworkDir, ideName) {
  const config = IDE_CONFIGS[ideName];
  if (!config) {
    return { synced: 0, files: [], errors: [`Unknown IDE: ${ideName}`] };
  }

  const result = { synced: 0, files: [], errors: [] };

  const ideTargetDir = getIDETargetDir(targetDir, ideName);
  if (!ideTargetDir) {
    result.errors.push(`Cannot determine target directory for ${ideName}`);
    return result;
  }

  // Collect agent files
  const agents = collectAgentFiles(frameworkDir);
  if (agents.length === 0) {
    result.errors.push('No agent files found in framework directory');
    return result;
  }

  // Create target directory
  mkdirSync(ideTargetDir, { recursive: true });

  // Sync each agent
  for (const agent of agents) {
    const targetFileName = `${agent.name}${config.extension}`;
    const targetPath = join(ideTargetDir, targetFileName);

    try {
      const content = buildIDEContent(agent.content, config.format, agent.name);
      writeFileSync(targetPath, content, 'utf8');
      result.synced++;
      result.files.push(relative(targetDir, targetPath));
    } catch (err) {
      result.errors.push(`Failed to write ${targetFileName}: ${err.message}`);
    }
  }

  return result;
}

/**
 * Sync agent files to all specified IDEs.
 * @param {string} targetDir - Project root directory.
 * @param {string} frameworkDir - Path to the framework directory.
 * @param {string[]} installedIDEs - List of IDE names to sync to.
 * @returns {{ results: object, totalSynced: number, totalErrors: number }}
 */
export function syncAllIDEs(targetDir, frameworkDir, installedIDEs) {
  const results = {};
  let totalSynced = 0;
  let totalErrors = 0;

  for (const ide of installedIDEs) {
    const result = syncToIDE(targetDir, frameworkDir, ide);
    results[ide] = result;
    totalSynced += result.synced;
    totalErrors += result.errors.length;
  }

  return { results, totalSynced, totalErrors };
}

/**
 * Format sync results as a human-readable string.
 * @param {object} syncResults - Results from syncAllIDEs.
 * @returns {string}
 */
export function formatSyncReport(syncResults) {
  const lines = [
    '=== IDE Sync Report ===',
    `Total synced: ${syncResults.totalSynced} files`,
    `Total errors: ${syncResults.totalErrors}`,
    '',
  ];

  for (const [ide, result] of Object.entries(syncResults.results)) {
    const config = IDE_CONFIGS[ide];
    const desc = config?.description || ide;
    const symbol = result.errors.length === 0 ? '[OK]' : '[WARN]';

    lines.push(`  ${symbol} ${desc}: ${result.synced} files synced`);
    for (const file of result.files) {
      lines.push(`        ${file}`);
    }
    for (const err of result.errors) {
      lines.push(`        ERROR: ${err}`);
    }
  }

  lines.push('');
  lines.push('=== End Report ===');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('ide-sync.js') ||
  process.argv[1].endsWith('ide-sync')
);

if (isMainModule) {
  const targetDir = process.argv[2] || process.cwd();
  const frameworkDir = process.argv[3] || join(targetDir, 'chati.dev');
  const specificIDE = process.argv[4];

  if (specificIDE) {
    console.log(`Syncing to ${specificIDE}...`);
    const result = syncToIDE(targetDir, frameworkDir, specificIDE);
    console.log(`Synced: ${result.synced} files`);
    for (const file of result.files) console.log(`  ${file}`);
    if (result.errors.length > 0) {
      for (const err of result.errors) console.log(`  ERROR: ${err}`);
    }
  } else {
    console.log('Detecting installed IDEs...');
    const detected = detectInstalledIDEs(targetDir);

    if (detected.length === 0) {
      console.log('No IDE configurations detected. Specify IDE: node scripts/ide-sync.js <targetDir> <frameworkDir> <ideName>');
      console.log(`Available: ${Object.keys(IDE_CONFIGS).join(', ')}`);
      process.exit(0);
    }

    console.log(`Detected: ${detected.join(', ')}`);
    const results = syncAllIDEs(targetDir, frameworkDir, detected);
    console.log(formatSyncReport(results));
  }
}
