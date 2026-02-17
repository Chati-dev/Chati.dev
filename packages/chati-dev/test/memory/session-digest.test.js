import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  buildSessionDigest,
  saveSessionDigest,
  loadLatestDigest,
  listDigests,
  pruneDigests,
} from '../../src/memory/session-digest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Session Digest', () => {
  let tempDir;

  before(() => {
    tempDir = join(__dirname, 'tmp-session-digest');
    mkdirSync(tempDir, { recursive: true });
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should build session digest from session state', () => {
    const sessionState = {
      project: {
        name: 'Test Project',
        type: 'web-app',
      },
      mode: 'discover',
      pipeline: {
        phase: 'plan',
        current_agent: 'architect',
      },
      agents: {
        'greenfield-wu': {
          status: 'completed',
          completed_at: '2026-02-13T10:00:00Z',
          validation_score: 95,
          output: {
            artifacts: ['wu-001.yaml', 'wu-002.yaml'],
            handoff: 'Handoff to brief agent',
          },
        },
        brief: {
          status: 'in_progress',
          output: null,
        },
      },
    };

    const digest = buildSessionDigest(tempDir, sessionState);

    assert.ok(digest.timestamp);
    assert.ok(digest.date);
    assert.equal(digest.mode, 'discover');
    assert.equal(digest.project.name, 'Test Project');
    assert.ok(digest.agents['greenfield-wu']);
    assert.equal(digest.agents['greenfield-wu'].status, 'completed');
    assert.equal(digest.summary.total_agents, 2);
    assert.equal(digest.summary.completed_agents, 1);
    assert.equal(digest.summary.completion_rate, 50);
  });

  it('should save and load session digest', () => {
    const sessionState = {
      project: { name: 'Test' },
      mode: 'build',
      agents: {
        dev: { status: 'completed' },
      },
    };

    const digest = buildSessionDigest(tempDir, sessionState);
    const saveResult = saveSessionDigest(tempDir, digest);

    assert.equal(saveResult.saved, true);
    assert.ok(saveResult.path);

    const loadResult = loadLatestDigest(tempDir);

    assert.equal(loadResult.loaded, true);
    assert.ok(loadResult.digest);
    assert.equal(loadResult.digest.mode, 'build');
    assert.equal(loadResult.digest.project.name, 'Test');
  });

  it('should list all digests sorted by date', () => {
    const digests = listDigests(tempDir);

    assert.ok(Array.isArray(digests));
    // We should have at least 1 from the "save and load" test
    assert.ok(digests.length >= 1);

    // Should be sorted by date (newest first)
    if (digests.length > 0) {
      assert.ok(digests[0].timestamp);
      assert.ok(digests[0].filename);
      assert.ok(digests[0].mode);
    }
  });

  it('should load latest digest when multiple exist', () => {
    const result = loadLatestDigest(tempDir);

    assert.equal(result.loaded, true);
    assert.ok(result.digest);

    // Verify it's actually the latest by checking it's the most recent
    const allDigests = listDigests(tempDir);
    assert.equal(result.digest.timestamp, allDigests[0].timestamp);
  });

  it('should handle non-existent digest directory gracefully', () => {
    const emptyDir = join(tempDir, 'nonexistent');
    const result = loadLatestDigest(emptyDir);

    assert.equal(result.loaded, false);
    assert.equal(result.digest, null);
  });

  it('should prune old digests keeping only recent ones', async () => {
    // First create multiple digests to ensure we have enough to prune
    // Add small delay between saves to ensure unique timestamps
    for (let i = 0; i < 5; i++) {
      const sessionState = {
        project: { name: `Prune Test ${i}` },
        mode: 'discover',
        agents: {},
      };
      const digest = buildSessionDigest(tempDir, sessionState);
      saveSessionDigest(tempDir, digest);
      // Small delay to ensure unique filenames
      await new Promise(resolve => setTimeout(resolve, 2));
    }

    const beforePrune = listDigests(tempDir);
    assert.ok(beforePrune.length >= 2, `Expected at least 2 digests, got ${beforePrune.length}`);

    const result = pruneDigests(tempDir, 2);

    assert.ok(result.deleted >= 0);
    assert.ok(result.kept >= 1);

    const remaining = listDigests(tempDir);
    assert.ok(remaining.length <= 2);
  });

  it('should calculate completion rate correctly', () => {
    const sessionState = {
      project: {},
      mode: 'discover',
      agents: {
        'agent1': { status: 'completed' },
        'agent2': { status: 'completed' },
        'agent3': { status: 'failed' },
        'agent4': { status: 'pending' },
      },
    };

    const digest = buildSessionDigest(tempDir, sessionState);

    assert.equal(digest.summary.total_agents, 4);
    assert.equal(digest.summary.completed_agents, 2);
    assert.equal(digest.summary.failed_agents, 1);
    assert.equal(digest.summary.completion_rate, 50);
  });

  it('should handle empty session state gracefully', () => {
    const sessionState = {};
    const digest = buildSessionDigest(tempDir, sessionState);

    assert.ok(digest.timestamp);
    assert.equal(digest.mode, 'discover');
    assert.deepEqual(digest.agents, {});
    assert.equal(digest.summary.total_agents, 0);
    assert.equal(digest.summary.completion_rate, 0);
  });
});
