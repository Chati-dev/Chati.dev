import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { processL0 } from '../../src/context/layers/l0-constitution.js';
import { processL1 } from '../../src/context/layers/l1-global.js';
import { processL2 } from '../../src/context/layers/l2-agent.js';
import { processL3 } from '../../src/context/layers/l3-workflow.js';
import { processL4 } from '../../src/context/layers/l4-task.js';
import { loadDomainFile, extractRules } from '../../src/context/domain-loader.js';

describe('Layer Processors', () => {
  let domainsDir;

  before(() => {
    const tempDir = mkdtempSync(join(tmpdir(), 'layers-'));
    domainsDir = join(tempDir, 'domains');
    mkdirSync(join(domainsDir, 'agents'), { recursive: true });
    mkdirSync(join(domainsDir, 'workflows'), { recursive: true });

    writeFileSync(join(domainsDir, 'constitution.yaml'), `
summary: "Test constitution"
articleCount: 16
rules:
  - id: r1
    text: "Rule one"
    priority: critical
`);

    writeFileSync(join(domainsDir, 'global.yaml'), `
rules:
  - id: g1
    text: "Global rule"
    priority: high
modes:
  planning:
    writeScope: "chati.dev/"
    allowedActions: [read]
    blockedActions: [write]
  build:
    writeScope: "*"
    allowedActions: [read, write]
    blockedActions: []
brackets:
  FRESH:
    behavior: "Full"
`);

    writeFileSync(join(domainsDir, 'agents', 'brief.yaml'), `
mission: "Extract reqs"
authority:
  exclusive: [requirement_extraction]
  allowed: [read]
  blocked: [code]
  redirectMessage: "Use dev"
outputs: [brief.yaml]
rules:
  - id: b1
    text: "Brief rule"
    priority: critical
`);

    writeFileSync(join(domainsDir, 'workflows', 'greenfield-fullstack.yaml'), `
steps:
  - wu
  - brief
  - detail
rules:
  - id: wf1
    text: "Workflow rule"
    priority: high
`);
  });

  after(() => {
    rmSync(join(domainsDir, '..'), { recursive: true, force: true });
  });

  describe('L0 Constitution', () => {
    it('loads constitution rules', () => {
      const result = processL0({ domainsDir });
      assert.equal(result.layer, 'L0');
      assert.equal(result.articleCount, 16);
      assert.equal(result.rules.length, 1);
      assert.equal(result.rules[0].id, 'r1');
    });

    it('returns summary when available', () => {
      const result = processL0({ domainsDir });
      assert.ok(result.summary.includes('Test constitution'));
    });

    it('handles missing domain gracefully', () => {
      const result = processL0({ domainsDir: '/nonexistent' });
      assert.equal(result.layer, 'L0');
      assert.equal(result.rules.length, 0);
    });
  });

  describe('L1 Global', () => {
    it('loads global rules and mode constraints', () => {
      const result = processL1({ domainsDir, mode: 'discover', bracket: 'FRESH' });
      assert.equal(result.layer, 'L1');
      assert.equal(result.mode, 'discover');
      assert.equal(result.modeRules.writeScope, 'chati.dev/');
      assert.deepEqual(result.modeRules.blockedActions, ['write']);
    });

    it('returns build mode rules', () => {
      const result = processL1({ domainsDir, mode: 'build', bracket: 'FRESH' });
      assert.equal(result.modeRules.writeScope, '*');
    });

    it('defaults to discover when mode not set', () => {
      const result = processL1({ domainsDir, bracket: 'FRESH' });
      assert.equal(result.mode, 'discover');
    });
  });

  describe('L2 Agent', () => {
    it('loads agent domain for known agent', () => {
      const result = processL2({ domainsDir, agent: 'brief' });
      assert.equal(result.layer, 'L2');
      assert.equal(result.agent, 'brief');
      assert.equal(result.mission, 'Extract reqs');
      assert.deepEqual(result.authority.exclusive, ['requirement_extraction']);
    });

    it('returns empty for unknown agent', () => {
      const result = processL2({ domainsDir, agent: 'nonexistent' });
      assert.equal(result.agent, 'nonexistent');
      assert.equal(result.rules.length, 0);
    });

    it('returns empty when no agent set', () => {
      const result = processL2({ domainsDir });
      assert.equal(result.agent, null);
      assert.equal(result.rules.length, 0);
    });
  });

  describe('L3 Workflow', () => {
    it('loads workflow with pipeline context', () => {
      const result = processL3({
        domainsDir,
        workflow: 'greenfield-fullstack',
        pipelinePosition: 'brief',
      });
      assert.equal(result.layer, 'L3');
      assert.equal(result.workflow, 'greenfield-fullstack');
      assert.equal(result.pipelineContext.currentStep, 'brief');
      assert.equal(result.pipelineContext.previousStep, 'wu');
      assert.equal(result.pipelineContext.nextStep, 'detail');
    });

    it('calculates progress correctly', () => {
      const result = processL3({
        domainsDir,
        workflow: 'greenfield-fullstack',
        pipelinePosition: 'detail',
      });
      assert.equal(result.pipelineContext.progress, 100);
    });

    it('returns empty when no workflow set', () => {
      const result = processL3({ domainsDir });
      assert.equal(result.workflow, null);
    });
  });

  describe('L4 Task', () => {
    it('passes through task data', () => {
      const result = processL4({
        taskId: 'brief-extract',
        handoff: { source: 'wu', score: 95 },
        artifacts: ['report.yaml'],
        taskCriteria: ['All categories extracted'],
      });
      assert.equal(result.layer, 'L4');
      assert.equal(result.taskId, 'brief-extract');
      assert.deepEqual(result.handoff, { source: 'wu', score: 95 });
      assert.deepEqual(result.criteria, ['All categories extracted']);
    });

    it('returns defaults when no task data', () => {
      const result = processL4({});
      assert.equal(result.taskId, null);
      assert.deepEqual(result.handoff, {});
      assert.deepEqual(result.artifacts, []);
    });
  });
});

describe('Domain Loader', () => {
  it('loads valid YAML file', () => {
    const tmpFile = join(tmpdir(), `test-domain-${Date.now()}.yaml`);
    writeFileSync(tmpFile, 'key: value\nlist:\n  - a\n  - b');
    const result = loadDomainFile(tmpFile);
    assert.equal(result.loaded, true);
    assert.equal(result.data.key, 'value');
    assert.deepEqual(result.data.list, ['a', 'b']);
    rmSync(tmpFile);
  });

  it('returns error for missing file', () => {
    const result = loadDomainFile('/nonexistent/file.yaml');
    assert.equal(result.loaded, false);
    assert.ok(result.error.includes('not found'));
  });

  it('extracts rules from domain', () => {
    const rules = extractRules({
      rules: [
        { id: 'r1', text: 'Rule 1', priority: 'critical' },
        { id: 'r2', rule: 'Rule 2' },
      ],
    });
    assert.equal(rules.length, 2);
    assert.equal(rules[0].text, 'Rule 1');
    assert.equal(rules[1].text, 'Rule 2');
    assert.equal(rules[1].priority, 'normal');
  });

  it('returns empty for null domain', () => {
    assert.deepEqual(extractRules(null), []);
    assert.deepEqual(extractRules({}), []);
  });
});
