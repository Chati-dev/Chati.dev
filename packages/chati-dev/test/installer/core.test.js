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

describe('installFramework with gemini-cli', () => {
  let tempDir;
  const geminiConfig = {
    projectName: 'gemini-project',
    projectType: 'greenfield',
    language: 'pt',
    selectedIDEs: ['claude-code', 'gemini-cli'],
    selectedMCPs: [],
    version: '3.0.1',
    llmProvider: 'claude',
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

  it('creates .claude/ alongside .gemini/', () => {
    assert.ok(existsSync(join(tempDir, '.claude', 'commands', 'chati.md')));
    assert.ok(existsSync(join(tempDir, '.gemini', 'commands', 'chati.toml')));
  });

  it('enables gemini provider in config.yaml', () => {
    const configPath = join(tempDir, 'chati.dev', 'config.yaml');
    const content = readFileSync(configPath, 'utf-8');
    assert.ok(content.includes('gemini'));
  });
});

// ---------------------------------------------------------------------------
// Multi-CLI provider directory tests — GitHub Copilot (agents/ format)
// ---------------------------------------------------------------------------

describe('installFramework with github-copilot', () => {
  let tempDir;
  const copilotConfig = {
    projectName: 'copilot-project',
    projectType: 'brownfield',
    language: 'en',
    selectedIDEs: ['claude-code', 'github-copilot'],
    selectedMCPs: [],
    version: '3.0.1',
    llmProvider: 'claude',
  };

  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'chati-copilot-'));
    copilotConfig.targetDir = tempDir;
    await installFramework(copilotConfig);
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates .github/agents/ directory', () => {
    assert.ok(existsSync(join(tempDir, '.github', 'agents')));
  });

  it('creates .github/agents/chati.md agent file', () => {
    const agentPath = join(tempDir, '.github', 'agents', 'chati.md');
    assert.ok(existsSync(agentPath), 'Should create agent file');
    const content = readFileSync(agentPath, 'utf-8');
    assert.ok(content.includes('GitHub Copilot'), 'Should reference Copilot');
    assert.ok(content.includes('orchestrator'), 'Should reference orchestrator');
  });

  it('creates .github/copilot-instructions.md', () => {
    const instrPath = join(tempDir, '.github', 'copilot-instructions.md');
    assert.ok(existsSync(instrPath));
    const content = readFileSync(instrPath, 'utf-8');
    assert.ok(content.includes('Chati.dev'));
    assert.ok(content.includes('19 Articles'));
  });

  it('does NOT create .github/commands/ directory (not native to Copilot)', () => {
    assert.ok(!existsSync(join(tempDir, '.github', 'commands')),
      'Should NOT create commands/ (Copilot uses agents/)');
  });

  it('does NOT create .github/copilot/rules/ directory (not native to Copilot)', () => {
    assert.ok(!existsSync(join(tempDir, '.github', 'copilot', 'rules')),
      'Should NOT create copilot/rules/ (not a Copilot concept)');
  });

  it('does NOT generate COPILOT.md (Copilot reads AGENTS.md natively)', () => {
    assert.ok(!existsSync(join(tempDir, 'COPILOT.md')),
      'Should NOT generate COPILOT.md (Copilot reads AGENTS.md + CLAUDE.md + GEMINI.md)');
  });

  it('creates .claude/ alongside .github/', () => {
    assert.ok(existsSync(join(tempDir, '.claude', 'commands', 'chati.md')));
    assert.ok(existsSync(join(tempDir, '.github', 'agents', 'chati.md')));
  });

  it('enables copilot provider in config.yaml', () => {
    const configPath = join(tempDir, 'chati.dev', 'config.yaml');
    const content = readFileSync(configPath, 'utf-8');
    assert.ok(content.includes('copilot'));
  });
});
