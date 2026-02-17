import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

import {
  validateAllAgents,
  validateAgent,
  getAgentCompleteness,
  EXPECTED_AGENTS,
  ALL_AGENT_NAMES,
} from '../../scripts/validate-agents.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures', 'validate-agents');

const VALID_AGENT_CONTENT = `# Brief Agent — Problem Extraction

---

## Identity

- **Role**: Problem Extraction Specialist
- **Pipeline Position**: 2nd agent (after WU)
- **Category**: DISCOVER
- **Question Answered**: WHAT is the problem?

---

## Mission

Extract and document the core problems the project must solve.

---

## On Activation

1. Read handoff from previous agent
2. Read session.yaml for context

---

## Execution: 5 Phases

### Phase 1: Extraction
Gather user input.

---

## Self-Validation Criteria

- All requirements extracted
- Score >= 95%

---

## Handoff Protocol

Generate handoff document.

---

## Protocols

Universal Protocols 5.1-5.8 apply.

---

## Behavioral

- Communicate clearly
- Adapt to user level
`;

const MINIMAL_AGENT_CONTENT = `# Minimal Agent

## Identity

- **Role**: Minimal Agent

## Mission

Do minimal things.
`;

function setupFixtures() {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });

  // Create all expected agent directories
  for (const [category, agents] of Object.entries(EXPECTED_AGENTS)) {
    mkdirSync(join(FIXTURES_DIR, 'agents', category), { recursive: true });
    for (const agent of agents) {
      writeFileSync(join(FIXTURES_DIR, 'agents', category, `${agent}.md`), VALID_AGENT_CONTENT);
    }
  }

  // Create orchestrator
  mkdirSync(join(FIXTURES_DIR, 'orchestrator'), { recursive: true });
  writeFileSync(join(FIXTURES_DIR, 'orchestrator', 'chati.md'), `# /chati — Orchestrator

## Identity

- **Name**: Chati
- **Role**: Orchestrator & Router

## On Activation

Load context and route.

## Protocols

All universal protocols apply.
`);

  // Create entity registry for cross-reference
  mkdirSync(join(FIXTURES_DIR, 'data'), { recursive: true });
  const registryContent = `metadata:
  version: "1.0.0"
  entity_count: 13
entities:
  agents:
    orchestrator:
      path: chati.dev/orchestrator/chati.md
      type: agent
    greenfield-wu:
      path: chati.dev/agents/discover/greenfield-wu.md
      type: agent
    brownfield-wu:
      path: chati.dev/agents/discover/brownfield-wu.md
      type: agent
    brief:
      path: chati.dev/agents/discover/brief.md
      type: agent
    detail:
      path: chati.dev/agents/plan/detail.md
      type: agent
    architect:
      path: chati.dev/agents/plan/architect.md
      type: agent
    ux:
      path: chati.dev/agents/plan/ux.md
      type: agent
    phases:
      path: chati.dev/agents/plan/phases.md
      type: agent
    tasks:
      path: chati.dev/agents/plan/tasks.md
      type: agent
    qa-planning:
      path: chati.dev/agents/quality/qa-planning.md
      type: agent
    qa-implementation:
      path: chati.dev/agents/quality/qa-implementation.md
      type: agent
    dev:
      path: chati.dev/agents/build/dev.md
      type: agent
    devops:
      path: chati.dev/agents/deploy/devops.md
      type: agent
`;
  writeFileSync(join(FIXTURES_DIR, 'data', 'entity-registry.yaml'), registryContent);
}

function cleanupFixtures() {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
}

describe('validate-agents', () => {
  before(() => setupFixtures());

  describe('EXPECTED_AGENTS', () => {
    it('has 5 categories', () => {
      assert.equal(Object.keys(EXPECTED_AGENTS).length, 5);
    });

    it('has 12 agents total', () => {
      assert.equal(ALL_AGENT_NAMES.length, 12);
    });

    it('includes expected agents', () => {
      assert.ok(ALL_AGENT_NAMES.includes('brief'));
      assert.ok(ALL_AGENT_NAMES.includes('dev'));
      assert.ok(ALL_AGENT_NAMES.includes('devops'));
      assert.ok(ALL_AGENT_NAMES.includes('qa-planning'));
    });
  });

  describe('getAgentCompleteness', () => {
    it('scores a complete agent highly', () => {
      const result = getAgentCompleteness(VALID_AGENT_CONTENT);
      assert.ok(result.score >= 75, `Score ${result.score} should be >= 75`);
      assert.ok(result.missing.length <= 2);
    });

    it('scores a minimal agent low', () => {
      const result = getAgentCompleteness(MINIMAL_AGENT_CONTENT);
      assert.ok(result.score < 50, `Score ${result.score} should be < 50`);
      assert.ok(result.missing.length > 3);
    });

    it('reports missing sections', () => {
      const result = getAgentCompleteness(MINIMAL_AGENT_CONTENT);
      assert.ok(result.missing.includes('Handoff'));
      assert.ok(result.missing.includes('Protocols'));
    });

    it('returns 0 for empty content', () => {
      const result = getAgentCompleteness('');
      assert.equal(result.score, 0);
    });
  });

  describe('validateAgent', () => {
    it('validates a well-formed agent file', () => {
      const result = validateAgent(FIXTURES_DIR, join('agents', 'discover', 'brief.md'));
      assert.ok(result.valid);
      assert.equal(result.errors.length, 0);
      assert.ok(result.completeness);
      assert.ok(result.identity);
    });

    it('reports missing file as error', () => {
      const result = validateAgent(FIXTURES_DIR, join('agents', 'discover', 'nonexistent.md'));
      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    it('extracts identity from agent content', () => {
      const result = validateAgent(FIXTURES_DIR, join('agents', 'discover', 'brief.md'));
      assert.equal(result.identity.role, 'Problem Extraction Specialist');
      assert.equal(result.identity.category, 'DISCOVER');
    });
  });

  describe('validateAllAgents', () => {
    it('validates all agents in a complete framework', () => {
      const report = validateAllAgents(FIXTURES_DIR);
      assert.ok(report.valid);
      assert.equal(report.totalExpected, 13);
      assert.equal(report.totalFound, 13);
      assert.equal(report.missing.length, 0);
    });

    it('reports missing agents', () => {
      // Create a partial framework
      const partialDir = join(FIXTURES_DIR, '_partial');
      mkdirSync(join(partialDir, 'agents', 'discover'), { recursive: true });
      mkdirSync(join(partialDir, 'orchestrator'), { recursive: true });

      writeFileSync(join(partialDir, 'agents', 'discover', 'brief.md'), VALID_AGENT_CONTENT);
      writeFileSync(join(partialDir, 'orchestrator', 'chati.md'), '# Orchestrator\n## On Activation\nRoute.');

      const report = validateAllAgents(partialDir);
      assert.equal(report.valid, false);
      assert.ok(report.missing.length > 0);
      assert.ok(report.missing.includes('dev'));
      assert.ok(report.missing.includes('devops'));

      rmSync(partialDir, { recursive: true, force: true });
    });

    it('handles nonexistent framework directory', () => {
      const report = validateAllAgents('/nonexistent/path');
      assert.equal(report.valid, false);
      assert.ok(report.errors.length > 0);
    });

    it('cross-references with entity registry', () => {
      const report = validateAllAgents(FIXTURES_DIR);
      // All agents are in our registry, so no cross-ref warnings
      const registryWarnings = report.warnings.filter(w => w.includes('entity-registry'));
      assert.equal(registryWarnings.length, 0);
    });
  });

  after(() => cleanupFixtures());
});
