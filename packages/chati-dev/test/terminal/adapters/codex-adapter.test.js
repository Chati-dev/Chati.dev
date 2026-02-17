/**
 * @fileoverview Tests for Codex CLI adapter.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCommand } from '../../../src/terminal/adapters/codex-adapter.js';

const PROVIDER = {
  command: 'codex',
  baseArgs: ['exec'],
  modelFlag: '-m',
  modelMap: { codex: 'gpt-5.3-codex', mini: 'codex-mini-latest' },
};

describe('codex-adapter', () => {
  it('builds command with exec and stdin dash when no model', () => {
    const result = buildCommand({}, PROVIDER);
    assert.equal(result.command, 'codex');
    assert.deepEqual(result.args, ['exec', '-']);
  });

  it('resolves model from modelMap and appends stdin dash', () => {
    const result = buildCommand({ model: 'codex' }, PROVIDER);
    assert.deepEqual(result.args, ['exec', '-m', 'gpt-5.3-codex', '-']);
  });

  it('always appends - for stdin piping', () => {
    const result = buildCommand({ model: 'mini' }, PROVIDER);
    assert.equal(result.args[result.args.length - 1], '-');
  });

  it('uses provider.modelFlag', () => {
    const customProvider = { ...PROVIDER, modelFlag: '--model' };
    const result = buildCommand({ model: 'codex' }, customProvider);
    assert.ok(result.args.includes('--model'));
    assert.ok(!result.args.includes('-m'));
  });

  it('passes through unknown model names', () => {
    const result = buildCommand({ model: 'gpt-6-codex' }, PROVIDER);
    assert.ok(result.args.includes('gpt-6-codex'));
  });

  it('returns prompt as stdinPrompt', () => {
    const result = buildCommand({ prompt: 'Build this feature' }, PROVIDER);
    assert.equal(result.stdinPrompt, 'Build this feature');
  });

  it('returns null stdinPrompt when no prompt', () => {
    const result = buildCommand({}, PROVIDER);
    assert.equal(result.stdinPrompt, null);
  });
});
