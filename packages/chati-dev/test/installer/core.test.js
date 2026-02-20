import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { installFramework } from '../../src/installer/core.js';

describe('installFramework', () => {
  let tempDir;
  const testConfig = {
    projectName: 'test-project',
    projectType: 'greenfield',
    language: 'en',
    selectedIDEs: ['claude-code'],
    selectedMCPs: [],
    version: '1.3.0',
  };

  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'chati-core-'));
    testConfig.targetDir = tempDir;
    await installFramework(testConfig);
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates .chati/ directory', () => {
    assert.ok(existsSync(join(tempDir, '.chati')));
  });

  it('creates session.yaml', () => {
    assert.ok(existsSync(join(tempDir, '.chati', 'session.yaml')));
  });

  it('creates chati.dev/ framework directory', () => {
    assert.ok(existsSync(join(tempDir, 'chati.dev')));
  });

  it('creates data/ directory', () => {
    assert.ok(existsSync(join(tempDir, 'chati.dev', 'data')));
  });

  it('creates .chati/memories/ directory tree', () => {
    assert.ok(existsSync(join(tempDir, '.chati', 'memories')));
    assert.ok(existsSync(join(tempDir, '.chati', 'memories', 'shared', 'durable')));
    assert.ok(existsSync(join(tempDir, '.chati', 'memories', 'shared', 'daily')));
    assert.ok(existsSync(join(tempDir, '.chati', 'memories', 'shared', 'session')));
  });

  it('creates per-agent memory directories', () => {
    const agents = ['greenfield-wu', 'brownfield-wu', 'brief', 'detail', 'architect',
      'ux', 'phases', 'tasks', 'qa-planning', 'qa-implementation', 'dev', 'devops'];
    for (const agent of agents) {
      assert.ok(
        existsSync(join(tempDir, '.chati', 'memories', agent, 'durable')),
        `${agent}/durable should exist`
      );
      assert.ok(
        existsSync(join(tempDir, '.chati', 'memories', agent, 'daily')),
        `${agent}/daily should exist`
      );
    }
  });

  it('creates CLAUDE.md at root', () => {
    assert.ok(existsSync(join(tempDir, 'CLAUDE.md')));
  });

  it('creates config.yaml with version', () => {
    const configPath = join(tempDir, 'chati.dev', 'config.yaml');
    assert.ok(existsSync(configPath));
    const content = readFileSync(configPath, 'utf-8');
    assert.ok(content.includes('1.3.0'));
  });

  it('creates artifact directories', () => {
    assert.ok(existsSync(join(tempDir, 'chati.dev', 'artifacts', '0-WU')));
    assert.ok(existsSync(join(tempDir, 'chati.dev', 'artifacts', 'handoffs')));
    assert.ok(existsSync(join(tempDir, 'chati.dev', 'artifacts', 'decisions')));
  });

  it('creates claude-code thin router', () => {
    const routerPath = join(tempDir, '.claude', 'commands', 'chati.md');
    assert.ok(existsSync(routerPath));
    const content = readFileSync(routerPath, 'utf-8');
    assert.ok(content.includes('Thin Router'));
  });
});

// ---------------------------------------------------------------------------
// Multi-CLI provider directory tests — Gemini CLI (TOML format)
// ---------------------------------------------------------------------------

describe('installFramework with gemini-cli (standalone)', () => {
  let tempDir;
  const geminiConfig = {
    projectName: 'gemini-project',
    projectType: 'greenfield',
    language: 'pt',
    selectedIDEs: ['gemini-cli'],
    selectedMCPs: [],
    version: '3.0.1',
    llmProvider: 'gemini',
  };

  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'chati-gemini-'));
    geminiConfig.targetDir = tempDir;
    await installFramework(geminiConfig);
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates .gemini/commands/ directory', () => {
    assert.ok(existsSync(join(tempDir, '.gemini', 'commands')));
  });

  it('creates .gemini/commands/chati.toml (TOML format)', () => {
    const routerPath = join(tempDir, '.gemini', 'commands', 'chati.toml');
    assert.ok(existsSync(routerPath), 'Should create chati.toml');
    const content = readFileSync(routerPath, 'utf-8');
    assert.ok(content.includes('description ='), 'Should have TOML description');
    assert.ok(content.includes('prompt ='), 'Should have TOML prompt');
    assert.ok(content.includes('orchestrator'), 'Should reference orchestrator');
  });

  it('does NOT create .gemini/commands/chati.md (wrong format)', () => {
    assert.ok(!existsSync(join(tempDir, '.gemini', 'commands', 'chati.md')),
      'Should NOT create markdown command (Gemini uses TOML)');
  });

  it('does NOT create .gemini/instructions.md (not a Gemini concept)', () => {
    assert.ok(!existsSync(join(tempDir, '.gemini', 'instructions.md')),
      'Should NOT create instructions.md (Gemini uses GEMINI.md)');
  });

  it('does NOT create .gemini/rules/ directory (not native to Gemini)', () => {
    assert.ok(!existsSync(join(tempDir, '.gemini', 'rules')),
      'Should NOT create rules/ (not a Gemini CLI concept)');
  });

  it('does NOT create .claude/ when Claude is not selected', () => {
    assert.ok(!existsSync(join(tempDir, '.claude')),
      'Should NOT create .claude/ when only gemini-cli is selected');
  });

  it('does NOT create CLAUDE.md when Claude is not selected', () => {
    assert.ok(!existsSync(join(tempDir, 'CLAUDE.md')),
      'Should NOT create CLAUDE.md when only gemini-cli is selected');
  });

  it('enables gemini provider in config.yaml', () => {
    const configPath = join(tempDir, 'chati.dev', 'config.yaml');
    const content = readFileSync(configPath, 'utf-8');
    assert.ok(content.includes('gemini'));
  });

  it('adapts orchestrator for Gemini (no CLAUDE.md references)', () => {
    const orchPath = join(tempDir, 'chati.dev', 'orchestrator', 'chati.md');
    if (!existsSync(orchPath)) return;
    const content = readFileSync(orchPath, 'utf-8');
    assert.ok(!content.includes('CLAUDE.md'), 'Orchestrator should not reference CLAUDE.md');
    assert.ok(!content.includes('CLAUDE.local.md'), 'Orchestrator should not reference CLAUDE.local.md');
    assert.ok(content.includes('GEMINI.md'), 'Should reference GEMINI.md');
    assert.ok(content.includes('Gemini CLI'), 'Should reference Gemini CLI');
  });

  it('adapts orchestrator model names for Gemini (pro/flash, not opus/sonnet)', () => {
    const orchPath = join(tempDir, 'chati.dev', 'orchestrator', 'chati.md');
    if (!existsSync(orchPath)) return;
    const content = readFileSync(orchPath, 'utf-8');
    assert.ok(!content.includes('/model opus'), 'Should not have /model opus');
    assert.ok(!content.includes('/model sonnet'), 'Should not have /model sonnet');
    assert.ok(!content.includes('/model haiku'), 'Should not have /model haiku');
  });
});

// ---------------------------------------------------------------------------
// Multi-CLI provider directory tests — Codex CLI (standalone)
// ---------------------------------------------------------------------------

describe('installFramework with codex-cli (standalone)', () => {
  let tempDir;
  const codexConfig = {
    projectName: 'codex-project',
    projectType: 'greenfield',
    language: 'en',
    selectedIDEs: ['codex-cli'],
    selectedMCPs: [],
    version: '3.0.1',
    llmProvider: 'codex',
  };

  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'chati-codex-'));
    codexConfig.targetDir = tempDir;
    await installFramework(codexConfig);
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates .agents/skills/chati/ directory', () => {
    assert.ok(existsSync(join(tempDir, '.agents', 'skills', 'chati')));
  });

  it('creates .agents/skills/chati/SKILL.md ($chati skill)', () => {
    const skillPath = join(tempDir, '.agents', 'skills', 'chati', 'SKILL.md');
    assert.ok(existsSync(skillPath), 'Should create SKILL.md');
    const content = readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('name: chati'), 'Should have skill name in frontmatter');
    assert.ok(content.includes('description:'), 'Should have skill description');
    assert.ok(content.includes('orchestrator'), 'Should reference orchestrator');
    assert.ok(content.includes('AGENTS.md'), 'Should reference AGENTS.md');
  });

  it('does NOT create .codex/commands/ (deprecated path)', () => {
    assert.ok(!existsSync(join(tempDir, '.codex', 'commands')),
      'Should NOT create .codex/commands/ (Codex uses .agents/skills/)');
  });

  it('does NOT create .claude/ when Claude is not selected', () => {
    assert.ok(!existsSync(join(tempDir, '.claude')),
      'Should NOT create .claude/ when only codex-cli is selected');
  });

  it('does NOT create CLAUDE.md when Claude is not selected', () => {
    assert.ok(!existsSync(join(tempDir, 'CLAUDE.md')),
      'Should NOT create CLAUDE.md when only codex-cli is selected');
  });

  it('enables codex provider in config.yaml', () => {
    const configPath = join(tempDir, 'chati.dev', 'config.yaml');
    const content = readFileSync(configPath, 'utf-8');
    assert.ok(content.includes('codex'));
  });

  it('adapts orchestrator for Codex (no CLAUDE.md references)', () => {
    const orchPath = join(tempDir, 'chati.dev', 'orchestrator', 'chati.md');
    if (!existsSync(orchPath)) return; // skip if source missing
    const content = readFileSync(orchPath, 'utf-8');
    assert.ok(!content.includes('CLAUDE.md'), 'Orchestrator should not reference CLAUDE.md');
    assert.ok(!content.includes('CLAUDE.local.md'), 'Orchestrator should not reference CLAUDE.local.md');
    assert.ok(content.includes('AGENTS.md'), 'Should reference AGENTS.md');
    assert.ok(content.includes('Codex CLI'), 'Should reference Codex CLI');
  });

  it('adapts orchestrator model names for Codex (codex/mini, not opus/sonnet)', () => {
    const orchPath = join(tempDir, 'chati.dev', 'orchestrator', 'chati.md');
    if (!existsSync(orchPath)) return;
    const content = readFileSync(orchPath, 'utf-8');
    assert.ok(!content.includes('/model opus'), 'Should not have /model opus');
    assert.ok(!content.includes('/model sonnet'), 'Should not have /model sonnet');
    assert.ok(!content.includes('/model haiku'), 'Should not have /model haiku');
  });

  it('adapts agent files for Codex', () => {
    const devPath = join(tempDir, 'chati.dev', 'agents', 'build', 'dev.md');
    if (!existsSync(devPath)) return;
    const content = readFileSync(devPath, 'utf-8');
    assert.ok(!content.includes('Claude Code'), 'Agent should not reference Claude Code');
  });

  // --- CLI Parity: Codex session lock + Starlark rules ---

  it('creates AGENTS.override.md (session lock)', () => {
    assert.ok(existsSync(join(tempDir, 'AGENTS.override.md')),
      'Should create AGENTS.override.md');
    const content = readFileSync(join(tempDir, 'AGENTS.override.md'), 'utf-8');
    assert.ok(content.includes('SESSION-LOCK:INACTIVE'), 'Should have session lock marker');
    assert.ok(content.includes('$chati'), 'Should reference $chati');
  });

  it('creates .codex/rules/ with constitution-guard.rules', () => {
    const rulesPath = join(tempDir, '.codex', 'rules', 'constitution-guard.rules');
    assert.ok(existsSync(rulesPath), 'Should create constitution-guard.rules');
    const content = readFileSync(rulesPath, 'utf-8');
    assert.ok(content.includes('rm -rf'), 'Should block destructive commands');
  });

  it('creates .codex/rules/ with read-protection.rules', () => {
    const rulesPath = join(tempDir, '.codex', 'rules', 'read-protection.rules');
    assert.ok(existsSync(rulesPath), 'Should create read-protection.rules');
    const content = readFileSync(rulesPath, 'utf-8');
    assert.ok(content.includes('.env'), 'Should protect .env files');
    assert.ok(content.includes('.pem'), 'Should protect .pem files');
  });

  it('AGENTS.md includes inline governance context', () => {
    const agentsMdPath = join(tempDir, 'AGENTS.md');
    if (!existsSync(agentsMdPath)) return;
    const content = readFileSync(agentsMdPath, 'utf-8');
    // Should have inline context sections (from chati.dev/context/)
    assert.ok(content.includes('---'), 'Should have separator for inline sections');
  });

  it('AGENTS.md is under 32 KiB', () => {
    const agentsMdPath = join(tempDir, 'AGENTS.md');
    if (!existsSync(agentsMdPath)) return;
    const content = readFileSync(agentsMdPath, 'utf-8');
    const sizeKiB = Buffer.byteLength(content, 'utf-8') / 1024;
    assert.ok(sizeKiB < 32, `AGENTS.md should be under 32 KiB, got ${sizeKiB.toFixed(1)} KiB`);
  });

  it('.gitignore includes AGENTS.override.md', () => {
    const gitignorePath = join(tempDir, '.gitignore');
    if (!existsSync(gitignorePath)) return;
    const content = readFileSync(gitignorePath, 'utf-8');
    assert.ok(content.includes('AGENTS.override.md'), 'Should gitignore AGENTS.override.md');
  });
});

// ---------------------------------------------------------------------------
// CLI Parity: Gemini CLI context files, hooks, and session lock
// ---------------------------------------------------------------------------

describe('installFramework with gemini-cli — CLI Parity', () => {
  let tempDir;
  const geminiParityConfig = {
    projectName: 'gemini-parity-test',
    projectType: 'greenfield',
    language: 'en',
    selectedIDEs: ['gemini-cli'],
    selectedMCPs: [],
    version: '3.3.0',
    llmProvider: 'gemini',
  };

  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'chati-gemini-parity-'));
    geminiParityConfig.targetDir = tempDir;
    await installFramework(geminiParityConfig);
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates .gemini/context/ directory with 4 files', () => {
    const contextDir = join(tempDir, '.gemini', 'context');
    assert.ok(existsSync(contextDir), 'Should create .gemini/context/');
    const files = ['root.md', 'governance.md', 'protocols.md', 'quality.md'];
    for (const file of files) {
      assert.ok(existsSync(join(contextDir, file)), `Should create ${file}`);
    }
  });

  it('context files are adapted for Gemini (no Claude refs)', () => {
    const govPath = join(tempDir, '.gemini', 'context', 'governance.md');
    if (!existsSync(govPath)) return;
    const content = readFileSync(govPath, 'utf-8');
    assert.ok(!content.includes('CLAUDE.md'), 'Should not reference CLAUDE.md');
    assert.ok(!content.includes('CLAUDE.local.md'), 'Should not reference CLAUDE.local.md');
  });

  it('creates .gemini/session-lock.md', () => {
    const lockPath = join(tempDir, '.gemini', 'session-lock.md');
    assert.ok(existsSync(lockPath), 'Should create session-lock.md');
    const content = readFileSync(lockPath, 'utf-8');
    assert.ok(content.includes('SESSION-LOCK:INACTIVE'), 'Should have session lock marker');
  });

  it('creates .gemini/hooks/ directory with 6 JS files', () => {
    const hooksDir = join(tempDir, '.gemini', 'hooks');
    assert.ok(existsSync(hooksDir), 'Should create .gemini/hooks/');
    const expectedHooks = [
      'prism-engine.js', 'model-governance.js', 'mode-governance.js',
      'constitution-guard.js', 'read-protection.js', 'session-digest.js',
    ];
    for (const hook of expectedHooks) {
      assert.ok(existsSync(join(hooksDir, hook)), `Should create ${hook}`);
    }
  });

  it('creates .gemini/settings.json with hook config', () => {
    const settingsPath = join(tempDir, '.gemini', 'settings.json');
    assert.ok(existsSync(settingsPath), 'Should create settings.json');
    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    assert.ok(Array.isArray(content.hooks), 'Should have hooks array');
    assert.equal(content.hooks.length, 6, 'Should have 6 hooks');
  });

  it('GEMINI.md has 5 @import directives', () => {
    const geminiMdPath = join(tempDir, 'GEMINI.md');
    if (!existsSync(geminiMdPath)) return;
    const content = readFileSync(geminiMdPath, 'utf-8');
    const imports = content.match(/@import /g);
    assert.ok(imports, 'Should have @import directives');
    assert.equal(imports.length, 5, 'Should have 5 @import directives');
  });

  it('.gitignore includes .gemini/session-lock.md', () => {
    const gitignorePath = join(tempDir, '.gitignore');
    if (!existsSync(gitignorePath)) return;
    const content = readFileSync(gitignorePath, 'utf-8');
    assert.ok(content.includes('.gemini/session-lock.md'), 'Should gitignore .gemini/session-lock.md');
  });
});
