/**
 * @fileoverview Tests for terminal/spawner module.
 *
 * Tests focus on the pure functions (buildSpawnCommand, getTerminalStatus)
 * and validation logic.  No real processes are spawned.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSpawnCommand,
  getTerminalStatus,
  cleanParentEnv,
  _resetCounter,
} from '../../src/terminal/spawner.js';

describe('spawner', () => {
  before(() => {
    _resetCounter();
  });

  describe('buildSpawnCommand', () => {
    it('should build command with agent and taskId', () => {
      const result = buildSpawnCommand({ agent: 'architect', taskId: 'design-api' });

      assert.equal(result.command, 'claude');
      assert.ok(Array.isArray(result.args));
      assert.ok(result.args.includes('--print'));
      assert.ok(result.args.includes('--dangerously-skip-permissions'));
      assert.ok(typeof result.terminalId === 'string');
      assert.ok(result.terminalId.startsWith('architect-'));
    });

    it('should set isolation environment variables', () => {
      const result = buildSpawnCommand({ agent: 'dev', taskId: 'implement' });

      assert.equal(result.env.CHATI_AGENT, 'dev');
      assert.equal(result.env.CHATI_TASK_ID, 'implement');
      assert.ok(result.env.CHATI_TERMINAL_ID);
      assert.ok(result.env.CHATI_WRITE_SCOPE.includes('src/'));
      assert.equal(result.env.CHATI_READ_SCOPE, '*');
    });

    it('should serialize contextPayload into CHATI_CONTEXT', () => {
      const payload = { phase: 'discover', data: { key: 'value' } };
      const result = buildSpawnCommand({
        agent: 'brief',
        taskId: 'extract',
        contextPayload: payload,
      });

      assert.equal(result.env.CHATI_CONTEXT, JSON.stringify(payload));
    });

    it('should handle non-serializable contextPayload gracefully', () => {
      const circular = {};
      circular.self = circular;

      const result = buildSpawnCommand({
        agent: 'brief',
        taskId: 'extract',
        contextPayload: circular,
      });

      assert.equal(result.env.CHATI_CONTEXT, '{}');
    });

    it('should generate unique terminal IDs', () => {
      _resetCounter();
      const r1 = buildSpawnCommand({ agent: 'architect', taskId: 't1' });
      const r2 = buildSpawnCommand({ agent: 'architect', taskId: 't2' });
      assert.notEqual(r1.terminalId, r2.terminalId);
    });

    it('should throw on missing config', () => {
      assert.throws(() => buildSpawnCommand(null), /requires a config object/);
    });

    it('should throw on missing agent', () => {
      assert.throws(() => buildSpawnCommand({ taskId: 'x' }), /config\.agent is required/);
    });

    it('should throw on missing taskId', () => {
      assert.throws(() => buildSpawnCommand({ agent: 'dev' }), /config\.taskId is required/);
    });

    it('should NOT include prompt in args (prompt goes via stdin)', () => {
      const result = buildSpawnCommand({ agent: 'ux', taskId: 'wireframe' });
      // args should only be flags, not a prompt string
      for (const arg of result.args) {
        assert.ok(arg.startsWith('--') || ['claude', 'haiku', 'sonnet', 'opus'].includes(arg),
          `Unexpected non-flag arg: ${arg}`);
      }
    });

    it('should return prompt in result when provided', () => {
      const result = buildSpawnCommand({
        agent: 'detail',
        taskId: 'expand-prd',
        prompt: 'Full PRISM context here...',
      });
      assert.equal(result.prompt, 'Full PRISM context here...');
    });

    it('should return null prompt when not provided', () => {
      const result = buildSpawnCommand({ agent: 'detail', taskId: 'expand-prd' });
      assert.equal(result.prompt, null);
    });

    it('should include --model flag when model is specified', () => {
      const result = buildSpawnCommand({
        agent: 'detail',
        taskId: 'expand-prd',
        model: 'opus',
      });
      const modelIdx = result.args.indexOf('--model');
      assert.ok(modelIdx >= 0, '--model flag should be present');
      // CLI adapter resolves tier names to full model IDs via provider modelMap
      assert.equal(result.args[modelIdx + 1], 'claude-opus-4-6');
    });

    it('should NOT include --model flag when model is not specified', () => {
      const result = buildSpawnCommand({ agent: 'brief', taskId: 'extract' });
      assert.ok(!result.args.includes('--model'));
    });

    it('should set CHATI_SPAWNED env var', () => {
      const result = buildSpawnCommand({ agent: 'dev', taskId: 'implement' });
      assert.equal(result.env.CHATI_SPAWNED, 'true');
    });
  });

  describe('getTerminalStatus', () => {
    it('should return status for a running terminal', () => {
      const handle = {
        id: 'test-123',
        agent: 'architect',
        status: 'running',
        startedAt: new Date().toISOString(),
        exitCode: null,
      };

      const status = getTerminalStatus(handle);
      assert.equal(status.id, 'test-123');
      assert.equal(status.agent, 'architect');
      assert.equal(status.status, 'running');
      assert.equal(status.exitCode, null);
      assert.ok(status.elapsed >= 0);
    });

    it('should return status for an exited terminal', () => {
      const handle = {
        id: 'test-456',
        agent: 'dev',
        status: 'exited',
        startedAt: new Date(Date.now() - 5000).toISOString(),
        exitCode: 0,
      };

      const status = getTerminalStatus(handle);
      assert.equal(status.status, 'exited');
      assert.equal(status.exitCode, 0);
      assert.ok(status.elapsed >= 4000);
    });

    it('should handle null handle gracefully', () => {
      const status = getTerminalStatus(null);
      assert.equal(status.id, 'unknown');
      assert.equal(status.status, 'unknown');
    });
  });

  describe('spawnParallelGroup validation', () => {
    // We test the validation logic without actually spawning by importing the
    // write scope validator directly.
    it('should reject configs with write scope conflicts', async () => {
      // spawnParallelGroup would throw, so we test via the validation import
      const { validateWriteScopes } = await import('../../src/terminal/isolation.js');
      const result = validateWriteScopes([
        { agent: 'dev' },
        { agent: 'qa-implementation' },
      ]);
      assert.equal(result.valid, false);
    });

    it('should accept configs with disjoint write scopes', async () => {
      const { validateWriteScopes } = await import('../../src/terminal/isolation.js');
      const result = validateWriteScopes([
        { agent: 'architect' },
        { agent: 'ux' },
        { agent: 'phases' },
      ]);
      assert.equal(result.valid, true);
    });
  });

  describe('killTerminal (no-process path)', () => {
    it('should return killed: false for handle with no process', async () => {
      const { killTerminal } = await import('../../src/terminal/spawner.js');
      const result = await killTerminal({ id: 'x', process: null, exitCode: 1, status: 'exited' });
      assert.equal(result.killed, false);
      assert.equal(result.exitCode, 1);
    });

    it('should return killed: false for null handle', async () => {
      const { killTerminal } = await import('../../src/terminal/spawner.js');
      const result = await killTerminal(null);
      assert.equal(result.killed, false);
    });

    it('should return killed: false for already-exited handle', async () => {
      const { killTerminal } = await import('../../src/terminal/spawner.js');
      const handle = {
        id: 'done-1',
        process: { kill: () => {} },
        status: 'exited',
        exitCode: 0,
      };
      const result = await killTerminal(handle);
      assert.equal(result.killed, false);
      assert.equal(result.exitCode, 0);
    });
  });

  describe('cleanParentEnv', () => {
    it('should remove CLAUDECODE from environment', () => {
      const env = {
        PATH: '/usr/bin',
        HOME: '/home/user',
        CLAUDECODE: '1',
      };
      const cleaned = cleanParentEnv(env);
      assert.equal(cleaned.CLAUDECODE, undefined);
      assert.equal(cleaned.PATH, '/usr/bin');
      assert.equal(cleaned.HOME, '/home/user');
    });

    it('should remove CLAUDE_CODE_ prefixed variables', () => {
      const env = {
        PATH: '/usr/bin',
        CLAUDE_CODE_ENTRYPOINT: 'claude-vscode',
        CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: 'true',
      };
      const cleaned = cleanParentEnv(env);
      assert.equal(cleaned.CLAUDE_CODE_ENTRYPOINT, undefined);
      assert.equal(cleaned.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING, undefined);
      assert.equal(cleaned.PATH, '/usr/bin');
    });

    it('should remove CLAUDE_AGENT_SDK_ prefixed variables', () => {
      const env = {
        PATH: '/usr/bin',
        CLAUDE_AGENT_SDK_VERSION: '0.2.45',
      };
      const cleaned = cleanParentEnv(env);
      assert.equal(cleaned.CLAUDE_AGENT_SDK_VERSION, undefined);
      assert.equal(cleaned.PATH, '/usr/bin');
    });

    it('should preserve CLAUDE_API_KEY and ANTHROPIC_API_KEY', () => {
      const env = {
        CLAUDE_API_KEY: 'sk-ant-test-key',
        ANTHROPIC_API_KEY: 'sk-ant-other-key',
        CLAUDECODE: '1',
      };
      const cleaned = cleanParentEnv(env);
      assert.equal(cleaned.CLAUDE_API_KEY, 'sk-ant-test-key');
      assert.equal(cleaned.ANTHROPIC_API_KEY, 'sk-ant-other-key');
      assert.equal(cleaned.CLAUDECODE, undefined);
    });

    it('should handle empty environment', () => {
      const cleaned = cleanParentEnv({});
      assert.deepEqual(cleaned, {});
    });

    it('should remove all known Claude Code vars at once', () => {
      const env = {
        PATH: '/usr/bin',
        HOME: '/home/user',
        CLAUDECODE: '1',
        CLAUDE_CODE_ENTRYPOINT: 'claude-vscode',
        CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: 'true',
        CLAUDE_AGENT_SDK_VERSION: '0.2.45',
        CLAUDE_API_KEY: 'sk-ant-preserve-me',
        CHATI_AGENT: 'dev',
      };
      const cleaned = cleanParentEnv(env);

      // Removed
      assert.equal(cleaned.CLAUDECODE, undefined);
      assert.equal(cleaned.CLAUDE_CODE_ENTRYPOINT, undefined);
      assert.equal(cleaned.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING, undefined);
      assert.equal(cleaned.CLAUDE_AGENT_SDK_VERSION, undefined);

      // Preserved
      assert.equal(cleaned.PATH, '/usr/bin');
      assert.equal(cleaned.HOME, '/home/user');
      assert.equal(cleaned.CLAUDE_API_KEY, 'sk-ant-preserve-me');
      assert.equal(cleaned.CHATI_AGENT, 'dev');
    });

    it('should not mutate the input object', () => {
      const env = { CLAUDECODE: '1', PATH: '/usr/bin' };
      const original = { ...env };
      cleanParentEnv(env);
      assert.deepEqual(env, original);
    });

    it('should handle future CLAUDE_CODE_ vars by prefix', () => {
      const env = {
        CLAUDE_CODE_SOME_FUTURE_FLAG: 'true',
        CLAUDE_CODE_ANOTHER_SETTING: 'value',
      };
      const cleaned = cleanParentEnv(env);
      assert.equal(cleaned.CLAUDE_CODE_SOME_FUTURE_FLAG, undefined);
      assert.equal(cleaned.CLAUDE_CODE_ANOTHER_SETTING, undefined);
    });
  });
});
