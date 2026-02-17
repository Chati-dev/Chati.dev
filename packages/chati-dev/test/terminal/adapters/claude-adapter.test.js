/**
 * @fileoverview Tests for Claude Code CLI adapter.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCommand } from '../../../src/terminal/adapters/claude-adapter.js';

const PROVIDER = {
  command: 'claude',
  baseArgs: ['--print', '--dangerously-skip-permissions'],
  modelFlag: '--model',
  modelMap: { opus: 'claude-opus-4-6', sonnet: 'claude-sonnet-4-5-20250929', haiku: 'claude-haiku-4-5-20251001' },
};

describe('claude-adapter', () => {
  it('builds command with baseArgs when no model', () => {
    const result = buildCommand({}, PROVIDER);
    assert.equal(result.command, 'claude');
    assert.deepEqual(result.args, ['--print', '--dangerously-skip-permissions']);
    assert.equal(result.stdinPrompt, null);
  });

  it('resolves model from modelMap', () => {
    const result = buildCommand({ model: 'opus' }, PROVIDER);
    assert.ok(result.args.includes('--model'));
    assert.ok(result.args.includes('claude-opus-4-6'));
  });

  it('passes through unknown model names', () => {
    const result = buildCommand({ model: 'custom-model-id' }, PROVIDER);
    assert.ok(result.args.includes('custom-model-id'));
  });

  it('uses provider.modelFlag (not hardcoded)', () => {
    const customProvider = { ...PROVIDER, modelFlag: '--llm' };
    const result = buildCommand({ model: 'opus' }, customProvider);
    assert.ok(result.args.includes('--llm'));
    assert.ok(!result.args.includes('--model'));
  });

  it('returns prompt as stdinPrompt', () => {
    const result = buildCommand({ prompt: 'Hello world' }, PROVIDER);
    assert.equal(result.stdinPrompt, 'Hello world');
  });

  it('returns null stdinPrompt when no prompt', () => {
    const result = buildCommand({}, PROVIDER);
    assert.equal(result.stdinPrompt, null);
  });
});
