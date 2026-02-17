/**
 * @fileoverview Tests for agent selection.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_PIPELINE,
  selectAgent,
  getNextAgent,
  isAgentAllowedInMode,
  getParallelGroups,
  getAgentDefinition,
  getPhaseAgents,
} from '../../src/orchestrator/agent-selector.js';
import { INTENT_TYPES } from '../../src/orchestrator/intent-classifier.js';

describe('agent-selector', () => {
  describe('AGENT_PIPELINE', () => {
    it('should have 12 agents defined', () => {
      assert.equal(AGENT_PIPELINE.length, 12);
    });

    it('should have both WU agents', () => {
      const wuAgents = AGENT_PIPELINE.filter((a) => a.group === 'wu');
      assert.equal(wuAgents.length, 2);
      assert.ok(wuAgents.some((a) => a.name === 'greenfield-wu'));
      assert.ok(wuAgents.some((a) => a.name === 'brownfield-wu'));
    });

    it('should have parallel agents in plan-parallel group', () => {
      const parallelAgents = AGENT_PIPELINE.filter(
        (a) => a.group === 'plan-parallel'
      );
      assert.equal(parallelAgents.length, 3);
      assert.ok(parallelAgents.every((a) => a.parallel === true));
    });
  });

  describe('selectAgent', () => {
    it('should select greenfield-wu for new project discovery', () => {
      const result = selectAgent({
        intent: INTENT_TYPES.DISCOVER,
        mode: 'discover',
        isGreenfield: true,
        completedAgents: [],
      });

      assert.equal(result.agent, 'greenfield-wu');
      assert.ok(result.reason.includes('greenfield'));
    });

    it('should select brownfield-wu for existing project', () => {
      const result = selectAgent({
        intent: INTENT_TYPES.DISCOVER,
        mode: 'discover',
        isGreenfield: false,
        completedAgents: [],
      });

      assert.equal(result.agent, 'brownfield-wu');
      assert.ok(result.reason.includes('brownfield'));
    });

    it('should select dev for direct implementation', () => {
      const result = selectAgent({
        intent: INTENT_TYPES.IMPLEMENTATION,
        mode: 'build',
        completedAgents: [],
      });

      assert.equal(result.agent, 'dev');
    });

    it('should select devops for direct deploy', () => {
      const result = selectAgent({
        intent: INTENT_TYPES.DEPLOY,
        mode: 'deploy',
        completedAgents: [],
      });

      assert.equal(result.agent, 'devops');
    });

    it('should continue from current agent on resume', () => {
      const result = selectAgent({
        intent: INTENT_TYPES.RESUME,
        mode: 'discover',
        currentAgent: 'greenfield-wu',
        completedAgents: ['greenfield-wu'],
      });

      assert.equal(result.agent, 'brief');
      assert.ok(result.reason.includes('Resuming'));
    });

    it('should identify parallel group for parallel agents', () => {
      const result = selectAgent({
        intent: INTENT_TYPES.DISCOVER,
        mode: 'plan',
        currentAgent: 'brief',
        completedAgents: ['greenfield-wu', 'brief'],
      });

      assert.ok(['detail', 'architect', 'ux'].includes(result.agent));
      assert.ok(Array.isArray(result.parallelGroup));
      assert.ok(result.parallelGroup.length > 0);
    });

    it('should handle no incomplete agents', () => {
      const allDiscoverAndPlanAgents = [
        'greenfield-wu',
        'brief',
        'detail',
        'architect',
        'ux',
        'phases',
        'tasks',
        'qa-planning',
      ];

      const result = selectAgent({
        intent: INTENT_TYPES.DISCOVER,
        mode: 'plan',
        completedAgents: allDiscoverAndPlanAgents,
      });

      assert.equal(result.agent, null);
      assert.ok(result.reason.includes('No incomplete'));
    });
  });

  describe('getNextAgent', () => {
    it('should get brief after greenfield-wu', () => {
      const result = getNextAgent('greenfield-wu', ['greenfield-wu']);
      assert.equal(result.next, 'brief');
      assert.equal(result.isParallel, false);
    });

    it('should get parallel agents after brief', () => {
      const result = getNextAgent('brief', ['greenfield-wu', 'brief']);
      assert.ok(['detail', 'architect', 'ux'].includes(result.next));
      assert.equal(result.isParallel, true);
      assert.ok(result.group.length === 3);
    });

    it('should skip parallel agents that are completed', () => {
      const result = getNextAgent('detail', [
        'greenfield-wu',
        'brief',
        'detail',
        'architect',
      ]);
      assert.equal(result.next, 'ux');
      assert.equal(result.isParallel, true);
    });

    it('should get phases after parallel group completes', () => {
      const result = getNextAgent('ux', [
        'greenfield-wu',
        'brief',
        'detail',
        'architect',
        'ux',
      ]);
      assert.equal(result.next, 'phases');
      assert.equal(result.isParallel, false);
    });

    it('should return null after last agent', () => {
      const result = getNextAgent('devops', [
        'greenfield-wu',
        'brief',
        'detail',
        'architect',
        'ux',
        'phases',
        'tasks',
        'qa-planning',
        'dev',
        'qa-implementation',
        'devops',
      ]);
      assert.equal(result.next, null);
    });

    it('should skip WU agents that do not apply', () => {
      const result = getNextAgent('brief', ['greenfield-wu', 'brief']);
      assert.notEqual(result.next, 'brownfield-wu');
    });
  });

  describe('isAgentAllowedInMode', () => {
    it('should allow discover agents in discover phase', () => {
      assert.equal(isAgentAllowedInMode('greenfield-wu', 'discover'), true);
      assert.equal(isAgentAllowedInMode('brief', 'discover'), true);
    });

    it('should allow plan agents in plan phase', () => {
      assert.equal(isAgentAllowedInMode('detail', 'plan'), true);
      assert.equal(isAgentAllowedInMode('qa-planning', 'plan'), true);
    });

    it('should allow build agents in build mode', () => {
      assert.equal(isAgentAllowedInMode('dev', 'build'), true);
      assert.equal(isAgentAllowedInMode('qa-implementation', 'build'), true);
    });

    it('should allow deploy agents in deploy mode', () => {
      assert.equal(isAgentAllowedInMode('devops', 'deploy'), true);
    });

    it('should not allow discover agents in build mode', () => {
      assert.equal(isAgentAllowedInMode('brief', 'build'), false);
    });

    it('should not allow build agents in discover mode', () => {
      assert.equal(isAgentAllowedInMode('dev', 'discover'), false);
    });

    it('should return false for unknown agent', () => {
      assert.equal(isAgentAllowedInMode('unknown-agent', 'discover'), false);
    });
  });

  describe('getParallelGroups', () => {
    it('should identify plan-parallel group', () => {
      const groups = getParallelGroups(['greenfield-wu', 'brief']);
      assert.equal(groups.length, 1);
      assert.equal(groups[0].length, 3);
      assert.ok(groups[0].includes('detail'));
      assert.ok(groups[0].includes('architect'));
      assert.ok(groups[0].includes('ux'));
    });

    it('should exclude completed parallel agents', () => {
      const groups = getParallelGroups(['greenfield-wu', 'brief', 'detail']);
      assert.equal(groups.length, 1);
      assert.equal(groups[0].length, 2);
      assert.ok(groups[0].includes('architect'));
      assert.ok(groups[0].includes('ux'));
      assert.ok(!groups[0].includes('detail'));
    });

    it('should return empty array when all parallel agents completed', () => {
      const groups = getParallelGroups([
        'greenfield-wu',
        'brief',
        'detail',
        'architect',
        'ux',
      ]);
      assert.equal(groups.length, 0);
    });

    it('should handle empty completed agents', () => {
      const groups = getParallelGroups([]);
      assert.ok(groups.length > 0);
    });
  });

  describe('getAgentDefinition', () => {
    it('should return agent definition', () => {
      const def = getAgentDefinition('brief');
      assert.ok(def);
      assert.equal(def.name, 'brief');
      assert.equal(def.phase, 'discover');
    });

    it('should return null for unknown agent', () => {
      const def = getAgentDefinition('unknown');
      assert.equal(def, null);
    });
  });

  describe('getPhaseAgents', () => {
    it('should return discover agents', () => {
      const agents = getPhaseAgents('discover');
      assert.ok(agents.length > 0);
      assert.ok(agents.every((a) => a.phase === 'discover'));
    });

    it('should return plan agents', () => {
      const agents = getPhaseAgents('plan');
      assert.ok(agents.length > 0);
      assert.ok(agents.every((a) => a.phase === 'plan'));
    });

    it('should return build agents', () => {
      const agents = getPhaseAgents('build');
      assert.equal(agents.length, 2);
      assert.ok(agents.some((a) => a.name === 'dev'));
      assert.ok(agents.some((a) => a.name === 'qa-implementation'));
    });

    it('should return deploy agents', () => {
      const agents = getPhaseAgents('deploy');
      assert.equal(agents.length, 1);
      assert.equal(agents[0].name, 'devops');
    });
  });
});
