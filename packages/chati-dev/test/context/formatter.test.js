import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatContext } from '../../src/context/formatter.js';

describe('formatter', () => {
  const mockL0 = {
    layer: 'L0',
    rules: [
      { id: 'art-i', text: 'Agent governance', priority: 'critical' },
      { id: 'art-ii', text: 'Quality >= 95%', priority: 'critical' },
    ],
    summary: 'Constitution summary',
    articleCount: 16,
  };

  const mockL1 = {
    layer: 'L1',
    rules: [{ id: 'g-1', text: 'English code', priority: 'high' }],
    mode: 'discover',
    modeRules: {
      writeScope: 'chati.dev/',
      allowedActions: ['read_any_file'],
      blockedActions: ['modify_project_code'],
    },
    bracketBehavior: 'normal',
  };

  it('produces valid XML wrapper', () => {
    const xml = formatContext({
      bracket: 'FRESH',
      tokenBudget: 8000,
      l0: mockL0,
    });

    assert.ok(xml.startsWith('<chati-context bracket="FRESH">'));
    assert.ok(xml.endsWith('</chati-context>'));
  });

  it('includes constitution rules', () => {
    const xml = formatContext({
      bracket: 'FRESH',
      tokenBudget: 8000,
      l0: mockL0,
    });

    assert.ok(xml.includes('<constitution articles="16">'));
    assert.ok(xml.includes('art-i'));
    assert.ok(xml.includes('Agent governance'));
  });

  it('uses summary when no rules', () => {
    const xml = formatContext({
      bracket: 'FRESH',
      tokenBudget: 8000,
      l0: { ...mockL0, rules: [] },
    });

    assert.ok(xml.includes('<summary>'));
    assert.ok(xml.includes('Constitution summary'));
  });

  it('includes mode section', () => {
    const xml = formatContext({
      bracket: 'FRESH',
      tokenBudget: 8000,
      l0: mockL0,
      l1: mockL1,
    });

    assert.ok(xml.includes('<mode name="discover">'));
    assert.ok(xml.includes('<write-scope>chati.dev/</write-scope>'));
  });

  it('includes agent section', () => {
    const xml = formatContext({
      bracket: 'FRESH',
      tokenBudget: 8000,
      l0: mockL0,
      l2: {
        layer: 'L2',
        agent: 'brief',
        rules: [],
        authority: { exclusive: ['requirements'], allowed: [], blocked: ['code'], redirectMessage: null },
        mission: 'Extract requirements',
        outputs: ['brief.yaml'],
      },
    });

    assert.ok(xml.includes('<agent name="brief">'));
    assert.ok(xml.includes('Extract requirements'));
    assert.ok(xml.includes('brief.yaml'));
  });

  it('includes pipeline section', () => {
    const xml = formatContext({
      bracket: 'FRESH',
      tokenBudget: 8000,
      l0: mockL0,
      l3: {
        layer: 'L3',
        workflow: 'greenfield-fullstack',
        rules: [],
        pipelineContext: {
          currentStep: 'brief',
          previousStep: 'greenfield-wu',
          nextStep: 'detail',
          totalSteps: 11,
          progress: 18,
        },
      },
    });

    assert.ok(xml.includes('greenfield-fullstack'));
    assert.ok(xml.includes('<current>brief</current>'));
    assert.ok(xml.includes('<previous>greenfield-wu</previous>'));
    assert.ok(xml.includes('<next>detail</next>'));
  });

  it('includes task section', () => {
    const xml = formatContext({
      bracket: 'FRESH',
      tokenBudget: 8000,
      l0: mockL0,
      l4: {
        layer: 'L4',
        taskId: 'brief-extract',
        handoff: { source: 'greenfield-wu', score: 95 },
        artifacts: ['artifacts/0-WU/wu-report.yaml'],
        criteria: ['All 5 categories extracted'],
      },
    });

    assert.ok(xml.includes('<task id="brief-extract">'));
    assert.ok(xml.includes('All 5 categories extracted'));
    assert.ok(xml.includes('wu-report.yaml'));
  });

  it('escapes XML special characters', () => {
    const xml = formatContext({
      bracket: 'FRESH',
      tokenBudget: 8000,
      l0: {
        ...mockL0,
        rules: [{ id: 'test', text: 'Check <html> & "quotes"', priority: 'normal' }],
      },
    });

    assert.ok(xml.includes('&lt;html&gt;'));
    assert.ok(xml.includes('&amp;'));
    assert.ok(xml.includes('&quot;quotes&quot;'));
  });

  it('truncates when over token budget', () => {
    // Tiny budget to force truncation
    const xml = formatContext({
      bracket: 'FRESH',
      tokenBudget: 50,
      l0: mockL0,
      l1: mockL1,
      l2: {
        layer: 'L2', agent: 'brief', rules: [], authority: { exclusive: [], allowed: [], blocked: [], redirectMessage: null },
        mission: 'A'.repeat(500), outputs: [],
      },
      l3: {
        layer: 'L3', workflow: 'test', rules: [],
        pipelineContext: { currentStep: 'brief', previousStep: null, nextStep: null, totalSteps: 1, progress: 100 },
      },
      l4: {
        layer: 'L4', taskId: 'test', handoff: {}, artifacts: [], criteria: [],
      },
    });

    // Should still be valid XML wrapper
    assert.ok(xml.includes('<chati-context'));
    assert.ok(xml.includes('</chati-context>'));
  });

  it('skips agent section when agent is null', () => {
    const xml = formatContext({
      bracket: 'FRESH',
      tokenBudget: 8000,
      l0: mockL0,
      l2: { layer: 'L2', agent: null, rules: [], authority: {} },
    });

    assert.ok(!xml.includes('<agent'));
  });
});
