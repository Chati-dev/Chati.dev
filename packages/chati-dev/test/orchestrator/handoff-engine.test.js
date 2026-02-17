import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  executeHandoff,
  validateHandoffPreconditions,
  loadHandoffContext,
  getHandoffHistory,
  checkRollbackFeasibility,
} from '../../src/orchestrator/handoff-engine.js';
import { saveHandoff, buildHandoff } from '../../src/tasks/handoff.js';
import { writeAgentMemory } from '../../src/memory/agent-memory.js';

describe('handoff-engine', () => {
  let tempDir;

  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'handoff-engine-test-'));
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('validateHandoffPreconditions', () => {
    it('should fail when validation is missing', () => {
      const params = {
        fromTask: { id: 'task1', agent: 'brief', outputs: [] },
        outputs: [],
        summary: 'Test summary',
      };

      const result = validateHandoffPreconditions(params);

      assert.equal(result.valid, false);
      assert.ok(result.issues.length > 0);
      assert.ok(result.issues[0].includes('Validation results'));
    });

    it('should fail when validation did not pass', () => {
      const params = {
        fromTask: { id: 'task1', agent: 'brief', outputs: [] },
        validation: { valid: false, score: 50 },
        outputs: [],
        summary: 'Test summary',
      };

      const result = validateHandoffPreconditions(params);

      assert.equal(result.valid, false);
      assert.ok(result.issues.some(i => i.includes('must pass')));
    });

    it('should fail when summary is missing', () => {
      const params = {
        fromTask: { id: 'task1', agent: 'brief', outputs: [] },
        validation: { valid: true, score: 95 },
        outputs: [],
        summary: '',
      };

      const result = validateHandoffPreconditions(params);

      assert.equal(result.valid, false);
      assert.ok(result.issues.some(i => i.includes('summary')));
    });

    it('should fail when critical blockers exist', () => {
      const params = {
        fromTask: { id: 'task1', agent: 'brief', outputs: [] },
        validation: { valid: true, score: 95 },
        outputs: [],
        summary: 'Test summary',
        blockers: ['Critical: Cannot proceed without API credentials'],
      };

      const result = validateHandoffPreconditions(params);

      assert.equal(result.valid, false);
      assert.ok(result.issues.some(i => i.includes('Critical blockers')));
    });

    it('should pass with valid parameters', () => {
      const params = {
        fromTask: { id: 'task1', agent: 'brief', outputs: [], criteria: [] },
        validation: { valid: true, score: 95 },
        outputs: ['output1.md'],
        summary: 'Successfully completed task',
      };

      const result = validateHandoffPreconditions(params);

      assert.equal(result.valid, true);
      assert.equal(result.issues.length, 0);
    });
  });

  describe('executeHandoff', () => {
    it('should create and save a handoff document', () => {
      const params = {
        fromTask: {
          id: 'brief-001',
          agent: 'brief',
          phase: 'discover',
          outputs: ['brief.md'],
          criteria: ['Create project brief', 'Define scope'],
        },
        validation: { valid: true, score: 95, unmet: [] },
        outputs: ['brief.md'],
        summary: 'Project brief completed successfully',
        decisions: { language: 'en', project_type: 'greenfield' },
      };

      const result = executeHandoff(tempDir, params);

      assert.equal(result.success, true);
      assert.ok(result.handoff);
      assert.ok(result.savedPath);
      assert.equal(result.errors.length, 0);
      assert.equal(result.handoff.from.agent, 'brief');
      assert.equal(result.handoff.status, 'complete');
    });

    it('should fail with invalid preconditions', () => {
      const params = {
        fromTask: { id: 'task1', agent: 'brief', outputs: [], criteria: [] },
        validation: { valid: false, score: 50 },
        outputs: [],
        summary: '',
      };

      const result = executeHandoff(tempDir, params);

      assert.equal(result.success, false);
      assert.ok(result.errors.length > 0);
    });
  });

  describe('loadHandoffContext', () => {
    it('should load handoff context from agent', () => {
      // Setup: create a handoff
      const handoff = buildHandoff({
        task: {
          id: 'detail-001',
          agent: 'detail',
          phase: 'plan',
          outputs: ['detail.md'],
          criteria: [],
        },
        validation: { valid: true, score: 90 },
        summary: 'Detail completed',
      });

      saveHandoff(tempDir, handoff);

      // Setup: add agent memory
      writeAgentMemory(tempDir, 'detail', {
        category: 'Decisions',
        content: 'Using PostgreSQL for database',
        confidence: 'high',
      });

      // Load context
      const result = loadHandoffContext(tempDir, 'detail');

      assert.ok(result.context);
      assert.ok(result.context.handoff);
      assert.ok(result.sources.length > 0);
      assert.ok(result.sources.some(s => s.includes('handoff')));
    });

    it('should return empty context for non-existent agent', () => {
      const result = loadHandoffContext(tempDir, 'nonexistent-agent');

      assert.ok(result.context);
      assert.equal(result.context.handoff, null);
      assert.equal(result.sources.length, 0);
    });
  });

  describe('getHandoffHistory', () => {
    it('should return empty array when no handoffs exist', () => {
      const emptyDir = mkdtempSync(join(tmpdir(), 'empty-handoff-'));
      const result = getHandoffHistory(emptyDir);

      assert.ok(Array.isArray(result));
      assert.equal(result.length, 0);

      rmSync(emptyDir, { recursive: true, force: true });
    });

    it('should return handoffs in chronological order', () => {
      const testDir = mkdtempSync(join(tmpdir(), 'history-test-'));

      // Create multiple handoffs
      const agentPhases = [
        { agent: 'brief', phase: 'discover' },
        { agent: 'detail', phase: 'plan' },
        { agent: 'architect', phase: 'plan' },
      ];

      for (const { agent, phase } of agentPhases) {
        const handoff = buildHandoff({
          task: {
            id: `${agent}-001`,
            agent,
            phase,
            outputs: [`${agent}.md`],
            criteria: [],
          },
          validation: { valid: true, score: 90 },
          summary: `${agent} completed`,
        });

        saveHandoff(testDir, handoff);
      }

      const history = getHandoffHistory(testDir);

      assert.equal(history.length, 3);
      assert.ok(history.every(h => h.agent && h.timestamp));

      rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe('checkRollbackFeasibility', () => {
    it('should indicate rollback is not possible when no history exists', () => {
      const emptyDir = mkdtempSync(join(tmpdir(), 'no-history-'));

      const result = checkRollbackFeasibility(emptyDir, 'brief');

      assert.equal(result.possible, false);
      assert.ok(result.reason.includes('No handoff history'));
      assert.equal(result.affectedAgents.length, 0);

      rmSync(emptyDir, { recursive: true, force: true });
    });

    it('should identify affected agents for rollback', () => {
      const testDir = mkdtempSync(join(tmpdir(), 'rollback-test-'));

      // Create handoffs for brief, detail, architect
      const agentPhases = [
        { agent: 'brief', phase: 'discover' },
        { agent: 'detail', phase: 'plan' },
        { agent: 'architect', phase: 'plan' },
      ];

      for (const { agent, phase } of agentPhases) {
        const handoff = buildHandoff({
          task: {
            id: `${agent}-001`,
            agent,
            phase,
            outputs: [`${agent}.md`],
            criteria: [],
          },
          validation: { valid: true, score: 90 },
          summary: `${agent} completed`,
        });

        saveHandoff(testDir, handoff);
      }

      // Check rollback to brief
      const result = checkRollbackFeasibility(testDir, 'brief');

      assert.equal(result.possible, true);
      assert.ok(result.affectedAgents.length > 0);
      assert.ok(result.affectedAgents.includes('detail'));

      rmSync(testDir, { recursive: true, force: true });
    });

    it('should indicate rollback not possible for latest agent', () => {
      const testDir = mkdtempSync(join(tmpdir(), 'latest-agent-'));

      // Create single handoff
      const handoff = buildHandoff({
        task: {
          id: 'brief-001',
          agent: 'brief',
          phase: 'discover',
          outputs: ['brief.md'],
          criteria: [],
        },
        validation: { valid: true, score: 90 },
        summary: 'Brief completed',
      });

      saveHandoff(testDir, handoff);

      const result = checkRollbackFeasibility(testDir, 'brief');

      assert.equal(result.possible, false);
      assert.ok(result.reason.includes('most recent'));

      rmSync(testDir, { recursive: true, force: true });
    });
  });
});
