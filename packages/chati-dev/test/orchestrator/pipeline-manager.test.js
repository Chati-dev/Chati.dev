/**
 * @fileoverview Tests for pipeline management.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PIPELINE_PHASES,
  AGENT_STATUS,
  initPipeline,
  advancePipeline,
  checkPhaseTransition,
  getPipelineProgress,
  resetPipelineTo,
  isPipelineComplete,
  markAgentInProgress,
  confirmPreview,
} from '../../src/orchestrator/pipeline-manager.js';

describe('pipeline-manager', () => {
  describe('PIPELINE_PHASES', () => {
    it('should have 4 phases in order', () => {
      assert.equal(PIPELINE_PHASES.length, 4);
      assert.deepEqual(PIPELINE_PHASES, ['discover', 'plan', 'build', 'deploy']);
    });
  });

  describe('initPipeline', () => {
    it('should initialize greenfield pipeline', () => {
      const state = initPipeline({ isGreenfield: true, mode: 'discover' });

      assert.equal(state.phase, 'discover');
      assert.equal(state.isGreenfield, true);
      assert.ok(state.startedAt);
      assert.equal(state.completedAt, null);
      assert.ok(state.agents);
      assert.equal(state.completedAgents.length, 0);
      assert.equal(state.currentAgent, null);
    });

    it('should initialize brownfield pipeline', () => {
      const state = initPipeline({ isGreenfield: false, mode: 'discover' });

      assert.equal(state.isGreenfield, false);
      assert.ok(state.agents['brownfield-wu']);
      assert.ok(!state.agents['greenfield-wu']);
    });

    it('should include greenfield-wu but not brownfield-wu for greenfield', () => {
      const state = initPipeline({ isGreenfield: true });

      assert.ok(state.agents['greenfield-wu']);
      assert.ok(!state.agents['brownfield-wu']);
    });

    it('should initialize all agents as pending', () => {
      const state = initPipeline({ isGreenfield: true });

      for (const agentState of Object.values(state.agents)) {
        assert.equal(agentState.status, AGENT_STATUS.PENDING);
        assert.equal(agentState.score, null);
      }
    });

    it('should default to discover phase', () => {
      const state = initPipeline({});
      assert.equal(state.phase, 'discover');
    });
  });

  describe('advancePipeline', () => {
    it('should mark agent as completed', () => {
      const state = initPipeline({ isGreenfield: true });
      state.currentAgent = 'greenfield-wu';
      state.agents['greenfield-wu'].status = AGENT_STATUS.IN_PROGRESS;

      const result = advancePipeline(state, 'greenfield-wu', { score: 100 });

      assert.equal(result.state.agents['greenfield-wu'].status, AGENT_STATUS.COMPLETED);
      assert.equal(result.state.agents['greenfield-wu'].score, 100);
      assert.ok(result.state.agents['greenfield-wu'].completedAt);
    });

    it('should add to completed agents list', () => {
      const state = initPipeline({ isGreenfield: true });
      state.currentAgent = 'greenfield-wu';

      const result = advancePipeline(state, 'greenfield-wu');

      assert.ok(result.state.completedAgents.includes('greenfield-wu'));
    });

    it('should add to history', () => {
      const state = initPipeline({ isGreenfield: true });
      state.currentAgent = 'greenfield-wu';

      const result = advancePipeline(state, 'greenfield-wu', { score: 95 });

      assert.ok(result.state.history.length > 0);
      const lastEntry = result.state.history[result.state.history.length - 1];
      assert.equal(lastEntry.agent, 'greenfield-wu');
      assert.equal(lastEntry.action, 'completed');
      assert.equal(lastEntry.score, 95);
    });

    it('should continue to next agent in same phase', () => {
      const state = initPipeline({ isGreenfield: true });
      state.phase = 'plan';
      state.completedAgents = ['greenfield-wu', 'brief'];
      state.agents['greenfield-wu'].status = AGENT_STATUS.COMPLETED;
      state.agents['brief'].status = AGENT_STATUS.COMPLETED;
      state.currentAgent = 'detail';
      state.agents['detail'].status = AGENT_STATUS.IN_PROGRESS;

      const result = advancePipeline(state, 'detail');

      assert.equal(result.nextAction, 'continue');
      assert.equal(result.nextAgent, 'architect');
      assert.equal(result.needsModeSwitch, false);
    });

    it('should advance phase when QA-Planning passes threshold', () => {
      const state = initPipeline({ isGreenfield: true });
      state.phase = 'plan';
      state.completedAgents = [
        'greenfield-wu',
        'brief',
        'detail',
        'architect',
        'ux',
        'phases',
        'tasks',
      ];
      state.currentAgent = 'qa-planning';

      for (const agent of state.completedAgents) {
        state.agents[agent].status = AGENT_STATUS.COMPLETED;
      }

      const result = advancePipeline(state, 'qa-planning', { score: 95 });

      assert.equal(result.nextAction, 'advance_phase');
      assert.equal(result.state.phase, 'build');
      assert.equal(result.needsModeSwitch, true);
      assert.equal(result.nextAgent, 'dev');
    });

    it('should not advance phase when QA-Planning score below threshold', () => {
      const state = initPipeline({ isGreenfield: true });
      state.phase = 'plan';
      state.completedAgents = [
        'greenfield-wu',
        'brief',
        'detail',
        'architect',
        'ux',
        'phases',
        'tasks',
      ];
      state.currentAgent = 'qa-planning';

      for (const agent of state.completedAgents) {
        state.agents[agent].status = AGENT_STATUS.COMPLETED;
      }

      const result = advancePipeline(state, 'qa-planning', { score: 85 });

      assert.equal(result.state.phase, 'plan');
      assert.equal(result.nextAction, 'wait');
    });

    it('should record mode transition', () => {
      const state = initPipeline({ isGreenfield: true });
      state.phase = 'plan';
      state.completedAgents = [
        'greenfield-wu',
        'brief',
        'detail',
        'architect',
        'ux',
        'phases',
        'tasks',
      ];
      state.currentAgent = 'qa-planning';

      for (const agent of state.completedAgents) {
        state.agents[agent].status = AGENT_STATUS.COMPLETED;
      }

      const result = advancePipeline(state, 'qa-planning', { score: 98 });

      assert.ok(result.state.modeTransitions.length > 0);
      const transition = result.state.modeTransitions[0];
      assert.equal(transition.from, 'plan');
      assert.equal(transition.to, 'build');
      assert.equal(transition.trigger, 'autonomous');
    });

    it('should complete pipeline after devops', () => {
      const state = initPipeline({ isGreenfield: true });
      state.phase = 'deploy';
      state.currentAgent = 'devops';

      const result = advancePipeline(state, 'devops');

      assert.equal(result.nextAction, 'complete');
      assert.equal(result.nextAgent, null);
      assert.ok(result.state.completedAt);
    });
  });

  describe('checkPhaseTransition', () => {
    it('should block transition if QA-Planning not completed', () => {
      const state = initPipeline({ isGreenfield: true });
      state.phase = 'plan';

      const result = checkPhaseTransition(state);

      assert.equal(result.canAdvance, false);
      assert.ok(result.reason.includes('not yet completed'));
    });

    it('should block transition if QA-Planning score below threshold', () => {
      const state = initPipeline({ isGreenfield: true });
      state.phase = 'plan';
      state.agents['qa-planning'].status = AGENT_STATUS.COMPLETED;
      state.agents['qa-planning'].score = 90;

      const result = checkPhaseTransition(state);

      assert.equal(result.canAdvance, false);
      assert.ok(result.reason.includes('below threshold'));
      assert.equal(result.requiredScore, 95);
    });

    it('should allow transition if QA-Planning score meets threshold', () => {
      const state = initPipeline({ isGreenfield: true });
      state.phase = 'plan';
      state.agents['qa-planning'].status = AGENT_STATUS.COMPLETED;
      state.agents['qa-planning'].score = 96;

      const result = checkPhaseTransition(state);

      assert.equal(result.canAdvance, true);
      assert.ok(result.reason.includes('approved'));
    });

    it('should check QA-Implementation for build phase', () => {
      const state = initPipeline({ isGreenfield: true });
      state.phase = 'build';
      state.agents['dev'].status = AGENT_STATUS.COMPLETED;
      state.agents['qa-implementation'].status = AGENT_STATUS.COMPLETED;
      state.agents['qa-implementation'].score = 96;

      const result = checkPhaseTransition(state);

      assert.equal(result.canAdvance, true);
    });

    it('should require dev completion for build phase', () => {
      const state = initPipeline({ isGreenfield: true });
      state.phase = 'build';

      const result = checkPhaseTransition(state);

      assert.equal(result.canAdvance, false);
      assert.ok(result.reason.includes('Dev agent not yet completed'));
    });
  });

  describe('getPipelineProgress', () => {
    it('should calculate progress percentage', () => {
      const state = initPipeline({ isGreenfield: true });
      state.completedAgents = ['greenfield-wu', 'brief'];

      const progress = getPipelineProgress(state);

      assert.ok(progress.progress > 0);
      assert.ok(progress.progress < 100);
      assert.equal(progress.completedAgents.length, 2);
    });

    it('should identify next agent', () => {
      const state = initPipeline({ isGreenfield: true });
      state.currentAgent = 'greenfield-wu';
      state.completedAgents = ['greenfield-wu'];

      const progress = getPipelineProgress(state);

      assert.equal(progress.nextAgent, 'brief');
    });

    it('should show 0 progress at start', () => {
      const state = initPipeline({ isGreenfield: true });

      const progress = getPipelineProgress(state);

      assert.equal(progress.progress, 0);
    });
  });

  describe('resetPipelineTo', () => {
    it('should reset to target agent', () => {
      const state = initPipeline({ isGreenfield: true });
      state.completedAgents = ['greenfield-wu', 'brief', 'detail'];
      state.agents['greenfield-wu'].status = AGENT_STATUS.COMPLETED;
      state.agents['brief'].status = AGENT_STATUS.COMPLETED;
      state.agents['detail'].status = AGENT_STATUS.COMPLETED;

      const newState = resetPipelineTo(state, 'brief');

      assert.equal(newState.currentAgent, 'brief');
      assert.equal(newState.agents['brief'].status, AGENT_STATUS.IN_PROGRESS);
      assert.equal(newState.agents['detail'].status, AGENT_STATUS.PENDING);
    });

    it('should update completed agents list', () => {
      const state = initPipeline({ isGreenfield: true });
      state.completedAgents = ['greenfield-wu', 'brief', 'detail'];

      const newState = resetPipelineTo(state, 'brief');

      assert.ok(newState.completedAgents.includes('greenfield-wu'));
      assert.ok(!newState.completedAgents.includes('brief'));
      assert.ok(!newState.completedAgents.includes('detail'));
    });

    it('should add to history', () => {
      const state = initPipeline({ isGreenfield: true });
      state.completedAgents = ['greenfield-wu', 'brief'];

      const newState = resetPipelineTo(state, 'brief');

      assert.ok(newState.history.length > 0);
      const lastEntry = newState.history[newState.history.length - 1];
      assert.equal(lastEntry.action, 'reset_to');
      assert.equal(lastEntry.agent, 'brief');
    });

    it('should throw on unknown agent', () => {
      const state = initPipeline({ isGreenfield: true });

      assert.throws(() => {
        resetPipelineTo(state, 'unknown-agent');
      });
    });
  });

  describe('isPipelineComplete', () => {
    it('should return false for active pipeline', () => {
      const state = initPipeline({ isGreenfield: true });
      assert.equal(isPipelineComplete(state), false);
    });

    it('should return true when completedAt is set', () => {
      const state = initPipeline({ isGreenfield: true });
      state.completedAt = new Date().toISOString();

      assert.equal(isPipelineComplete(state), true);
    });
  });

  describe('markAgentInProgress', () => {
    it('should mark agent as in progress', () => {
      const state = initPipeline({ isGreenfield: true });

      const newState = markAgentInProgress(state, 'greenfield-wu');

      assert.equal(newState.agents['greenfield-wu'].status, AGENT_STATUS.IN_PROGRESS);
      assert.ok(newState.agents['greenfield-wu'].startedAt);
      assert.equal(newState.currentAgent, 'greenfield-wu');
    });

    it('should throw on unknown agent', () => {
      const state = initPipeline({ isGreenfield: true });

      assert.throws(() => {
        markAgentInProgress(state, 'unknown-agent');
      });
    });
  });

  describe('user_preview gate', () => {
    /**
     * Helper: build a pipeline state at the point where qa-implementation
     * has just been submitted for completion inside the build phase.
     */
    function buildStateAtQAImpl(qaScore = 96) {
      const state = initPipeline({ isGreenfield: true });
      state.phase = 'build';

      // Mark all pre-build agents as completed
      const preBuildAgents = [
        'greenfield-wu', 'brief', 'detail', 'architect',
        'ux', 'phases', 'tasks', 'qa-planning',
      ];
      for (const name of preBuildAgents) {
        state.agents[name].status = AGENT_STATUS.COMPLETED;
        state.completedAgents.push(name);
      }

      // dev completed
      state.agents['dev'].status = AGENT_STATUS.COMPLETED;
      state.completedAgents.push('dev');

      // qa-implementation in progress (about to complete)
      state.agents['qa-implementation'].status = AGENT_STATUS.IN_PROGRESS;
      state.currentAgent = 'qa-implementation';

      return state;
    }

    it('should return user_preview when qa-implementation passes in build phase', () => {
      const state = buildStateAtQAImpl(96);
      const result = advancePipeline(state, 'qa-implementation', { score: 96 });

      assert.equal(result.nextAction, 'user_preview');
      assert.equal(result.state.phase, 'build'); // stays in build
      assert.equal(result.nextAgent, null);
      assert.equal(result.needsModeSwitch, false);
      assert.ok(result.previewContext);
      assert.equal(result.previewContext.qaScore, 96);
    });

    it('should NOT trigger user_preview when qa-implementation score is below threshold', () => {
      const state = buildStateAtQAImpl();
      const result = advancePipeline(state, 'qa-implementation', { score: 80 });

      assert.equal(result.nextAction, 'wait'); // QA failed
      assert.equal(result.state.phase, 'build');
    });

    it('should still advance qa-planning → build normally (no preview intercept)', () => {
      const state = initPipeline({ isGreenfield: true });
      state.phase = 'plan';
      const prePlanAgents = [
        'greenfield-wu', 'brief', 'detail', 'architect',
        'ux', 'phases', 'tasks',
      ];
      for (const name of prePlanAgents) {
        state.agents[name].status = AGENT_STATUS.COMPLETED;
        state.completedAgents.push(name);
      }
      state.currentAgent = 'qa-planning';

      const result = advancePipeline(state, 'qa-planning', { score: 97 });

      assert.equal(result.nextAction, 'advance_phase');
      assert.equal(result.state.phase, 'build');
      assert.equal(result.nextAgent, 'dev');
    });
  });

  describe('confirmPreview', () => {
    function buildPreviewState() {
      const state = initPipeline({ isGreenfield: true });
      state.phase = 'build';

      const allPrior = [
        'greenfield-wu', 'brief', 'detail', 'architect',
        'ux', 'phases', 'tasks', 'qa-planning', 'dev', 'qa-implementation',
      ];
      for (const name of allPrior) {
        state.agents[name].status = AGENT_STATUS.COMPLETED;
        state.completedAgents.push(name);
      }
      state.agents['qa-implementation'].score = 96;
      state.currentAgent = null;

      return state;
    }

    it('should advance to deploy on approve_keep', () => {
      const state = buildPreviewState();
      const result = confirmPreview(state, 'approve_keep');

      assert.equal(result.nextAction, 'advance_phase');
      assert.equal(result.state.phase, 'deploy');
      assert.equal(result.nextAgent, 'devops');
      assert.equal(result.needsModeSwitch, true);
      assert.equal(result.serverAction, 'keep');
    });

    it('should advance to deploy on approve_kill', () => {
      const state = buildPreviewState();
      const result = confirmPreview(state, 'approve_kill');

      assert.equal(result.nextAction, 'advance_phase');
      assert.equal(result.state.phase, 'deploy');
      assert.equal(result.serverAction, 'kill');
    });

    it('should record mode transition on approve', () => {
      const state = buildPreviewState();
      const result = confirmPreview(state, 'approve_keep');

      assert.ok(result.state.modeTransitions.length > 0);
      const t = result.state.modeTransitions[result.state.modeTransitions.length - 1];
      assert.equal(t.from, 'build');
      assert.equal(t.to, 'deploy');
      assert.equal(t.trigger, 'user_preview_approved');
    });

    it('should route to dev on adjust', () => {
      const state = buildPreviewState();
      const result = confirmPreview(state, 'adjust');

      assert.equal(result.nextAction, 'continue');
      assert.equal(result.nextAgent, 'dev');
      assert.equal(result.state.phase, 'build'); // stays in build
      assert.equal(result.needsModeSwitch, false);
    });

    it('should trigger deviation on rethink', () => {
      const state = buildPreviewState();
      const result = confirmPreview(state, 'rethink');

      assert.equal(result.nextAction, 'deviation');
      assert.equal(result.nextAgent, null);
      assert.equal(result.state.phase, 'build'); // stays in build
      assert.equal(result.needsModeSwitch, false);
    });

    it('should add to history for each decision', () => {
      for (const decision of ['approve_keep', 'approve_kill', 'adjust', 'rethink']) {
        const state = buildPreviewState();
        const result = confirmPreview(state, decision);
        const last = result.state.history[result.state.history.length - 1];
        assert.equal(last.agent, 'orchestrator');
        assert.ok(last.action.startsWith('preview_'));
      }
    });

    it('should throw on invalid decision', () => {
      const state = buildPreviewState();
      assert.throws(
        () => confirmPreview(state, 'invalid'),
        /Invalid preview decision/,
      );
    });
  });
});
