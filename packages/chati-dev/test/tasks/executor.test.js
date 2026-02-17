import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildExecutionPayload, validateResults, determinePostAction } from '../../src/tasks/executor.js';

const SAMPLE_TASK = {
  id: 'brief-extract',
  agent: 'brief',
  phase: 'discover',
  instructions: 'Extract requirements.',
  criteria: ['Category A extracted', 'Category B extracted', 'Confidence >= 90%'],
  outputs: ['brief.yaml'],
  handoff_to: 'detail',
  requires_input: true,
  parallelizable: false,
  autonomous_gate: true,
};

describe('executor', () => {
  describe('buildExecutionPayload', () => {
    it('builds payload with task and context', () => {
      const { payload, warnings } = buildExecutionPayload(SAMPLE_TASK, {
        mode: 'human-in-the-loop',
        prismContext: { xml: '<context/>', bracket: 'FRESH' },
      });

      assert.ok(payload);
      assert.equal(payload.task.id, 'brief-extract');
      assert.equal(payload.task.agent, 'brief');
      assert.equal(payload.execution.mode, 'human-in-the-loop');
      assert.equal(payload.context.prism.bracket, 'FRESH');
      assert.equal(warnings.length, 0);
    });

    it('returns null payload for null task', () => {
      const { payload, warnings } = buildExecutionPayload(null);
      assert.equal(payload, null);
      assert.equal(warnings.length, 1);
    });

    it('warns when input-requiring task runs autonomously', () => {
      const { warnings } = buildExecutionPayload(SAMPLE_TASK, {
        mode: 'autonomous',
      });
      assert.ok(warnings.some(w => w.includes('requires user input')));
    });

    it('warns when task lacks autonomous_gate in autonomous mode', () => {
      const noGateTask = { ...SAMPLE_TASK, autonomous_gate: false };
      const { warnings } = buildExecutionPayload(noGateTask, {
        mode: 'autonomous',
      });
      assert.ok(warnings.some(w => w.includes('does not have autonomous_gate')));
    });

    it('defaults mode to human-in-the-loop', () => {
      const { payload } = buildExecutionPayload(SAMPLE_TASK);
      assert.equal(payload.execution.mode, 'human-in-the-loop');
    });

    it('sanitizes session state', () => {
      const { payload } = buildExecutionPayload(SAMPLE_TASK, {
        sessionState: {
          mode: 'build',
          current_agent: 'dev',
          secret_key: 'should-not-appear',
        },
      });
      assert.equal(payload.context.session.mode, 'build');
      assert.equal(payload.context.session.current_agent, 'dev');
      assert.equal(payload.context.session.secret_key, undefined);
    });
  });

  describe('validateResults', () => {
    it('passes when all criteria met', () => {
      const result = validateResults(SAMPLE_TASK, {
        completedCriteria: ['Category A extracted', 'Category B extracted', 'Confidence >= 90%'],
        outputs: ['brief.yaml'],
        confidence: 95,
      });
      assert.equal(result.valid, true);
      assert.equal(result.score, 100);
      assert.equal(result.unmet.length, 0);
    });

    it('fails when criteria unmet', () => {
      const result = validateResults(SAMPLE_TASK, {
        completedCriteria: ['Category A extracted'],
        outputs: ['brief.yaml'],
        confidence: 95,
      });
      assert.equal(result.valid, false);
      assert.equal(result.score, 33); // 1/3
      assert.equal(result.unmet.length, 2);
    });

    it('fails when confidence too low', () => {
      const result = validateResults(SAMPLE_TASK, {
        completedCriteria: ['Category A extracted', 'Category B extracted', 'Confidence >= 90%'],
        outputs: ['brief.yaml'],
        confidence: 50,
      });
      assert.equal(result.valid, false);
      assert.ok(result.details.includes('Low confidence'));
    });

    it('fails when outputs missing', () => {
      const result = validateResults(SAMPLE_TASK, {
        completedCriteria: ['Category A extracted', 'Category B extracted', 'Confidence >= 90%'],
        outputs: [], // missing brief.yaml
        confidence: 95,
      });
      assert.equal(result.valid, false);
      assert.ok(result.unmet.some(u => u.includes('Missing outputs')));
    });

    it('passes for task with no criteria', () => {
      const noCriteriaTask = { ...SAMPLE_TASK, criteria: [] };
      const result = validateResults(noCriteriaTask, {});
      assert.equal(result.valid, true);
      assert.equal(result.score, 100);
    });

    it('handles null task gracefully', () => {
      const result = validateResults(null, {});
      assert.equal(result.valid, true);
    });
  });

  describe('determinePostAction', () => {
    it('gates in human-in-the-loop mode', () => {
      const action = determinePostAction(
        { valid: true, score: 100, unmet: [] },
        'human-in-the-loop',
        SAMPLE_TASK
      );
      assert.equal(action.action, 'gate');
    });

    it('proceeds in autonomous mode when valid', () => {
      const action = determinePostAction(
        { valid: true, score: 100, unmet: [] },
        'autonomous',
        SAMPLE_TASK
      );
      assert.equal(action.action, 'proceed');
    });

    it('gates when score is high but not perfect in autonomous', () => {
      const action = determinePostAction(
        { valid: false, score: 92, unmet: ['Minor issue'] },
        'autonomous',
        SAMPLE_TASK
      );
      assert.equal(action.action, 'gate');
    });

    it('retries when score is moderate in autonomous', () => {
      const action = determinePostAction(
        { valid: false, score: 60, unmet: ['A', 'B'] },
        'autonomous',
        SAMPLE_TASK
      );
      assert.equal(action.action, 'retry');
    });

    it('escalates when score is low in autonomous', () => {
      const action = determinePostAction(
        { valid: false, score: 30, unmet: ['A', 'B', 'C'] },
        'autonomous',
        SAMPLE_TASK
      );
      assert.equal(action.action, 'escalate');
    });
  });
});
