import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getContextStatus, estimateContextUsage } from '../../src/intelligence/context-status.js';

describe('context-status', () => {
  let tempDir;

  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'chati-ctx-'));
    mkdirSync(join(tempDir, '.chati'), { recursive: true });
    writeFileSync(join(tempDir, '.chati', 'session.yaml'), `project:
  name: test
  type: greenfield
  state: discover
current_agent: brief
language: en
agents:
  greenfield-wu:
    status: completed
    score: 95
  brief:
    status: in_progress
    score: 45
  detail:
    status: pending
    score: 0
`);
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns FRESH bracket for early pipeline', () => {
    const status = getContextStatus(tempDir);
    assert.equal(status.bracket, 'FRESH');
    assert.ok(status.activeLayers.includes('L0'));
    assert.ok(status.activeLayers.includes('L4'));
  });

  it('includes currentAgent', () => {
    const status = getContextStatus(tempDir);
    assert.equal(status.currentAgent, 'brief');
  });

  it('includes pipeline state', () => {
    const status = getContextStatus(tempDir);
    assert.equal(status.pipelineState, 'discover');
  });

  it('counts completed agents', () => {
    const status = getContextStatus(tempDir);
    assert.equal(status.completedAgents, 1);
  });

  it('returns FRESH for no session', () => {
    const status = getContextStatus('/nonexistent/path');
    assert.equal(status.bracket, 'FRESH');
    assert.equal(status.memoryLevel, 'none');
  });

  it('estimateContextUsage returns bracket info', () => {
    const usage = estimateContextUsage(tempDir);
    assert.ok(usage.bracket);
    assert.ok(usage.tokenBudget > 0);
    assert.ok(Array.isArray(usage.layers));
  });
});
