/**
 * @fileoverview Tests for terminal/cli-registry module.
 *
 * Validates provider registry structure, provider resolution logic,
 * config-based provider loading, and agent-to-provider mapping.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  getProvider,
  getAllProviders,
  loadEnabledProviders,
  resolveProviderForAgent,
  PROVIDERS,
} from '../../src/terminal/cli-registry.js';

// ---------------------------------------------------------------------------
// getProvider
// ---------------------------------------------------------------------------

describe('getProvider', () => {
  it('returns claude provider config', () => {
    const provider = getProvider('claude');
    assert.equal(provider.name, 'claude');
    assert.equal(provider.command, 'claude');
    assert.ok(provider.modelMap.opus);
    assert.ok(provider.modelMap.sonnet);
    assert.ok(provider.modelMap.haiku);
  });

  it('returns gemini provider config', () => {
    const provider = getProvider('gemini');
    assert.equal(provider.name, 'gemini');
    assert.equal(provider.command, 'gemini');
    assert.ok(provider.modelMap.pro);
    assert.ok(provider.modelMap.flash);
  });

  it('returns codex provider config', () => {
    const provider = getProvider('codex');
    assert.equal(provider.name, 'codex');
    assert.equal(provider.command, 'codex');
    assert.ok(provider.modelMap.codex);
    assert.ok(provider.modelMap.mini);
  });

  it('returns copilot provider config', () => {
    const provider = getProvider('copilot');
    assert.equal(provider.name, 'copilot');
    assert.equal(provider.command, 'copilot');
    assert.ok(provider.modelMap['claude-sonnet']);
    assert.ok(provider.modelMap['gpt-5']);
  });

  it('throws for unknown provider', () => {
    assert.throws(
      () => getProvider('unknown-provider'),
      /Unknown CLI provider: "unknown-provider"/
    );
  });
});

// ---------------------------------------------------------------------------
// getAllProviders
// ---------------------------------------------------------------------------

describe('getAllProviders', () => {
  it('returns all 4 providers', () => {
    const all = getAllProviders();
    const names = Object.keys(all);
    assert.equal(names.length, 4);
    assert.ok(names.includes('claude'));
    assert.ok(names.includes('gemini'));
    assert.ok(names.includes('codex'));
    assert.ok(names.includes('copilot'));
  });

  it('returns a copy (not the original object)', () => {
    const all1 = getAllProviders();
    const all2 = getAllProviders();
    assert.notEqual(all1, all2, 'should return different references');
    // Mutating the copy should not affect the original
    all1.testKey = 'testValue';
    const all3 = getAllProviders();
    assert.equal(all3.testKey, undefined, 'mutation should not leak');
  });
});

// ---------------------------------------------------------------------------
// PROVIDERS structure
// ---------------------------------------------------------------------------

describe('PROVIDERS structure', () => {
  const requiredFields = [
    'name', 'command', 'baseArgs', 'modelFlag',
    'stdinSupport', 'modelMap', 'adapter',
  ];

  it('all providers have required fields (name, command, baseArgs, modelFlag, stdinSupport, modelMap, adapter)', () => {
    for (const [providerName, config] of Object.entries(PROVIDERS)) {
      for (const field of requiredFields) {
        assert.ok(
          config[field] !== undefined && config[field] !== null,
          `Provider "${providerName}" missing required field "${field}"`
        );
      }
    }
  });

  it('claude modelMap has opus, sonnet, haiku', () => {
    const map = PROVIDERS.claude.modelMap;
    assert.ok(map.opus, 'Missing opus');
    assert.ok(map.sonnet, 'Missing sonnet');
    assert.ok(map.haiku, 'Missing haiku');
    assert.equal(Object.keys(map).length, 3);
  });

  it('gemini modelMap has pro, flash', () => {
    const map = PROVIDERS.gemini.modelMap;
    assert.ok(map.pro, 'Missing pro');
    assert.ok(map.flash, 'Missing flash');
    assert.equal(Object.keys(map).length, 2);
  });

  it('codex modelMap has codex, mini', () => {
    const map = PROVIDERS.codex.modelMap;
    assert.ok(map.codex, 'Missing codex');
    assert.ok(map.mini, 'Missing mini');
    assert.equal(Object.keys(map).length, 2);
  });

  it('copilot modelMap has claude-sonnet, gpt-5', () => {
    const map = PROVIDERS.copilot.modelMap;
    assert.ok(map['claude-sonnet'], 'Missing claude-sonnet');
    assert.ok(map['gpt-5'], 'Missing gpt-5');
    assert.equal(Object.keys(map).length, 2);
  });

  // -------------------------------------------------------------------------
  // Provider-specific value assertions (v3.0.0 fixes)
  // -------------------------------------------------------------------------

  it('gemini baseArgs is empty (stdin piping without --prompt flag)', () => {
    assert.deepEqual(PROVIDERS.gemini.baseArgs, []);
  });

  it('codex baseArgs includes exec', () => {
    assert.deepEqual(PROVIDERS.codex.baseArgs, ['exec']);
  });

  it('copilot baseArgs includes -p', () => {
    assert.deepEqual(PROVIDERS.copilot.baseArgs, ['-p']);
  });

  it('claude baseArgs includes --print and --dangerously-skip-permissions', () => {
    assert.deepEqual(PROVIDERS.claude.baseArgs, ['--print', '--dangerously-skip-permissions']);
  });

  it('only claude has hooksSupport: true', () => {
    assert.equal(PROVIDERS.claude.hooksSupport, true);
    assert.equal(PROVIDERS.gemini.hooksSupport, false);
    assert.equal(PROVIDERS.codex.hooksSupport, false);
    assert.equal(PROVIDERS.copilot.hooksSupport, false);
  });

  it('codex mini model is codex-mini-latest', () => {
    assert.equal(PROVIDERS.codex.modelMap.mini, 'codex-mini-latest');
  });

  it('copilot gpt-5 maps to gpt-5 (not gpt-5.1)', () => {
    assert.equal(PROVIDERS.copilot.modelMap['gpt-5'], 'gpt-5');
  });

  it('copilot claude-sonnet maps to claude-sonnet-4.5', () => {
    assert.equal(PROVIDERS.copilot.modelMap['claude-sonnet'], 'claude-sonnet-4.5');
  });

  it('gemini pro maps to gemini-2.5-pro', () => {
    assert.equal(PROVIDERS.gemini.modelMap.pro, 'gemini-2.5-pro');
  });

  it('gemini flash maps to gemini-2.5-flash', () => {
    assert.equal(PROVIDERS.gemini.modelMap.flash, 'gemini-2.5-flash');
  });

  it('all providers have stdinSupport: true', () => {
    for (const [name, config] of Object.entries(PROVIDERS)) {
      assert.equal(config.stdinSupport, true, `${name} should have stdinSupport`);
    }
  });

  it('all providers have mcpSupport: true', () => {
    for (const [name, config] of Object.entries(PROVIDERS)) {
      assert.equal(config.mcpSupport, true, `${name} should have mcpSupport`);
    }
  });

  it('copilot has no contextFile (reads CLAUDE.md natively)', () => {
    assert.equal(PROVIDERS.copilot.contextFile, null);
  });
});

// ---------------------------------------------------------------------------
// loadEnabledProviders
// ---------------------------------------------------------------------------

describe('loadEnabledProviders', () => {
  let projectDir;

  before(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'chati-cli-reg-'));
  });

  after(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('returns claude as default when no config exists', () => {
    const result = loadEnabledProviders(projectDir);
    assert.equal(result.primary, 'claude');
    assert.deepEqual(result.enabled, ['claude']);
  });

  it('detects gemini as primary from config.yaml', () => {
    const configDir = join(projectDir, 'chati.dev');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'config.yaml'),
      [
        'providers:',
        '  claude:',
        '    enabled: true',
        '    primary: false',
        '  gemini:',
        '    enabled: true',
        '    primary: true',
        '  codex:',
        '    enabled: false',
        '    primary: false',
        '  copilot:',
        '    enabled: false',
        '    primary: false',
      ].join('\n')
    );

    const result = loadEnabledProviders(projectDir);
    assert.equal(result.primary, 'gemini');
    assert.ok(result.enabled.includes('claude'), 'claude always enabled');
    assert.ok(result.enabled.includes('gemini'), 'gemini should be enabled');
    assert.ok(!result.enabled.includes('codex'), 'codex should not be enabled');
  });

  it('always includes claude in enabled list', () => {
    // Write a config where claude is explicitly disabled (should still be added)
    const configDir = join(projectDir, 'chati.dev');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'config.yaml'),
      [
        'providers:',
        '  claude:',
        '    enabled: false',
        '    primary: false',
        '  gemini:',
        '    enabled: true',
        '    primary: true',
      ].join('\n')
    );

    const result = loadEnabledProviders(projectDir);
    assert.ok(result.enabled.includes('claude'), 'claude must always be in enabled list');
  });
});

// ---------------------------------------------------------------------------
// resolveProviderForAgent
// ---------------------------------------------------------------------------

describe('resolveProviderForAgent', () => {
  let projectDir;

  before(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'chati-resolve-'));
    const configDir = join(projectDir, 'chati.dev');
    mkdirSync(configDir, { recursive: true });

    // Write a config.yaml with block-style agent_overrides
    writeFileSync(
      join(configDir, 'config.yaml'),
      [
        'providers:',
        '  claude:',
        '    enabled: true',
        '    primary: false',
        '  gemini:',
        '    enabled: true',
        '    primary: true',
        '  codex:',
        '    enabled: false',
        '    primary: false',
        '  copilot:',
        '    enabled: false',
        '    primary: false',
        'agent_overrides:',
        '  architect:',
        '    provider: gemini',
        '    model: pro',
        '  dev:',
        '    provider: gemini',
        '    model: pro',
        '  brief:',
        '    provider: claude',
        '    model: sonnet',
      ].join('\n')
    );
  });

  after(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  const agentModels = {
    architect: { provider: 'claude', model: 'opus', tier: 'opus' },
    dev: { provider: 'claude', model: 'opus', tier: 'opus' },
    brief: { provider: 'claude', model: 'sonnet', tier: 'sonnet' },
    ux: { provider: 'claude', model: 'sonnet', tier: 'sonnet' },
    detail: { provider: 'claude', model: 'opus', tier: 'opus' },
  };

  it('reads agent_overrides from block-style YAML', () => {
    const result = resolveProviderForAgent('architect', projectDir, agentModels);
    assert.equal(result.provider, 'gemini');
    assert.equal(result.model, 'pro');
  });

  it('falls back to agentModels default when no override', () => {
    // ux has no override in config.yaml, should use agentModels default
    // But the agentModels says provider: 'claude' which is in enabled list
    const result = resolveProviderForAgent('ux', projectDir, agentModels);
    assert.equal(result.provider, 'claude');
    assert.equal(result.model, 'sonnet');
  });

  it('falls back to primary provider when no agentModels entry', () => {
    // 'devops' is not in our agentModels and has no override
    const result = resolveProviderForAgent('devops', projectDir, {});
    // Should fall back to the primary provider (gemini) with its first modelMap key
    assert.equal(result.provider, 'gemini');
    assert.ok(typeof result.model === 'string');
  });

  it('returns provider-aware default model (not hardcoded sonnet)', () => {
    // When falling back to primary (gemini), the default model should be
    // the first key of gemini's modelMap ('pro'), not 'sonnet'
    const result = resolveProviderForAgent('unknown-agent', projectDir, {});
    assert.equal(result.provider, 'gemini');
    assert.equal(result.model, 'pro', 'Should use first key of gemini modelMap');
  });
});
