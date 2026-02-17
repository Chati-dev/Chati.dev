/**
 * @fileoverview Tests for Gemini CLI adapter.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCommand } from '../../../src/terminal/adapters/gemini-adapter.js';

const PROVIDER = {
  command: 'gemini',
  baseArgs: [],
  modelFlag: '--model',
  modelMap: { pro: 'gemini-2.5-pro', flash: 'gemini-2.5-flash' },
};

describe('gemini-adapter', () => {
  it('builds command with empty baseArgs when no model', () => {
    const result = buildCommand({}, PROVIDER);
    assert.equal(result.command, 'gemini');
    assert.deepEqual(result.args, []);
    assert.equal(result.stdinPrompt, null);
  });

  it('resolves model from modelMap', () => {
    const result = buildCommand({ model: 'pro' }, PROVIDER);
    assert.deepEqual(result.args, ['--model', 'gemini-2.5-pro']);
  });

  it('uses provider.modelFlag (not hardcoded --model)', () => {
    const customProvider = { ...PROVIDER, modelFlag: '--llm' };
    const result = buildCommand({ model: 'flash' }, customProvider);
    assert.ok(result.args.includes('--llm'));
    assert.ok(!result.args.includes('--model'));
  });

  it('passes through unknown model names', () => {
    const result = buildCommand({ model: 'gemini-3.0-ultra' }, PROVIDER);
    assert.ok(result.args.includes('gemini-3.0-ultra'));
  });

  it('returns prompt as stdinPrompt', () => {
    const result = buildCommand({ prompt: 'Analyze this code' }, PROVIDER);
    assert.equal(result.stdinPrompt, 'Analyze this code');
  });

  it('returns null stdinPrompt when no prompt', () => {
    const result = buildCommand({}, PROVIDER);
    assert.equal(result.stdinPrompt, null);
  });
});
