/**
 * @fileoverview Tests for mode-manager module
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  EXECUTION_MODES,
  getCurrentMode,
  setExecutionMode,
  canActAutonomously,
  getAlwaysHumanAgents,
  getModeHistory,
  clearExecutionMode,
  getModeStatistics,
} from '../../src/autonomy/mode-manager.js';
import { initSession } from '../../src/orchestrator/session-manager.js';

describe('mode-manager', () => {
  let tempDir;

  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'chati-mode-test-'));
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

  describe('getCurrentMode', () => {
    it('should return default human-in-the-loop mode for new project', () => {
      const mode = getCurrentMode(tempDir);
      assert.equal(mode.mode, EXECUTION_MODES.HUMAN_IN_THE_LOOP);
      assert.equal(mode.setAt, null);
      assert.equal(mode.reason, null);
    });
  });

  describe('setExecutionMode', () => {
    it('should set autonomous mode', () => {
      const result = setExecutionMode(tempDir, EXECUTION_MODES.AUTONOMOUS, 'Test reason');
      assert.equal(result.set, true);
      assert.equal(result.previous, EXECUTION_MODES.HUMAN_IN_THE_LOOP);

      const mode = getCurrentMode(tempDir);
      assert.equal(mode.mode, EXECUTION_MODES.AUTONOMOUS);
      assert.equal(mode.reason, 'Test reason');
      assert.ok(mode.setAt);
    });

    it('should throw error for invalid mode', () => {
      assert.throws(
        () => setExecutionMode(tempDir, 'invalid-mode', 'Test'),
        /Invalid execution mode/
      );
    });

    it('should record mode transitions', () => {
      setExecutionMode(tempDir, EXECUTION_MODES.HUMAN_IN_THE_LOOP, 'Back to human');
      const history = getModeHistory(tempDir);
      assert.ok(history.length > 0);
      assert.equal(history[history.length - 1].to, EXECUTION_MODES.HUMAN_IN_THE_LOOP);
      assert.equal(history[history.length - 1].reason, 'Back to human');
    });
  });

  describe('canActAutonomously', () => {
    it('should allow autonomous action for regular agents in autonomous mode', () => {
      const result = canActAutonomously(EXECUTION_MODES.AUTONOMOUS, 'dev');
      assert.equal(result.allowed, true);
      assert.ok(result.reason.includes('Autonomous mode enabled'));
    });

    it('should not allow autonomous action in human-in-the-loop mode', () => {
      const result = canActAutonomously(EXECUTION_MODES.HUMAN_IN_THE_LOOP, 'dev');
      assert.equal(result.allowed, false);
      assert.ok(result.reason.includes('Human-in-the-loop'));
    });

    it('should never allow autonomous action for brief agent', () => {
      const result = canActAutonomously(EXECUTION_MODES.AUTONOMOUS, 'brief');
      assert.equal(result.allowed, false);
      assert.ok(result.reason.includes('always requires human'));
    });

    it('should never allow autonomous action for deviation agent', () => {
      const result = canActAutonomously(EXECUTION_MODES.AUTONOMOUS, 'deviation');
      assert.equal(result.allowed, false);
      assert.ok(result.reason.includes('always requires human'));
    });
  });

  describe('getAlwaysHumanAgents', () => {
    it('should return list of always-human agents', () => {
      const agents = getAlwaysHumanAgents();
      assert.ok(Array.isArray(agents));
      assert.ok(agents.includes('brief'));
      assert.ok(agents.includes('deviation'));
    });

    it('should return a copy of the array', () => {
      const agents1 = getAlwaysHumanAgents();
      const agents2 = getAlwaysHumanAgents();
      assert.notEqual(agents1, agents2);
      assert.deepEqual(agents1, agents2);
    });
  });

  describe('getModeHistory', () => {
    it('should return mode transition history', () => {
      const history = getModeHistory(tempDir);
      assert.ok(Array.isArray(history));
      assert.ok(history.length > 0);
    });

    it('should include transition details', () => {
      const history = getModeHistory(tempDir);
      const latest = history[history.length - 1];
      assert.ok(latest.from);
      assert.ok(latest.to);
      assert.ok(latest.timestamp);
      assert.ok(latest.reason);
    });
  });

  describe('clearExecutionMode', () => {
    it('should clear execution mode', () => {
      setExecutionMode(tempDir, EXECUTION_MODES.AUTONOMOUS, 'Test');
      const result = clearExecutionMode(tempDir);
      assert.equal(result.cleared, true);

      const mode = getCurrentMode(tempDir);
      assert.equal(mode.mode, EXECUTION_MODES.HUMAN_IN_THE_LOOP);
      assert.equal(mode.setAt, null);
    });
  });

  describe('getModeStatistics', () => {
    it('should return mode statistics', () => {
      setExecutionMode(tempDir, EXECUTION_MODES.AUTONOMOUS, 'Test 1');
      setExecutionMode(tempDir, EXECUTION_MODES.HUMAN_IN_THE_LOOP, 'Test 2');

      const stats = getModeStatistics(tempDir);
      assert.ok(typeof stats.totalTransitions === 'number');
      assert.ok(typeof stats.timeInAutonomous === 'number');
      assert.ok(typeof stats.timeInHuman === 'number');
      assert.ok(typeof stats.currentStreak === 'number');
      assert.ok(stats.totalTransitions > 0);
    });
  });
});
