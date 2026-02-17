/**
 * @fileoverview Tests for pipeline state persistence.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import yaml from 'js-yaml';
import {
  loadPipelineState,
  savePipelineState,
  updatePipelineState,
  sessionExists,
} from '../../src/orchestrator/pipeline-state.js';
import { initPipeline } from '../../src/orchestrator/pipeline-manager.js';

describe('pipeline-state', () => {
  let tempDir;

  beforeEach(() => {
    // Create temporary directory for each test
    tempDir = mkdtempSync(join(tmpdir(), 'chati-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('sessionExists', () => {
    it('should return false when session does not exist', () => {
      assert.equal(sessionExists(tempDir), false);
    });

    it('should return true when session exists', () => {
      const state = initPipeline({ isGreenfield: true });
      savePipelineState(tempDir, state);

      assert.equal(sessionExists(tempDir), true);
    });
  });

  describe('savePipelineState', () => {
    it('should create .chati directory', () => {
      const state = initPipeline({ isGreenfield: true });
      const result = savePipelineState(tempDir, state);

      assert.equal(result.saved, true);
      assert.ok(existsSync(join(tempDir, '.chati')));
    });

    it('should create session.yaml file', () => {
      const state = initPipeline({ isGreenfield: true });
      savePipelineState(tempDir, state);

      const sessionPath = join(tempDir, '.chati', 'session.yaml');
      assert.ok(existsSync(sessionPath));
    });

    it('should write valid YAML', () => {
      const state = initPipeline({ isGreenfield: true });
      savePipelineState(tempDir, state);

      const sessionPath = join(tempDir, '.chati', 'session.yaml');
      const content = readFileSync(sessionPath, 'utf8');
      const parsed = yaml.load(content);

      assert.ok(parsed);
      assert.equal(typeof parsed, 'object');
    });

    it('should save mode field', () => {
      const state = initPipeline({ isGreenfield: true, mode: 'discover' });
      savePipelineState(tempDir, state);

      const sessionPath = join(tempDir, '.chati', 'session.yaml');
      const content = readFileSync(sessionPath, 'utf8');
      const parsed = yaml.load(content);

      assert.equal(parsed.mode, 'discover');
    });

    it('should save project_type as greenfield', () => {
      const state = initPipeline({ isGreenfield: true });
      savePipelineState(tempDir, state);

      const sessionPath = join(tempDir, '.chati', 'session.yaml');
      const content = readFileSync(sessionPath, 'utf8');
      const parsed = yaml.load(content);

      assert.equal(parsed.project_type, 'greenfield');
    });

    it('should save project_type as brownfield', () => {
      const state = initPipeline({ isGreenfield: false });
      savePipelineState(tempDir, state);

      const sessionPath = join(tempDir, '.chati', 'session.yaml');
      const content = readFileSync(sessionPath, 'utf8');
      const parsed = yaml.load(content);

      assert.equal(parsed.project_type, 'brownfield');
    });

    it('should save agents object', () => {
      const state = initPipeline({ isGreenfield: true });
      savePipelineState(tempDir, state);

      const sessionPath = join(tempDir, '.chati', 'session.yaml');
      const content = readFileSync(sessionPath, 'utf8');
      const parsed = yaml.load(content);

      assert.ok(parsed.agents);
      assert.equal(typeof parsed.agents, 'object');
    });

    it('should save completed_agents array', () => {
      const state = initPipeline({ isGreenfield: true });
      state.completedAgents = ['greenfield-wu'];
      savePipelineState(tempDir, state);

      const sessionPath = join(tempDir, '.chati', 'session.yaml');
      const content = readFileSync(sessionPath, 'utf8');
      const parsed = yaml.load(content);

      assert.ok(Array.isArray(parsed.completed_agents));
      assert.ok(parsed.completed_agents.includes('greenfield-wu'));
    });

    it('should add updated_at timestamp', () => {
      const state = initPipeline({ isGreenfield: true });
      savePipelineState(tempDir, state);

      const sessionPath = join(tempDir, '.chati', 'session.yaml');
      const content = readFileSync(sessionPath, 'utf8');
      const parsed = yaml.load(content);

      assert.ok(parsed.updated_at);
    });
  });

  describe('loadPipelineState', () => {
    it('should return loaded false when no session exists', () => {
      const result = loadPipelineState(tempDir);

      assert.equal(result.loaded, false);
      assert.equal(result.state, null);
    });

    it('should load saved state', () => {
      const state = initPipeline({ isGreenfield: true });
      savePipelineState(tempDir, state);

      const result = loadPipelineState(tempDir);

      assert.equal(result.loaded, true);
      assert.ok(result.state);
      assert.equal(result.state.phase, 'discover');
      assert.equal(result.state.isGreenfield, true);
    });

    it('should load agents object', () => {
      const state = initPipeline({ isGreenfield: true });
      savePipelineState(tempDir, state);

      const result = loadPipelineState(tempDir);

      assert.ok(result.state.agents);
      assert.ok(result.state.agents['greenfield-wu']);
    });

    it('should load completed agents list', () => {
      const state = initPipeline({ isGreenfield: true });
      state.completedAgents = ['greenfield-wu', 'brief'];
      savePipelineState(tempDir, state);

      const result = loadPipelineState(tempDir);

      assert.ok(Array.isArray(result.state.completedAgents));
      assert.equal(result.state.completedAgents.length, 2);
    });

    it('should load current agent', () => {
      const state = initPipeline({ isGreenfield: true });
      state.currentAgent = 'brief';
      savePipelineState(tempDir, state);

      const result = loadPipelineState(tempDir);

      assert.equal(result.state.currentAgent, 'brief');
    });

    it('should load mode transitions', () => {
      const state = initPipeline({ isGreenfield: true });
      state.modeTransitions = [
        {
          from: 'plan',
          to: 'build',
          trigger: 'autonomous',
          timestamp: new Date().toISOString(),
        },
      ];
      savePipelineState(tempDir, state);

      const result = loadPipelineState(tempDir);

      assert.ok(Array.isArray(result.state.modeTransitions));
      assert.equal(result.state.modeTransitions.length, 1);
      assert.equal(result.state.modeTransitions[0].from, 'plan');
    });

    it('should load history', () => {
      const state = initPipeline({ isGreenfield: true });
      state.history = [
        {
          agent: 'greenfield-wu',
          action: 'completed',
          timestamp: new Date().toISOString(),
        },
      ];
      savePipelineState(tempDir, state);

      const result = loadPipelineState(tempDir);

      assert.ok(Array.isArray(result.state.history));
      assert.equal(result.state.history.length, 1);
    });

    it('should handle brownfield project', () => {
      const state = initPipeline({ isGreenfield: false });
      savePipelineState(tempDir, state);

      const result = loadPipelineState(tempDir);

      assert.equal(result.state.isGreenfield, false);
    });
  });

  describe('updatePipelineState', () => {
    it('should create session if it does not exist', () => {
      const updates = { phase: 'build' };
      const result = updatePipelineState(tempDir, updates);

      assert.equal(result.saved, true);
      assert.ok(sessionExists(tempDir));
    });

    it('should update mode field', () => {
      const state = initPipeline({ isGreenfield: true, mode: 'discover' });
      savePipelineState(tempDir, state);

      updatePipelineState(tempDir, { phase: 'build' });

      const result = loadPipelineState(tempDir);
      assert.equal(result.state.phase, 'build');
    });

    it('should update completed agents', () => {
      const state = initPipeline({ isGreenfield: true });
      savePipelineState(tempDir, state);

      updatePipelineState(tempDir, {
        completedAgents: ['greenfield-wu', 'brief'],
      });

      const result = loadPipelineState(tempDir);
      assert.equal(result.state.completedAgents.length, 2);
    });

    it('should preserve other fields', () => {
      const state = initPipeline({ isGreenfield: true });
      state.history = [
        {
          agent: 'greenfield-wu',
          action: 'completed',
          timestamp: new Date().toISOString(),
        },
      ];
      savePipelineState(tempDir, state);

      updatePipelineState(tempDir, { currentAgent: 'brief' });

      const result = loadPipelineState(tempDir);
      assert.equal(result.state.currentAgent, 'brief');
      assert.equal(result.state.history.length, 1);
    });

    it('should update agents object', () => {
      const state = initPipeline({ isGreenfield: true });
      savePipelineState(tempDir, state);

      const updatedAgents = { ...state.agents };
      updatedAgents['greenfield-wu'].status = 'completed';

      updatePipelineState(tempDir, { agents: updatedAgents });

      const result = loadPipelineState(tempDir);
      assert.equal(result.state.agents['greenfield-wu'].status, 'completed');
    });

    it('should add updated_at timestamp', () => {
      const state = initPipeline({ isGreenfield: true });
      savePipelineState(tempDir, state);

      updatePipelineState(tempDir, { currentAgent: 'brief' });

      const sessionPath = join(tempDir, '.chati', 'session.yaml');
      const content = readFileSync(sessionPath, 'utf8');
      const parsed = yaml.load(content);

      assert.ok(parsed.updated_at);
    });

    it('should handle multiple updates', () => {
      const state = initPipeline({ isGreenfield: true });
      savePipelineState(tempDir, state);

      updatePipelineState(tempDir, {
        phase: 'build',
        currentAgent: 'dev',
        completedAgents: ['greenfield-wu', 'brief'],
      });

      const result = loadPipelineState(tempDir);
      assert.equal(result.state.phase, 'build');
      assert.equal(result.state.currentAgent, 'dev');
      assert.equal(result.state.completedAgents.length, 2);
    });
  });

  describe('round-trip consistency', () => {
    it('should maintain state through save and load cycle', () => {
      const originalState = initPipeline({ isGreenfield: true });
      originalState.currentAgent = 'brief';
      originalState.completedAgents = ['greenfield-wu'];
      originalState.agents['greenfield-wu'].status = 'completed';

      savePipelineState(tempDir, originalState);
      const result = loadPipelineState(tempDir);

      assert.equal(result.state.phase, originalState.phase);
      assert.equal(result.state.currentAgent, originalState.currentAgent);
      assert.equal(
        result.state.completedAgents.length,
        originalState.completedAgents.length
      );
    });
  });
});
