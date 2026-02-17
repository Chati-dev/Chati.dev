/**
 * @fileoverview Tests for autonomous-gate module
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  GATE_RESULTS,
  evaluateGate,
  getGateThreshold,
  resolveGateAction,
  getGateHistory,
  recordGateEvaluation,
  getGateStatistics,
  getAgentGateStatistics,
  clearGateHistory,
} from '../../src/autonomy/autonomous-gate.js';
import { initSession } from '../../src/orchestrator/session-manager.js';

describe('autonomous-gate', () => {
  let tempDir;

  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'chati-gate-test-'));
    initSession(tempDir, {
      mode: 'discover',
      isGreenfield: true,
      language: 'en',
    });
  });

  after(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('evaluateGate', () => {
    it('should pass gate with high score', () => {
      const result = evaluateGate({
        agent: 'dev',
        score: 90,
        criteriaResults: ['c1', 'c2', 'c3'],
        allCriteria: ['c1', 'c2', 'c3'],
        confidence: 95,
        warnings: [],
      });

      assert.equal(result.result, GATE_RESULTS.PASS);
      assert.ok(result.canProceed);
      assert.ok(result.score >= 90);
    });

    it('should fail gate with low score', () => {
      const result = evaluateGate({
        agent: 'dev',
        score: 50,
        criteriaResults: ['c1'],
        allCriteria: ['c1', 'c2', 'c3'],
        confidence: 70,
        warnings: [],
      });

      assert.equal(result.result, GATE_RESULTS.FAIL);
      assert.equal(result.canProceed, false);
      assert.ok(result.score < 90);
    });

    it('should return review for borderline score', () => {
      // Test a score that's in the review range (85-90 with threshold=90)
      const result = evaluateGate({
        agent: 'dev',
        score: 100,
        criteriaResults: ['c1', 'c2'],
        allCriteria: ['c1', 'c2', 'c3'],
        confidence: 90,
        warnings: [],
      });

      // Weighted: (100 * 0.6) + (66.67 * 0.4) = 86.67, which is in review range (85-90)
      assert.equal(result.result, GATE_RESULTS.REVIEW);
      assert.equal(result.canProceed, false);
    });

    it('should penalize low confidence', () => {
      const highConfResult = evaluateGate({
        agent: 'dev',
        score: 85,
        criteriaResults: ['c1', 'c2', 'c3'],
        allCriteria: ['c1', 'c2', 'c3'],
        confidence: 95,
        warnings: [],
      });

      const lowConfResult = evaluateGate({
        agent: 'dev',
        score: 85,
        criteriaResults: ['c1', 'c2', 'c3'],
        allCriteria: ['c1', 'c2', 'c3'],
        confidence: 50,
        warnings: [],
      });

      assert.ok(lowConfResult.score < highConfResult.score);
    });

    it('should penalize warnings', () => {
      const noWarnResult = evaluateGate({
        agent: 'dev',
        score: 90,
        criteriaResults: ['c1', 'c2', 'c3'],
        allCriteria: ['c1', 'c2', 'c3'],
        confidence: 90,
        warnings: [],
      });

      const warnResult = evaluateGate({
        agent: 'dev',
        score: 90,
        criteriaResults: ['c1', 'c2', 'c3'],
        allCriteria: ['c1', 'c2', 'c3'],
        confidence: 90,
        warnings: ['w1', 'w2', 'w3'],
      });

      assert.ok(warnResult.score < noWarnResult.score);
    });

    it('should throw error for invalid score', () => {
      assert.throws(
        () => evaluateGate({
          agent: 'dev',
          score: 150,
          criteriaResults: [],
          allCriteria: [],
        }),
        /Invalid score/
      );
    });

    it('should include evaluation details', () => {
      const result = evaluateGate({
        agent: 'dev',
        score: 85,
        criteriaResults: ['c1', 'c2'],
        allCriteria: ['c1', 'c2', 'c3'],
        confidence: 80,
        warnings: ['w1'],
      });

      assert.ok(result.details);
      assert.ok(typeof result.details.rawScore === 'number');
      assert.ok(typeof result.details.criteriaScore === 'number');
      assert.ok(typeof result.details.threshold === 'number');
    });
  });

  describe('getGateThreshold', () => {
    it('should return 95 for qa-planning', () => {
      assert.equal(getGateThreshold('qa-planning'), 95);
    });

    it('should return 95 for qa-implementation', () => {
      assert.equal(getGateThreshold('qa-implementation'), 95);
    });

    it('should return 90 for brief', () => {
      assert.equal(getGateThreshold('brief'), 90);
    });

    it('should return 90 for dev', () => {
      assert.equal(getGateThreshold('dev'), 90);
    });

    it('should return default 90 for unknown agent', () => {
      assert.equal(getGateThreshold('unknown-agent'), 90);
    });
  });

  describe('resolveGateAction', () => {
    it('should proceed on PASS', () => {
      const result = resolveGateAction(GATE_RESULTS.PASS, 'autonomous');
      assert.equal(result.proceed, true);
      assert.equal(result.action, 'continue');
    });

    it('should pause on FAIL in autonomous mode', () => {
      const result = resolveGateAction(GATE_RESULTS.FAIL, 'autonomous');
      assert.equal(result.proceed, false);
      assert.equal(result.action, 'pause_for_review');
    });

    it('should wait on FAIL in human-in-the-loop mode', () => {
      const result = resolveGateAction(GATE_RESULTS.FAIL, 'human-in-the-loop');
      assert.equal(result.proceed, false);
      assert.equal(result.action, 'wait_for_user');
    });

    it('should pause on REVIEW in autonomous mode', () => {
      const result = resolveGateAction(GATE_RESULTS.REVIEW, 'autonomous');
      assert.equal(result.proceed, false);
      assert.equal(result.action, 'pause_for_review');
    });

    it('should wait on REVIEW in human-in-the-loop mode', () => {
      const result = resolveGateAction(GATE_RESULTS.REVIEW, 'human-in-the-loop');
      assert.equal(result.proceed, false);
      assert.equal(result.action, 'wait_for_user');
    });
  });

  describe('gate history and statistics', () => {
    it('should start with empty history', () => {
      clearGateHistory(tempDir);
      const history = getGateHistory(tempDir);
      assert.equal(history.length, 0);
    });

    it('should record gate evaluation', () => {
      const evaluation = {
        agent: 'dev',
        result: GATE_RESULTS.PASS,
        score: 90,
        reasoning: 'Test evaluation',
      };

      recordGateEvaluation(tempDir, evaluation);
      const history = getGateHistory(tempDir);
      assert.ok(history.length > 0);
      assert.equal(history[history.length - 1].agent, 'dev');
    });

    it('should calculate overall statistics', () => {
      clearGateHistory(tempDir);

      recordGateEvaluation(tempDir, { agent: 'dev', result: GATE_RESULTS.PASS, score: 90 });
      recordGateEvaluation(tempDir, { agent: 'dev', result: GATE_RESULTS.FAIL, score: 60 });
      recordGateEvaluation(tempDir, { agent: 'dev', result: GATE_RESULTS.REVIEW, score: 78 });

      const stats = getGateStatistics(tempDir);
      assert.equal(stats.total, 3);
      assert.equal(stats.passed, 1);
      assert.equal(stats.failed, 1);
      assert.equal(stats.reviewed, 1);
      assert.ok(stats.passRate >= 0 && stats.passRate <= 100);
    });

    it('should calculate agent-specific statistics', () => {
      clearGateHistory(tempDir);

      recordGateEvaluation(tempDir, { agent: 'dev', result: GATE_RESULTS.PASS, score: 90 });
      recordGateEvaluation(tempDir, { agent: 'dev', result: GATE_RESULTS.PASS, score: 85 });
      recordGateEvaluation(tempDir, { agent: 'qa-planning', result: GATE_RESULTS.FAIL, score: 70 });

      const devStats = getAgentGateStatistics(tempDir, 'dev');
      assert.equal(devStats.total, 2);
      assert.equal(devStats.passed, 2);
      assert.equal(devStats.averageScore, 88);

      const qaStats = getAgentGateStatistics(tempDir, 'qa-planning');
      assert.equal(qaStats.total, 1);
      assert.equal(qaStats.failed, 1);
    });

    it('should clear gate history', () => {
      recordGateEvaluation(tempDir, { agent: 'dev', result: GATE_RESULTS.PASS, score: 90 });
      const result = clearGateHistory(tempDir);
      assert.ok(result.cleared >= 0);

      const history = getGateHistory(tempDir);
      assert.equal(history.length, 0);
    });
  });
});
