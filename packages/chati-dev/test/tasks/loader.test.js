import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadTask, parseTaskContent, loadAllTasks, getAgentTasks, getTaskSummary } from '../../src/tasks/loader.js';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures', 'tasks');

// Create fixtures before tests
function setupFixtures() {
  mkdirSync(FIXTURES_DIR, { recursive: true });

  writeFileSync(join(FIXTURES_DIR, 'brief-extract.md'), `---
id: brief-extract
agent: brief
trigger: orchestrator
phase: discover
requires_input: true
parallelizable: false
outputs: [brief.yaml]
handoff_to: detail
autonomous_gate: true
criteria:
  - All 5 requirement categories extracted
  - Confidence >= 90%
---
# Extract Requirements

Step 1: Gather user input.
Step 2: Categorize requirements.
`);

  writeFileSync(join(FIXTURES_DIR, 'dev-implement.md'), `---
id: dev-implement
agent: dev
trigger: orchestrator
phase: build
requires_input: false
parallelizable: true
outputs: [source-code]
handoff_to: qa-implementation
autonomous_gate: true
criteria:
  - Code compiles without errors
  - All acceptance criteria implemented
---
# Implement

Write the code according to the task specification.
`);

  writeFileSync(join(FIXTURES_DIR, 'bad-task.md'), `
No frontmatter here, just plain text.
`);
}

function cleanupFixtures() {
  try { rmSync(FIXTURES_DIR, { recursive: true }); } catch { /* ignore */ }
}

describe('loader', () => {
  // Setup once
  setupFixtures();

  describe('parseTaskContent', () => {
    it('parses valid task with frontmatter', () => {
      const content = `---
id: test-task
agent: brief
phase: discover
requires_input: true
outputs: [doc.yaml]
criteria:
  - First criterion
  - Second criterion
---
# Instructions
Do the thing.`;

      const result = parseTaskContent(content, 'test.md');
      assert.equal(result.loaded, true);
      assert.equal(result.task.id, 'test-task');
      assert.equal(result.task.agent, 'brief');
      assert.equal(result.task.phase, 'discover');
      assert.equal(result.task.requires_input, true);
      assert.deepEqual(result.task.outputs, ['doc.yaml']);
      assert.deepEqual(result.task.criteria, ['First criterion', 'Second criterion']);
      assert.ok(result.task.instructions.includes('Do the thing.'));
    });

    it('rejects content without frontmatter', () => {
      const result = parseTaskContent('Just plain text', 'bad.md');
      assert.equal(result.loaded, false);
      assert.ok(result.error.includes('No YAML frontmatter'));
    });

    it('rejects content without id field', () => {
      const content = `---
agent: brief
---
Instructions`;
      const result = parseTaskContent(content);
      assert.equal(result.loaded, false);
      assert.ok(result.error.includes("Missing required field 'id'"));
    });

    it('rejects content without agent field', () => {
      const content = `---
id: test
---
Instructions`;
      const result = parseTaskContent(content);
      assert.equal(result.loaded, false);
      assert.ok(result.error.includes("Missing required field 'agent'"));
    });

    it('defaults trigger to orchestrator', () => {
      const content = `---
id: t1
agent: brief
---
Body`;
      const result = parseTaskContent(content);
      assert.equal(result.task.trigger, 'orchestrator');
    });

    it('defaults autonomous_gate to true', () => {
      const content = `---
id: t1
agent: brief
---
Body`;
      const result = parseTaskContent(content);
      assert.equal(result.task.autonomous_gate, true);
    });

    it('parses inline array outputs', () => {
      const content = `---
id: t1
agent: dev
outputs: [file.js, test.js]
---
Body`;
      const result = parseTaskContent(content);
      assert.deepEqual(result.task.outputs, ['file.js', 'test.js']);
    });
  });

  describe('loadTask', () => {
    it('loads a valid task file', () => {
      const result = loadTask(join(FIXTURES_DIR, 'brief-extract.md'));
      assert.equal(result.loaded, true);
      assert.equal(result.task.id, 'brief-extract');
      assert.equal(result.task.agent, 'brief');
      assert.equal(result.task.requires_input, true);
    });

    it('returns error for missing file', () => {
      const result = loadTask('/nonexistent/task.md');
      assert.equal(result.loaded, false);
      assert.ok(result.error.includes('not found'));
    });

    it('returns error for file without frontmatter', () => {
      const result = loadTask(join(FIXTURES_DIR, 'bad-task.md'));
      assert.equal(result.loaded, false);
      assert.ok(result.error.includes('No YAML frontmatter'));
    });
  });

  describe('loadAllTasks', () => {
    it('loads all valid tasks from directory', () => {
      const { tasks, errors } = loadAllTasks(FIXTURES_DIR);
      assert.equal(tasks.size, 2); // brief-extract + dev-implement
      assert.ok(tasks.has('brief-extract'));
      assert.ok(tasks.has('dev-implement'));
      assert.equal(errors.length, 1); // bad-task.md fails
    });

    it('returns error for nonexistent directory', () => {
      const { tasks, errors } = loadAllTasks('/nonexistent/dir');
      assert.equal(tasks.size, 0);
      assert.equal(errors.length, 1);
    });
  });

  describe('getAgentTasks', () => {
    it('filters tasks by agent name', () => {
      const { tasks } = loadAllTasks(FIXTURES_DIR);
      const briefTasks = getAgentTasks(tasks, 'brief');
      assert.equal(briefTasks.length, 1);
      assert.equal(briefTasks[0].id, 'brief-extract');
    });

    it('returns empty for unknown agent', () => {
      const { tasks } = loadAllTasks(FIXTURES_DIR);
      assert.deepEqual(getAgentTasks(tasks, 'unknown'), []);
    });
  });

  describe('getTaskSummary', () => {
    it('returns summary without instructions', () => {
      const { tasks } = loadAllTasks(FIXTURES_DIR);
      const task = tasks.get('brief-extract');
      const summary = getTaskSummary(task);
      assert.equal(summary.id, 'brief-extract');
      assert.equal(summary.agent, 'brief');
      assert.equal(summary.criteria_count, 2);
      assert.equal(summary.instructions, undefined);
    });
  });

  // Cleanup
  it('cleanup fixtures', () => {
    cleanupFixtures();
    assert.ok(true);
  });
});
