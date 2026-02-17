/**
 * @fileoverview Tests for terminal/prompt-builder module.
 *
 * Tests use a temporary project directory with minimal domain files
 * so buildAgentPrompt can run without the full chati.dev tree.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildAgentPrompt, AGENT_FILE_MAP } from '../../src/terminal/prompt-builder.js';

// Temporary project directory for tests
const TEST_DIR = join(tmpdir(), `chati-prompt-builder-test-${Date.now()}`);

describe('prompt-builder', () => {
  before(() => {
    // Create minimal project structure
    mkdirSync(join(TEST_DIR, 'chati.dev', 'domains'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'chati.dev', 'agents', 'discover'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'chati.dev', 'agents', 'plan'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'chati.dev', 'agents', 'quality'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'chati.dev', 'agents', 'build'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'chati.dev', 'agents', 'deploy'), { recursive: true });
    mkdirSync(join(TEST_DIR, '.chati'), { recursive: true });

    // Create minimal domain file for PRISM
    writeFileSync(
      join(TEST_DIR, 'chati.dev', 'domains', 'constitution.yaml'),
      'type: constitution\ncontent: Test constitution'
    );
    writeFileSync(
      join(TEST_DIR, 'chati.dev', 'domains', 'global.yaml'),
      'type: global\ncontent: Test global context'
    );

    // Create a minimal agent definition
    writeFileSync(
      join(TEST_DIR, 'chati.dev', 'agents', 'plan', 'detail.md'),
      '# Detail Agent\n\nYou are the Detail agent. Create the PRD.'
    );
    writeFileSync(
      join(TEST_DIR, 'chati.dev', 'agents', 'plan', 'architect.md'),
      '# Architect Agent\n\nYou are the Architect agent.'
    );
    writeFileSync(
      join(TEST_DIR, 'chati.dev', 'agents', 'plan', 'ux.md'),
      '# UX Agent\n\nYou are the UX agent.'
    );
    writeFileSync(
      join(TEST_DIR, 'chati.dev', 'agents', 'build', 'dev.md'),
      '# Dev Agent\n\nYou are the Dev agent.'
    );
  });

  after(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('buildAgentPrompt', () => {
    it('should throw on missing config', () => {
      assert.throws(() => buildAgentPrompt(null), /requires config\.agent/);
    });

    it('should throw on missing agent', () => {
      assert.throws(
        () => buildAgentPrompt({ projectDir: TEST_DIR }),
        /requires config\.agent/
      );
    });

    it('should throw on missing projectDir', () => {
      assert.throws(
        () => buildAgentPrompt({ agent: 'detail' }),
        /requires config\.projectDir/
      );
    });

    it('should return prompt, model, and metadata', () => {
      const result = buildAgentPrompt({
        agent: 'detail',
        taskId: 'expand-prd',
        projectDir: TEST_DIR,
      });

      assert.ok(typeof result.prompt === 'string');
      assert.ok(result.prompt.length > 0);
      assert.ok(typeof result.model === 'string');
      assert.ok(typeof result.metadata === 'object');
      assert.equal(result.metadata.agent, 'detail');
      assert.ok(result.metadata.promptSize > 0);
    });

    it('should return correct model for detail (opus)', () => {
      const result = buildAgentPrompt({
        agent: 'detail',
        taskId: 'expand-prd',
        projectDir: TEST_DIR,
      });
      assert.equal(result.model, 'opus');
    });

    it('should return correct model for ux (sonnet)', () => {
      const result = buildAgentPrompt({
        agent: 'ux',
        taskId: 'wireframe',
        projectDir: TEST_DIR,
      });
      assert.equal(result.model, 'sonnet');
    });

    it('should return correct model for dev (opus)', () => {
      const result = buildAgentPrompt({
        agent: 'dev',
        taskId: 'implement',
        projectDir: TEST_DIR,
      });
      assert.equal(result.model, 'opus');
    });

    it('should include agent definition in prompt', () => {
      const result = buildAgentPrompt({
        agent: 'detail',
        taskId: 'expand-prd',
        projectDir: TEST_DIR,
      });
      assert.ok(result.prompt.includes('AGENT DEFINITION'));
      assert.ok(result.prompt.includes('Detail Agent'));
    });

    it('should include write scope section', () => {
      const result = buildAgentPrompt({
        agent: 'detail',
        taskId: 'expand-prd',
        projectDir: TEST_DIR,
      });
      assert.ok(result.prompt.includes('WRITE SCOPE'));
      assert.ok(result.prompt.includes('MANDATORY'));
    });

    it('should include output instructions with chati-handoff template', () => {
      const result = buildAgentPrompt({
        agent: 'detail',
        taskId: 'expand-prd',
        projectDir: TEST_DIR,
      });
      assert.ok(result.prompt.includes('OUTPUT INSTRUCTIONS'));
      assert.ok(result.prompt.includes('<chati-handoff>'));
    });

    it('should include session context', () => {
      const result = buildAgentPrompt({
        agent: 'architect',
        taskId: 'design',
        projectDir: TEST_DIR,
        sessionState: {
          project: { name: 'TestProject', type: 'greenfield', state: 'discover' },
          language: 'pt',
        },
      });
      assert.ok(result.prompt.includes('SESSION CONTEXT'));
      assert.ok(result.prompt.includes('TestProject'));
      assert.ok(result.prompt.includes('pt'));
    });

    it('should include additional context when provided', () => {
      const result = buildAgentPrompt({
        agent: 'detail',
        taskId: 'expand-prd',
        projectDir: TEST_DIR,
        additionalContext: 'User wants PostgreSQL for the database.',
      });
      assert.ok(result.prompt.includes('ADDITIONAL CONTEXT'));
      assert.ok(result.prompt.includes('User wants PostgreSQL for the database.'));
    });

    it('should NOT include additional context section when not provided', () => {
      const result = buildAgentPrompt({
        agent: 'detail',
        taskId: 'expand-prd',
        projectDir: TEST_DIR,
      });
      assert.ok(!result.prompt.includes('ADDITIONAL CONTEXT'));
    });

    it('should handle unknown agent gracefully (no agent file)', () => {
      const result = buildAgentPrompt({
        agent: 'unknown-agent',
        taskId: 'some-task',
        projectDir: TEST_DIR,
      });
      // Should still produce a prompt (without agent definition)
      assert.ok(typeof result.prompt === 'string');
      assert.ok(result.prompt.length > 0);
      // Model defaults to sonnet for unknown agents
      assert.equal(result.model, 'sonnet');
    });

    it('should handle missing domains directory gracefully', () => {
      const emptyDir = join(tmpdir(), `chati-empty-${Date.now()}`);
      mkdirSync(emptyDir, { recursive: true });

      const result = buildAgentPrompt({
        agent: 'detail',
        taskId: 'expand-prd',
        projectDir: emptyDir,
      });

      // Should still produce a prompt (without PRISM context)
      assert.ok(typeof result.prompt === 'string');
      assert.equal(result.metadata.layers, 0);

      rmSync(emptyDir, { recursive: true, force: true });
    });

    it('should separate sections with dividers', () => {
      const result = buildAgentPrompt({
        agent: 'detail',
        taskId: 'expand-prd',
        projectDir: TEST_DIR,
      });
      assert.ok(result.prompt.includes('---'));
    });
  });

  describe('AGENT_FILE_MAP', () => {
    it('should have entries for all 12 agents', () => {
      const expectedAgents = [
        'greenfield-wu', 'brownfield-wu', 'brief', 'detail',
        'architect', 'ux', 'phases', 'tasks',
        'qa-planning', 'dev', 'qa-implementation', 'devops',
      ];

      for (const agent of expectedAgents) {
        assert.ok(
          AGENT_FILE_MAP[agent],
          `Missing AGENT_FILE_MAP entry for: ${agent}`
        );
      }
    });

    it('should NOT include orchestrator (it runs in main terminal)', () => {
      assert.equal(AGENT_FILE_MAP.orchestrator, undefined);
    });

    it('should have paths ending in .md', () => {
      for (const [, path] of Object.entries(AGENT_FILE_MAP)) {
        assert.ok(path.endsWith('.md'), `Path should end in .md: ${path}`);
      }
    });

    it('should have paths starting with chati.dev/agents/', () => {
      for (const [, path] of Object.entries(AGENT_FILE_MAP)) {
        assert.ok(
          path.startsWith('chati.dev/agents/'),
          `Path should start with chati.dev/agents/: ${path}`
        );
      }
    });
  });

  describe('model assignments', () => {
    const MODEL_MAP = {
      'greenfield-wu': 'haiku',
      'brownfield-wu': 'opus',
      brief: 'sonnet',
      detail: 'opus',
      architect: 'opus',
      ux: 'sonnet',
      phases: 'sonnet',
      tasks: 'sonnet',
      'qa-planning': 'opus',
      'qa-implementation': 'opus',
      dev: 'opus',
      devops: 'sonnet',
    };

    for (const [agent, expectedModel] of Object.entries(MODEL_MAP)) {
      it(`should assign ${expectedModel} to ${agent}`, () => {
        const result = buildAgentPrompt({
          agent,
          taskId: 'test-task',
          projectDir: TEST_DIR,
        });
        assert.equal(result.model, expectedModel);
      });
    }
  });
});
