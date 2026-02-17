import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runPrism, getPrismInfo } from '../../src/context/engine.js';

describe('PRISM Context Engine', () => {
  let domainsDir;

  before(() => {
    const tempDir = mkdtempSync(join(tmpdir(), 'prism-'));
    domainsDir = join(tempDir, 'domains');

    // Create domain structure
    mkdirSync(join(domainsDir, 'agents'), { recursive: true });
    mkdirSync(join(domainsDir, 'workflows'), { recursive: true });

    // Constitution domain
    writeFileSync(join(domainsDir, 'constitution.yaml'), `
summary: "Test constitution summary"
articleCount: 16
rules:
  - id: test-rule-1
    text: "Self-validation required"
    priority: critical
  - id: test-rule-2
    text: "Quality >= 95%"
    priority: critical
`);

    // Global domain
    writeFileSync(join(domainsDir, 'global.yaml'), `
rules:
  - id: global-1
    text: "Code must be in English"
    priority: high
modes:
  planning:
    writeScope: "chati.dev/"
    allowedActions: [read_any_file]
    blockedActions: [modify_project_code]
  build:
    writeScope: "*"
    allowedActions: [read_any_file, write_any_file]
    blockedActions: []
brackets:
  FRESH:
    behavior: "Full injection"
`);

    // Agent domain
    writeFileSync(join(domainsDir, 'agents', 'brief.yaml'), `
mission: "Extract requirements"
authority:
  exclusive: [requirement_extraction]
  allowed: [read_any_file]
  blocked: [code_modification]
  redirectMessage: "Use dev agent for code"
outputs: [brief.yaml]
rules:
  - id: brief-1
    text: "Extract 5 categories"
    priority: critical
`);

    // Workflow domain
    writeFileSync(join(domainsDir, 'workflows', 'greenfield-fullstack.yaml'), `
steps:
  - greenfield-wu
  - brief
  - detail
  - architect
  - ux
  - phases
  - tasks
  - qa-planning
  - dev
  - qa-implementation
  - devops
rules:
  - id: gf-order
    text: "Follow pipeline order"
    priority: high
`);
  });

  after(() => {
    rmSync(join(domainsDir, '..'), { recursive: true, force: true });
  });

  it('produces XML output with all layers in FRESH bracket', () => {
    const result = runPrism({
      domainsDir,
      remainingPercent: 80,
      mode: 'discover',
      agent: 'brief',
      workflow: 'greenfield-fullstack',
      pipelinePosition: 'brief',
      taskId: 'brief-extract',
      taskCriteria: ['All 5 categories extracted'],
    });

    assert.ok(result.xml.startsWith('<chati-context bracket="FRESH">'));
    assert.ok(result.xml.endsWith('</chati-context>'));
    assert.equal(result.bracket.bracket, 'FRESH');
    assert.equal(result.layerCount, 5);
    assert.equal(result.errors.length, 0);
  });

  it('skips L4 in MODERATE bracket', () => {
    const result = runPrism({
      domainsDir,
      remainingPercent: 45,
      mode: 'discover',
      agent: 'brief',
      workflow: 'greenfield-fullstack',
      pipelinePosition: 'brief',
      taskId: 'brief-extract',
    });

    assert.equal(result.bracket.bracket, 'MODERATE');
    assert.equal(result.layerCount, 4);
    // L4 should not be in layers
    const layerNames = result.layers.map(l => l.layer);
    assert.ok(!layerNames.includes('L4'));
  });

  it('only includes L0+L1 in CRITICAL bracket', () => {
    const result = runPrism({
      domainsDir,
      remainingPercent: 10,
      mode: 'build',
      agent: 'dev',
      workflow: 'greenfield-fullstack',
      pipelinePosition: 'dev',
    });

    assert.equal(result.bracket.bracket, 'CRITICAL');
    assert.equal(result.layerCount, 2);
    const layerNames = result.layers.map(l => l.layer);
    assert.deepEqual(layerNames, ['L0', 'L1']);
  });

  it('skips L2 when no agent is set', () => {
    const result = runPrism({
      domainsDir,
      remainingPercent: 80,
      mode: 'discover',
    });

    const layerNames = result.layers.map(l => l.layer);
    assert.ok(!layerNames.includes('L2'));
  });

  it('skips L3 when no workflow is set', () => {
    const result = runPrism({
      domainsDir,
      remainingPercent: 80,
      mode: 'discover',
      agent: 'brief',
    });

    const layerNames = result.layers.map(l => l.layer);
    assert.ok(!layerNames.includes('L3'));
  });

  it('includes constitution rules in XML', () => {
    const result = runPrism({
      domainsDir,
      remainingPercent: 80,
    });

    assert.ok(result.xml.includes('<constitution'));
    assert.ok(result.xml.includes('test-rule-1'));
    assert.ok(result.xml.includes('Self-validation required'));
  });

  it('includes mode info in XML', () => {
    const result = runPrism({
      domainsDir,
      remainingPercent: 80,
      mode: 'discover',
    });

    assert.ok(result.xml.includes('<mode name="discover">'));
    assert.ok(result.xml.includes('chati.dev/'));
  });

  it('includes agent info in XML', () => {
    const result = runPrism({
      domainsDir,
      remainingPercent: 80,
      agent: 'brief',
    });

    assert.ok(result.xml.includes('<agent name="brief">'));
    assert.ok(result.xml.includes('Extract requirements'));
  });

  it('includes pipeline progress in XML', () => {
    const result = runPrism({
      domainsDir,
      remainingPercent: 80,
      workflow: 'greenfield-fullstack',
      pipelinePosition: 'brief',
    });

    assert.ok(result.xml.includes('pipeline'));
    assert.ok(result.xml.includes('greenfield-fullstack'));
  });

  it('handles missing domains dir gracefully', () => {
    const result = runPrism({
      domainsDir: '/nonexistent/path',
      remainingPercent: 80,
    });

    // Should still produce output (graceful degradation)
    assert.ok(result.xml.includes('<chati-context'));
    assert.equal(result.bracket.bracket, 'FRESH');
  });

  it('records errors for failed layers without crashing', () => {
    // Agent domain that doesn't exist → should gracefully handle
    const result = runPrism({
      domainsDir,
      remainingPercent: 80,
      agent: 'nonexistent-agent',
    });

    // Should still produce output
    assert.ok(result.xml.includes('<chati-context'));
    // Agent layer should be present but empty
    assert.ok(result.layers.some(l => l.layer === 'L2'));
  });
});

describe('getPrismInfo', () => {
  it('returns engine metadata', () => {
    const info = getPrismInfo();
    assert.equal(info.name, 'PRISM');
    assert.equal(info.layers, 5);
    assert.equal(info.brackets.length, 4);
    assert.ok(info.features.length > 0);
  });
});
