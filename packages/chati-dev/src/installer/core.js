import { mkdirSync, writeFileSync, copyFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { IDE_CONFIGS } from '../config/ide-configs.js';
import { generateClaudeMCPConfig } from '../config/mcp-configs.js';
import { generateSessionYaml, generateConfigYaml, generateClaudeMd } from './templates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// When published to npm: framework files are bundled at packages/chati-dev/framework/
// When developing locally in monorepo: fallback to monorepo root chati.dev/
const BUNDLED_SOURCE = join(__dirname, '..', '..', 'framework');
const MONOREPO_SOURCE = join(__dirname, '..', '..', '..', '..', 'chati.dev');
const FRAMEWORK_SOURCE = existsSync(BUNDLED_SOURCE) ? BUNDLED_SOURCE : MONOREPO_SOURCE;

/**
 * Install chati.dev framework into target directory
 */
export async function installFramework(config) {
  const { targetDir, projectType, language, selectedIDEs, selectedMCPs, projectName, version } = config;

  // 1. Create .chati/ session directory
  createDir(join(targetDir, '.chati'));
  writeFileSync(
    join(targetDir, '.chati', 'session.yaml'),
    generateSessionYaml({ projectName, projectType, language, selectedIDEs, selectedMCPs }),
    'utf-8'
  );

  // 2. Create chati.dev/ framework directory (copy from source)
  const frameworkDir = join(targetDir, 'chati.dev');
  createDir(frameworkDir);

  // Copy framework structure
  const frameworkDirs = [
    'orchestrator',
    'agents/clarity', 'agents/quality', 'agents/build', 'agents/deploy',
    'templates', 'workflows', 'quality-gates',
    'schemas', 'frameworks', 'intelligence', 'patterns',
    'i18n', 'migrations',
    'artifacts/0-WU', 'artifacts/1-Brief', 'artifacts/2-PRD',
    'artifacts/3-Architecture', 'artifacts/4-UX', 'artifacts/5-Phases',
    'artifacts/6-Tasks', 'artifacts/7-QA-Planning', 'artifacts/8-Validation',
    'artifacts/handoffs', 'artifacts/decisions',
  ];

  for (const dir of frameworkDirs) {
    createDir(join(frameworkDir, dir));
  }

  // Copy framework files from source
  copyFrameworkFiles(frameworkDir);

  // Write config.yaml
  writeFileSync(
    join(frameworkDir, 'config.yaml'),
    generateConfigYaml({ version, projectType, language, selectedIDEs }),
    'utf-8'
  );

  // 3. Configure IDEs
  for (const ideKey of selectedIDEs) {
    await configureIDE(targetDir, ideKey, selectedMCPs);
  }

  // 4. Create/update CLAUDE.md at root
  writeFileSync(
    join(targetDir, 'CLAUDE.md'),
    generateClaudeMd({ projectName, projectType, language }),
    'utf-8'
  );
}

/**
 * Copy framework files from the chati.dev source directory
 */
function copyFrameworkFiles(destDir) {
  if (!existsSync(FRAMEWORK_SOURCE)) return;

  const filesToCopy = [
    'constitution.md',
    'orchestrator/chati.md',
    // CLARITY agents
    'agents/clarity/greenfield-wu.md',
    'agents/clarity/brownfield-wu.md',
    'agents/clarity/brief.md',
    'agents/clarity/detail.md',
    'agents/clarity/architect.md',
    'agents/clarity/ux.md',
    'agents/clarity/phases.md',
    'agents/clarity/tasks.md',
    // Quality agents
    'agents/quality/qa-planning.md',
    'agents/quality/qa-implementation.md',
    // BUILD + DEPLOY agents
    'agents/build/dev.md',
    'agents/deploy/devops.md',
    // Templates
    'templates/prd-tmpl.yaml',
    'templates/brownfield-prd-tmpl.yaml',
    'templates/fullstack-architecture-tmpl.yaml',
    'templates/task-tmpl.yaml',
    'templates/qa-gate-tmpl.yaml',
    // Workflows
    'workflows/greenfield-fullstack.yaml',
    'workflows/brownfield-fullstack.yaml',
    'workflows/brownfield-discovery.yaml',
    'workflows/brownfield-service.yaml',
    'workflows/brownfield-ui.yaml',
    // Quality gates
    'quality-gates/planning-gate.md',
    'quality-gates/implementation-gate.md',
    // Schemas
    'schemas/session.schema.json',
    'schemas/config.schema.json',
    'schemas/task.schema.json',
    // Frameworks
    'frameworks/quality-dimensions.yaml',
    'frameworks/decision-heuristics.yaml',
    // Intelligence
    'intelligence/gotchas.yaml',
    'intelligence/patterns.yaml',
    'intelligence/confidence.yaml',
    // Patterns
    'patterns/elicitation.md',
    // i18n
    'i18n/en.yaml',
    'i18n/pt.yaml',
    'i18n/es.yaml',
    'i18n/fr.yaml',
    // Migrations
    'migrations/v1.0-to-v1.1.yaml',
  ];

  for (const file of filesToCopy) {
    const src = join(FRAMEWORK_SOURCE, file);
    const dest = join(destDir, file);

    if (existsSync(src)) {
      createDir(dirname(dest));
      copyFileSync(src, dest);
    }
  }
}

/**
 * Configure a specific IDE
 */
async function configureIDE(targetDir, ideKey, selectedMCPs) {
  const config = IDE_CONFIGS[ideKey];
  if (!config) return;

  // Create config directory
  createDir(join(targetDir, config.configPath));

  if (ideKey === 'claude-code') {
    // Thin router
    const routerContent = `---
# chati.dev Thin Router
# This file delegates to the full orchestrator at chati.dev/orchestrator/chati.md
# DO NOT add logic here -- pure delegation only
---

Read and execute the orchestrator at \`chati.dev/orchestrator/chati.md\`.

Pass through all context: session (.chati/session.yaml), handoffs (chati.dev/artifacts/handoffs/),
artifacts (chati.dev/artifacts/), constitution (chati.dev/constitution.md).

This is a thin router. All logic lives in the orchestrator.
`;
    writeFileSync(join(targetDir, '.claude', 'commands', 'chati.md'), routerContent, 'utf-8');

    // MCP config
    if (selectedMCPs.length > 0) {
      const mcpConfig = generateClaudeMCPConfig(selectedMCPs);
      writeFileSync(
        join(targetDir, '.claude', 'mcp.json'),
        JSON.stringify(mcpConfig, null, 2) + '\n',
        'utf-8'
      );
    }
  } else {
    // For other IDEs, create a rules file pointing to chati.dev/
    const rulesContent = `# chati.dev Framework Rules
# This file configures ${config.name} to work with chati.dev

## Framework Location
All framework content is in the \`chati.dev/\` directory.

## Session State
Runtime session state is in \`.chati/session.yaml\` (IDE-agnostic).

## Getting Started
The orchestrator is at \`chati.dev/orchestrator/chati.md\`.
Read it to understand routing, session management, and agent activation.

## Constitution
Governance rules are in \`chati.dev/constitution.md\` (10 Articles).

## Agents
- CLARITY: chati.dev/agents/clarity/ (8 agents)
- Quality: chati.dev/agents/quality/ (2 agents)
- BUILD: chati.dev/agents/build/ (1 agent)
- DEPLOY: chati.dev/agents/deploy/ (1 agent)
`;
    if (config.rulesFile) {
      createDir(dirname(join(targetDir, config.rulesFile)));
      writeFileSync(join(targetDir, config.rulesFile), rulesContent, 'utf-8');
    }
  }
}

/**
 * Recursively create directory if it doesn't exist
 */
function createDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
