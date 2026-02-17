/**
 * @fileoverview Tests for utils/config-parser module.
 *
 * Validates YAML config parsing for provider configuration,
 * agent overrides, and CLI availability detection.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  parseProviderConfig,
  parseAgentOverride,
  getEnabledNonClaudeProviders,
  isCommandAvailable,
} from '../../src/utils/config-parser.js';

// ---------------------------------------------------------------------------
// parseProviderConfig
// ---------------------------------------------------------------------------

describe('parseProviderConfig', () => {
  let projectDir;

  before(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'chati-cfg-parser-'));
  });

  after(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('returns claude defaults when no config exists', () => {
    const result = parseProviderConfig(projectDir);
    assert.equal(result.primary, 'claude');
    assert.deepEqual(result.enabled, ['claude']);
    assert.equal(result.raw, null);
  });

  it('parses single provider enabled', () => {
    const configDir = join(projectDir, 'chati.dev');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'config.yaml'),
      [
        'providers:',
        '  claude:',
        '    enabled: true',
        '    primary: true',
        '  gemini:',
        '    enabled: true',
        '    primary: false',
        '  codex:',
        '    enabled: false',
        '    primary: false',
        '  copilot:',
        '    enabled: false',
        '    primary: false',
      ].join('\n')
    );

    const result = parseProviderConfig(projectDir);
    assert.equal(result.primary, 'claude');
    assert.ok(result.enabled.includes('claude'));
    assert.ok(result.enabled.includes('gemini'));
    assert.ok(!result.enabled.includes('codex'));
    assert.ok(!result.enabled.includes('copilot'));
    assert.ok(typeof result.raw === 'string');
  });

  it('detects non-claude primary', () => {
    const configDir = join(projectDir, 'chati.dev');
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
      ].join('\n')
    );

    const result = parseProviderConfig(projectDir);
    assert.equal(result.primary, 'gemini');
  });

  it('always includes claude in enabled list even if disabled', () => {
    const configDir = join(projectDir, 'chati.dev');
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

    const result = parseProviderConfig(projectDir);
    assert.ok(result.enabled.includes('claude'), 'claude must always be in enabled list');
    assert.equal(result.enabled[0], 'claude', 'claude should be first in list');
  });

  it('parses all 4 providers enabled', () => {
    const configDir = join(projectDir, 'chati.dev');
    writeFileSync(
      join(configDir, 'config.yaml'),
      [
        'providers:',
        '  claude:',
        '    enabled: true',
        '    primary: true',
        '  gemini:',
        '    enabled: true',
        '    primary: false',
        '  codex:',
        '    enabled: true',
        '    primary: false',
        '  copilot:',
        '    enabled: true',
        '    primary: false',
      ].join('\n')
    );

    const result = parseProviderConfig(projectDir);
    assert.equal(result.enabled.length, 4);
    assert.ok(result.enabled.includes('claude'));
    assert.ok(result.enabled.includes('gemini'));
    assert.ok(result.enabled.includes('codex'));
    assert.ok(result.enabled.includes('copilot'));
  });
});

// ---------------------------------------------------------------------------
// parseAgentOverride
// ---------------------------------------------------------------------------

describe('parseAgentOverride', () => {
  const configContent = [
    'agent_overrides:',
    '  architect:',
    '    provider: gemini',
    '    model: pro',
    '  dev:',
    '    provider: codex',
    '    model: codex',
    '  brief:',
    '    provider: claude',
    '    model: sonnet',
  ].join('\n');

  it('parses architect override', () => {
    const result = parseAgentOverride(configContent, 'architect');
    assert.deepEqual(result, { provider: 'gemini', model: 'pro' });
  });

  it('parses dev override', () => {
    const result = parseAgentOverride(configContent, 'dev');
    assert.deepEqual(result, { provider: 'codex', model: 'codex' });
  });

  it('parses brief override', () => {
    const result = parseAgentOverride(configContent, 'brief');
    assert.deepEqual(result, { provider: 'claude', model: 'sonnet' });
  });

  it('returns null for agent without override', () => {
    const result = parseAgentOverride(configContent, 'ux');
    assert.equal(result, null);
  });

  it('returns null for empty config', () => {
    const result = parseAgentOverride('', 'architect');
    assert.equal(result, null);
  });

  it('returns null for partial override (missing model)', () => {
    const partial = [
      'agent_overrides:',
      '  phases:',
      '    provider: gemini',
    ].join('\n');
    const result = parseAgentOverride(partial, 'phases');
    assert.equal(result, null);
  });
});

// ---------------------------------------------------------------------------
// getEnabledNonClaudeProviders
// ---------------------------------------------------------------------------

describe('getEnabledNonClaudeProviders', () => {
  let projectDir;

  before(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'chati-non-claude-'));
  });

  after(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('returns empty array when no config exists', () => {
    const result = getEnabledNonClaudeProviders(projectDir);
    assert.deepEqual(result, []);
  });

  it('returns non-claude providers', () => {
    const configDir = join(projectDir, 'chati.dev');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'config.yaml'),
      [
        'providers:',
        '  claude:',
        '    enabled: true',
        '    primary: true',
        '  gemini:',
        '    enabled: true',
        '    primary: false',
        '  codex:',
        '    enabled: true',
        '    primary: false',
        '  copilot:',
        '    enabled: false',
        '    primary: false',
      ].join('\n')
    );

    const result = getEnabledNonClaudeProviders(projectDir);
    assert.ok(result.includes('gemini'));
    assert.ok(result.includes('codex'));
    assert.ok(!result.includes('claude'), 'should not include claude');
    assert.ok(!result.includes('copilot'), 'disabled provider should not appear');
  });
});

// ---------------------------------------------------------------------------
// isCommandAvailable
// ---------------------------------------------------------------------------

describe('isCommandAvailable', () => {
  it('returns true for a command that exists (node)', async () => {
    const result = await isCommandAvailable('node');
    assert.equal(result, true);
  });

  it('returns false for a command that does not exist', async () => {
    const result = await isCommandAvailable('chati-nonexistent-cmd-xyz');
    assert.equal(result, false);
  });
});
