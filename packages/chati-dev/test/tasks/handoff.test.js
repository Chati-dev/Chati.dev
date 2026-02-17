import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildHandoff, formatHandoff, saveHandoff, loadHandoff, parseHandoffContent } from '../../src/tasks/handoff.js';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures', 'handoff-test');

const SAMPLE_TASK = {
  id: 'brief-extract',
  agent: 'brief',
  phase: 'discover',
  criteria: ['Category A extracted', 'Category B extracted'],
  outputs: ['brief.yaml'],
  handoff_to: 'detail',
};

const SAMPLE_VALIDATION = {
  valid: true,
  score: 100,
  unmet: [],
};

describe('handoff', () => {
  before(() => mkdirSync(FIXTURES_DIR, { recursive: true }));
  after(() => { try { rmSync(FIXTURES_DIR, { recursive: true }); } catch { /* ignore */ } });

  describe('buildHandoff', () => {
    it('builds a complete handoff document', () => {
      const handoff = buildHandoff({
        task: SAMPLE_TASK,
        validation: SAMPLE_VALIDATION,
        outputs: ['brief.yaml'],
        decisions: { approach: 'iterative' },
        summary: 'Brief extraction complete.',
      });

      assert.equal(handoff.from.agent, 'brief');
      assert.equal(handoff.from.task_id, 'brief-extract');
      assert.equal(handoff.to, 'detail');
      assert.equal(handoff.status, 'complete');
      assert.equal(handoff.score, 100);
      assert.equal(handoff.summary, 'Brief extraction complete.');
      assert.deepEqual(handoff.outputs, ['brief.yaml']);
      assert.deepEqual(handoff.decisions, { approach: 'iterative' });
      assert.ok(handoff.timestamp);
    });

    it('marks partial when validation fails', () => {
      const handoff = buildHandoff({
        task: SAMPLE_TASK,
        validation: { valid: false, score: 50, unmet: ['Category B extracted'] },
      });
      assert.equal(handoff.status, 'partial');
      assert.equal(handoff.score, 50);
    });

    it('uses default values when params are minimal', () => {
      const handoff = buildHandoff({ task: SAMPLE_TASK });
      assert.equal(handoff.status, 'partial'); // no validation = partial
      assert.deepEqual(handoff.decisions, {});
      assert.deepEqual(handoff.blockers, []);
    });
  });

  describe('formatHandoff', () => {
    it('formats handoff as markdown with frontmatter', () => {
      const handoff = buildHandoff({
        task: SAMPLE_TASK,
        validation: SAMPLE_VALIDATION,
        summary: 'All good.',
        decisions: { stack: 'Node.js' },
      });

      const formatted = formatHandoff(handoff);
      assert.ok(formatted.includes('---'));
      assert.ok(formatted.includes('from_agent: brief'));
      assert.ok(formatted.includes('to: detail'));
      assert.ok(formatted.includes('## Summary'));
      assert.ok(formatted.includes('All good.'));
      assert.ok(formatted.includes('## Decisions'));
      assert.ok(formatted.includes('Node.js'));
    });

    it('includes blockers section when present', () => {
      const handoff = buildHandoff({
        task: SAMPLE_TASK,
        blockers: ['Missing API spec'],
      });
      const formatted = formatHandoff(handoff);
      assert.ok(formatted.includes('## Blockers'));
      assert.ok(formatted.includes('Missing API spec'));
    });

    it('includes criteria sections', () => {
      const handoff = buildHandoff({
        task: SAMPLE_TASK,
        validation: { valid: false, score: 50, unmet: ['Category B extracted'] },
      });
      const formatted = formatHandoff(handoff);
      assert.ok(formatted.includes('## Criteria Met'));
      assert.ok(formatted.includes('[x]'));
      assert.ok(formatted.includes('## Criteria Unmet'));
      assert.ok(formatted.includes('[ ]'));
    });
  });

  describe('saveHandoff / loadHandoff', () => {
    it('saves and loads a handoff round-trip', () => {
      const handoff = buildHandoff({
        task: SAMPLE_TASK,
        validation: SAMPLE_VALIDATION,
        summary: 'Round trip test.',
        outputs: ['brief.yaml'],
      });

      const saveResult = saveHandoff(FIXTURES_DIR, handoff);
      assert.equal(saveResult.saved, true);
      assert.ok(saveResult.path.includes('brief-handoff.md'));

      const loadResult = loadHandoff(FIXTURES_DIR, 'brief');
      assert.equal(loadResult.loaded, true);
      assert.equal(loadResult.handoff.from_agent, 'brief');
      assert.equal(loadResult.handoff.status, 'complete');
      assert.ok(loadResult.handoff.summary.includes('Round trip'));
    });

    it('returns error for missing handoff', () => {
      const result = loadHandoff(FIXTURES_DIR, 'nonexistent-agent');
      assert.equal(result.loaded, false);
      assert.ok(result.error.includes('No handoff found'));
    });
  });

  describe('parseHandoffContent', () => {
    it('parses frontmatter and sections', () => {
      const content = `---
from_agent: architect
from_task: architect-design
to: ux
timestamp: 2026-02-13T00:00:00Z
status: complete
score: 95
---

# Handoff: architect → ux

## Summary
Architecture design complete.

## Outputs
- architecture.yaml
- api-design.yaml

## Decisions
- **pattern**: microservices

## Criteria Met
- [x] API designed
- [x] DB schema defined
`;

      const parsed = parseHandoffContent(content);
      assert.equal(parsed.from_agent, 'architect');
      assert.equal(parsed.to, 'ux');
      assert.equal(parsed.status, 'complete');
      assert.equal(parsed.score, 95);
      assert.ok(parsed.summary.includes('Architecture design'));
      assert.deepEqual(parsed.outputs, ['architecture.yaml', 'api-design.yaml']);
      assert.equal(parsed.criteria_met.length, 2);
    });
  });
});
