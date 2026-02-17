/**
 * @fileoverview Tests for GitHub Copilot CLI adapter.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCommand } from '../../../src/terminal/adapters/copilot-adapter.js';

const PROVIDER = {
  command: 'copilot',
  baseArgs: ['-p'],
  modelFlag: '--model',
  modelMap: { 'claude-sonnet': 'claude-sonnet-4.5', 'gpt-5': 'gpt-5' },
};

describe('copilot-adapter', () => {
  it('builds command with -p when no model', () => {
    const result = buildCommand({}, PROVIDER);
    assert.equal(result.command, 'copilot');
    assert.deepEqual(result.args, ['-p']);
    assert.equal(result.stdinPrompt, null);
  });

  it('resolves model from modelMap', () => {
    const result = buildCommand({ model: 'claude-sonnet' }, PROVIDER);
    assert.deepEqual(result.args, ['-p', '--model', 'claude-sonnet-4.5']);
  });

  it('uses provider.modelFlag (not hardcoded)', () => {
    const customProvider = { ...PROVIDER, modelFlag: '--llm' };
    const result = buildCommand({ model: 'gpt-5' }, customProvider);
    assert.ok(result.args.includes('--llm'));
    assert.ok(!result.args.includes('--model'));
  });

  it('passes through unknown model names', () => {
    const result = buildCommand({ model: 'gpt-6' }, PROVIDER);
    assert.ok(result.args.includes('gpt-6'));
  });

  it('returns prompt as stdinPrompt', () => {
    const result = buildCommand({ prompt: 'Review this PR' }, PROVIDER);
    assert.equal(result.stdinPrompt, 'Review this PR');
  });

  it('returns null stdinPrompt when no prompt', () => {
    const result = buildCommand({}, PROVIDER);
    assert.equal(result.stdinPrompt, null);
  });
});
