import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readDashboardData } from '../../src/dashboard/data-reader.js';

describe('readDashboardData', () => {
  let tempDir;

  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'chati-dashboard-'));
    mkdirSync(join(tempDir, '.chati'), { recursive: true });
    mkdirSync(join(tempDir, 'chati.dev', 'intelligence'), { recursive: true });

    writeFileSync(join(tempDir, '.chati', 'session.yaml'), [
      'project:',
      '  name: test-project',
      '  type: greenfield',
      '  state: discover',
      'language: en',
      'agents:',
      '  brief:',
      '    status: completed',
      '    score: 97',
      '    completed_at: "2026-02-10T10:00:00Z"',
      '  detail:',
      '    status: pending',
      '    score: 0',
      'backlog:',
      '  - id: BL-001',
      '    title: Test blocker',
      '    priority: high',
      '    status: open',
    ].join('\n'));

    writeFileSync(join(tempDir, 'chati.dev', 'config.yaml'), 'version: "1.2.0"\n');

    writeFileSync(join(tempDir, 'chati.dev', 'intelligence', 'gotchas.yaml'), [
      'gotchas:',
      '  - id: G001',
      '    title: Test gotcha',
    ].join('\n'));
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('reads session data', async () => {
    const data = await readDashboardData(tempDir);
    assert.ok(data.session);
    assert.equal(data.session.project.name, 'test-project');
  });

  it('reads config data', async () => {
    const data = await readDashboardData(tempDir);
    assert.ok(data.config);
    assert.equal(data.config.version, '1.2.0');
  });

  it('extracts agent scores', async () => {
    const data = await readDashboardData(tempDir);
    assert.equal(data.agentScores.brief.status, 'completed');
    assert.equal(data.agentScores.brief.score, 97);
    assert.equal(data.agentScores.detail.status, 'pending');
  });

  it('extracts blockers', async () => {
    const data = await readDashboardData(tempDir);
    assert.equal(data.blockers.length, 1);
    assert.equal(data.blockers[0].id, 'BL-001');
  });

  it('builds recent activity from completed agents', async () => {
    const data = await readDashboardData(tempDir);
    assert.ok(data.recentActivity.length >= 1);
    assert.equal(data.recentActivity[0].agent, 'brief');
  });

  it('reads gotchas', async () => {
    const data = await readDashboardData(tempDir);
    assert.equal(data.gotchas.length, 1);
  });

  it('handles missing session gracefully', async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'chati-empty-'));
    const data = await readDashboardData(emptyDir);
    assert.equal(data.session, null);
    assert.equal(data.config, null);
    rmSync(emptyDir, { recursive: true, force: true });
  });

  it('includes intelligence stats', async () => {
    const data = await readDashboardData(tempDir);
    assert.ok(data.memoryStats !== undefined);
    assert.ok(data.contextStatus !== undefined);
  });
});
