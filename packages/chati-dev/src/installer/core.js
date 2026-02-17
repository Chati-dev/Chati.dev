import { mkdirSync, writeFileSync, copyFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { IDE_CONFIGS } from '../config/ide-configs.js';
import { generateClaudeMCPConfig } from '../config/mcp-configs.js';
import { generateSessionYaml, generateConfigYaml, generateClaudeMd, generateClaudeLocalMd } from './templates.js';
import { verifyManifest } from './manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// When published to npm: framework files are bundled at packages/chati-dev/framework/
// When developing locally in monorepo: fallback to monorepo root chati.dev/
const BUNDLED_SOURCE = join(__dirname, '..', '..', 'framework');
const MONOREPO_SOURCE = join(__dirname, '..', '..', '..', '..', 'chati.dev');
const FRAMEWORK_SOURCE = existsSync(BUNDLED_SOURCE) ? BUNDLED_SOURCE : MONOREPO_SOURCE;

/**
 * Install Chati.dev framework into target directory
 */
export async function installFramework(config) {
  const { targetDir, projectType, language, selectedIDEs, selectedMCPs, projectName, version } = config;

  // 0. Verify framework signature (supply chain protection)
  const manifestPath = join(FRAMEWORK_SOURCE, 'manifest.json');
  const sigPath = join(FRAMEWORK_SOURCE, 'manifest.sig');

  if (existsSync(manifestPath) && existsSync(sigPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const signature = readFileSync(sigPath, 'utf-8').trim();
    const result = verifyManifest(manifest, signature);

    if (!result.valid && result.reason === 'signature-mismatch') {
      throw new Error('Framework signature verification failed. Package may have been tampered with.');
    }
  }

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
    'agents/discover', 'agents/plan', 'agents/quality', 'agents/build', 'agents/deploy',
    'templates', 'workflows', 'quality-gates',
    'schemas', 'frameworks', 'intelligence', 'patterns',
    'hooks', 'domains', 'domains/agents', 'domains/workflows',
    'i18n', 'migrations', 'data', 'context',
    'artifacts/0-WU', 'artifacts/1-Brief', 'artifacts/2-PRD',
    'artifacts/3-Architecture', 'artifacts/4-UX', 'artifacts/5-Phases',
    'artifacts/6-Tasks', 'artifacts/7-QA-Planning', 'artifacts/8-Validation',
    'artifacts/handoffs', 'artifacts/decisions',
  ];

  for (const dir of frameworkDirs) {
    createDir(join(frameworkDir, dir));
  }

  // Create .chati/memories/ directory tree for Memory Layer
  const memoriesBase = join(targetDir, '.chati', 'memories');
  const memoryDirs = [
    'shared/durable', 'shared/daily', 'shared/session',
    'greenfield-wu/durable', 'greenfield-wu/daily',
    'brownfield-wu/durable', 'brownfield-wu/daily',
    'brief/durable', 'brief/daily',
    'detail/durable', 'detail/daily',
    'architect/durable', 'architect/daily',
    'ux/durable', 'ux/daily',
    'phases/durable', 'phases/daily',
    'tasks/durable', 'tasks/daily',
    'qa-planning/durable', 'qa-planning/daily',
    'qa-implementation/durable', 'qa-implementation/daily',
    'dev/durable', 'dev/daily',
    'devops/durable', 'devops/daily',
  ];
  for (const dir of memoryDirs) {
    createDir(join(memoriesBase, dir));
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

  // 4. Copy context files to .claude/rules/chati/ (auto-loaded by Claude Code)
  const rulesDir = join(targetDir, '.claude', 'rules', 'chati');
  createDir(rulesDir);
  const contextFiles = ['root.md', 'governance.md', 'protocols.md', 'quality.md'];
  for (const file of contextFiles) {
    const src = join(FRAMEWORK_SOURCE, 'context', file);
    if (existsSync(src)) {
      copyFileSync(src, join(rulesDir, file));
    }
  }

  // 5. Create CLAUDE.md (minimal — framework rules auto-loaded from .claude/rules/chati/)
  writeFileSync(
    join(targetDir, 'CLAUDE.md'),
    generateClaudeMd({ projectName, projectType, language }),
    'utf-8'
  );

  // 6. Create CLAUDE.local.md (runtime state — session lock, current agent)
  writeFileSync(
    join(targetDir, 'CLAUDE.local.md'),
    generateClaudeLocalMd(),
    'utf-8'
  );
}

/**
 * Copy framework files from the Chati.dev source directory
 */
function copyFrameworkFiles(destDir) {
  if (!existsSync(FRAMEWORK_SOURCE)) return;

  const filesToCopy = [
    'constitution.md',
    'orchestrator/chati.md',
    // DISCOVER agents
    'agents/discover/greenfield-wu.md',
    'agents/discover/brownfield-wu.md',
    'agents/discover/brief.md',
    // PLAN agents
    'agents/plan/detail.md',
    'agents/plan/architect.md',
    'agents/plan/ux.md',
    'agents/plan/phases.md',
    'agents/plan/tasks.md',
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
    'schemas/context.schema.json',
    'schemas/memory.schema.json',
    // Frameworks
    'frameworks/quality-dimensions.yaml',
    'frameworks/decision-heuristics.yaml',
    // Intelligence
    'intelligence/gotchas.yaml',
    'intelligence/patterns.yaml',
    'intelligence/confidence.yaml',
    'intelligence/context-engine.md',
    'intelligence/memory-layer.md',
    'intelligence/decision-engine.md',
    // Patterns
    'patterns/elicitation.md',
    // Hooks
    'hooks/prism-engine.js',
    'hooks/mode-governance.js',
    'hooks/constitution-guard.js',
    'hooks/session-digest.js',
    'hooks/model-governance.js',
    'hooks/settings.json',
    // Domains (PRISM Context Engine)
    'domains/constitution.yaml',
    'domains/global.yaml',
    'domains/agents/orchestrator.yaml',
    'domains/agents/greenfield-wu.yaml',
    'domains/agents/brownfield-wu.yaml',
    'domains/agents/brief.yaml',
    'domains/agents/detail.yaml',
    'domains/agents/architect.yaml',
    'domains/agents/ux.yaml',
    'domains/agents/phases.yaml',
    'domains/agents/tasks.yaml',
    'domains/agents/qa-planning.yaml',
    'domains/agents/qa-implementation.yaml',
    'domains/agents/dev.yaml',
    'domains/agents/devops.yaml',
    'domains/workflows/greenfield-fullstack.yaml',
    'domains/workflows/brownfield-fullstack.yaml',
    'domains/workflows/brownfield-discovery.yaml',
    'domains/workflows/brownfield-service.yaml',
    'domains/workflows/brownfield-ui.yaml',
    // i18n
    'i18n/en.yaml',
    'i18n/pt.yaml',
    'i18n/es.yaml',
    'i18n/fr.yaml',
    // Migrations
    'migrations/v1.0-to-v1.1.yaml',
    // Data
    'data/entity-registry.yaml',
    // Context (@ import chain for CLAUDE.md)
    'context/root.md',
    'context/governance.md',
    'context/protocols.md',
    'context/quality.md',
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
    const routerContent = `# /chati — Thin Router

## CRITICAL — Language Override

Read \`.chati/session.yaml\` field \`language\` BEFORE anything else.
ALL responses MUST be in this language. This overrides any global IDE language setting.

| Value | Language |
|-------|----------|
| \`en\`  | English |
| \`pt\`  | Portugues |
| \`es\`  | Espanol |
| \`fr\`  | Francais |

If session.yaml does not exist or has no language field, default to English.

---

## Load

Read and execute the full orchestrator at \`chati.dev/orchestrator/chati.md\`.

Pass through all context: session state, handoffs, artifacts, and user input.

**Context to pass:**
- \`.chati/session.yaml\` (session state — includes language)
- \`CLAUDE.local.md\` (runtime state — session lock, current agent)
- \`chati.dev/artifacts/handoffs/\` (latest handoff)
- \`chati.dev/config.yaml\` (version info)

**User input:** $ARGUMENTS
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
    const rulesContent = `# Chati.dev System Rules
# This file configures ${config.name} to work with Chati.dev

## System Location
All system content is in the \`chati.dev/\` directory.

## Session State
Runtime session state is in \`.chati/session.yaml\` (IDE-agnostic).

## Getting Started
The orchestrator is at \`chati.dev/orchestrator/chati.md\`.
Read it to understand routing, session management, and agent activation.

## Constitution
Governance rules are in \`chati.dev/constitution.md\` (17 Articles).

## Agents
- DISCOVER: chati.dev/agents/discover/ (3 agents)
- PLAN: chati.dev/agents/plan/ (5 agents)
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
