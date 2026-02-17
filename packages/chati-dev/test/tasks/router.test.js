import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { TaskRouter, createRouter } from '../../src/tasks/router.js';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures', 'tasks-router');

function setupFixtures() {
  mkdirSync(FIXTURES_DIR, { recursive: true });

  const tasks = [
    { id: 'brief-extract', agent: 'brief', phase: 'discover', handoff_to: 'brief-validate' },
    { id: 'brief-validate', agent: 'brief', phase: 'discover', handoff_to: 'brief-consolidate' },
    { id: 'brief-consolidate', agent: 'brief', phase: 'discover', handoff_to: 'detail' },
    { id: 'dev-implement', agent: 'dev', phase: 'build', parallelizable: true, handoff_to: 'dev-test' },
    { id: 'dev-test', agent: 'dev', phase: 'build', parallelizable: true, handoff_to: 'dev-consolidate' },
    { id: 'dev-consolidate', agent: 'dev', phase: 'build', handoff_to: 'qa-implementation' },
    { id: 'architect-design', agent: 'architect', phase: 'plan' },
  ];

  for (const t of tasks) {
    writeFileSync(join(FIXTURES_DIR, `${t.id}.md`), `---
id: ${t.id}
agent: ${t.agent}
phase: ${t.phase}
${t.parallelizable ? 'parallelizable: true' : 'parallelizable: false'}
${t.handoff_to ? `handoff_to: ${t.handoff_to}` : ''}
criteria:
  - Criterion A
---
# ${t.id}
Execute this task.
`);
  }
}

function cleanupFixtures() {
  try { rmSync(FIXTURES_DIR, { recursive: true }); } catch { /* ignore */ }
}

describe('router', () => {
  before(() => setupFixtures());
  after(() => cleanupFixtures());

  describe('TaskRouter.load', () => {
    it('loads tasks from directory', () => {
      const router = new TaskRouter(FIXTURES_DIR).load();
      assert.equal(router.loaded, true);
      assert.equal(router.taskMap.size, 7);
    });
  });

  describe('route', () => {
    it('routes by exact task ID', () => {
      const router = createRouter(FIXTURES_DIR);
      const result = router.route({ agent: 'brief', taskId: 'brief-extract' });
      assert.equal(result.found, true);
      assert.equal(result.task.id, 'brief-extract');
      assert.ok(result.reason.includes('Exact match'));
    });

    it('returns not found for unknown task ID', () => {
      const router = createRouter(FIXTURES_DIR);
      const result = router.route({ agent: 'brief', taskId: 'nonexistent' });
      assert.equal(result.found, false);
    });

    it('routes by action keyword', () => {
      const router = createRouter(FIXTURES_DIR);
      const result = router.route({ agent: 'brief', action: 'consolidate' });
      assert.equal(result.found, true);
      assert.equal(result.task.id, 'brief-consolidate');
    });

    it('routes to default entry point when no action specified', () => {
      const router = createRouter(FIXTURES_DIR);
      const result = router.route({ agent: 'brief' });
      assert.equal(result.found, true);
      // Should pick first non-consolidate task
      assert.notEqual(result.task.id, 'brief-consolidate');
    });

    it('returns not found for unknown agent', () => {
      const router = createRouter(FIXTURES_DIR);
      const result = router.route({ agent: 'unknown-agent' });
      assert.equal(result.found, false);
      assert.ok(result.reason.includes('No tasks registered'));
    });

    it('requires agent in intent', () => {
      const router = createRouter(FIXTURES_DIR);
      const result = router.route({});
      assert.equal(result.found, false);
      assert.ok(result.reason.includes('No agent specified'));
    });

    it('returns error if not loaded', () => {
      const router = new TaskRouter(FIXTURES_DIR);
      const result = router.route({ agent: 'brief' });
      assert.equal(result.found, false);
      assert.ok(result.reason.includes('not loaded'));
    });

    it('filters by phase', () => {
      const router = createRouter(FIXTURES_DIR);
      const result = router.route({ agent: 'dev', phase: 'build' });
      assert.equal(result.found, true);
      assert.equal(result.task.phase, 'build');
    });
  });

  describe('getNextTask', () => {
    it('follows internal task chain', () => {
      const router = createRouter(FIXTURES_DIR);
      const result = router.getNextTask('brief-extract');
      assert.equal(result.found, true);
      assert.equal(result.task.id, 'brief-validate');
    });

    it('detects agent-level handoff', () => {
      const router = createRouter(FIXTURES_DIR);
      const result = router.getNextTask('brief-consolidate');
      assert.equal(result.found, false);
      assert.ok(result.reason.includes('Agent handoff'));
      assert.ok(result.reason.includes('detail'));
    });

    it('returns not found for no handoff', () => {
      const router = createRouter(FIXTURES_DIR);
      const result = router.getNextTask('architect-design');
      assert.equal(result.found, false);
      assert.ok(result.reason.includes('No handoff'));
    });

    it('returns not found for unknown task', () => {
      const router = createRouter(FIXTURES_DIR);
      const result = router.getNextTask('nonexistent');
      assert.equal(result.found, false);
    });
  });

  describe('getParallelTasks', () => {
    it('returns parallelizable tasks for agent', () => {
      const router = createRouter(FIXTURES_DIR);
      const parallel = router.getParallelTasks('dev');
      assert.equal(parallel.length, 2);
      assert.ok(parallel.every(t => t.parallelizable));
    });

    it('returns empty for non-parallel agent', () => {
      const router = createRouter(FIXTURES_DIR);
      const parallel = router.getParallelTasks('brief');
      assert.equal(parallel.length, 0);
    });
  });

  describe('getStats', () => {
    it('returns correct statistics', () => {
      const router = createRouter(FIXTURES_DIR);
      const stats = router.getStats();
      assert.equal(stats.totalTasks, 7);
      assert.equal(stats.byAgent.brief, 3);
      assert.equal(stats.byAgent.dev, 3);
      assert.equal(stats.byAgent.architect, 1);
      assert.equal(stats.byPhase.discover, 3);
      assert.equal(stats.byPhase.plan, 1);
      assert.equal(stats.byPhase.build, 3);
    });
  });
});
