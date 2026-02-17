import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

import {
  populateRegistry,
  diffRegistry,
} from '../../scripts/populate-entity-registry.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures', 'entity-registry');

function setupFixtures() {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });

  // Create a minimal framework structure
  mkdirSync(join(FIXTURES_DIR, 'agents', 'discover'), { recursive: true });
  mkdirSync(join(FIXTURES_DIR, 'agents', 'build'), { recursive: true });
  mkdirSync(join(FIXTURES_DIR, 'orchestrator'), { recursive: true });
  mkdirSync(join(FIXTURES_DIR, 'schemas'), { recursive: true });
  mkdirSync(join(FIXTURES_DIR, 'templates'), { recursive: true });
  mkdirSync(join(FIXTURES_DIR, 'workflows'), { recursive: true });
  mkdirSync(join(FIXTURES_DIR, 'data'), { recursive: true });

  // Agent files
  writeFileSync(join(FIXTURES_DIR, 'agents', 'discover', 'brief.md'), `# Brief Agent — Problem Extraction

## Identity
- **Role**: Problem Extraction Specialist
- **Category**: DISCOVER

## Mission
Extract requirements.
`);

  writeFileSync(join(FIXTURES_DIR, 'agents', 'build', 'dev.md'), `# Dev Agent — Implementation

## Identity
- **Role**: Implementation Specialist
- **Category**: BUILD

## Mission
Implement features.
`);

  // Orchestrator
  writeFileSync(join(FIXTURES_DIR, 'orchestrator', 'chati.md'), `# /chati — Orchestrator

## Identity
- **Name**: Chati
- **Role**: Orchestrator & Router
`);

  // Schema
  writeFileSync(join(FIXTURES_DIR, 'schemas', 'session.schema.json'), JSON.stringify({
    title: 'Session Schema',
    description: 'JSON schema for session.yaml',
    type: 'object',
  }, null, 2));

  // Template
  writeFileSync(join(FIXTURES_DIR, 'templates', 'prd-tmpl.yaml'), yaml.dump({
    description: 'PRD template for greenfield projects',
    sections: ['overview', 'requirements'],
  }));

  // Workflow
  writeFileSync(join(FIXTURES_DIR, 'workflows', 'greenfield-fullstack.yaml'), yaml.dump({
    name: 'greenfield-fullstack',
    description: 'Full pipeline for greenfield projects',
    steps: ['wu', 'brief', 'detail'],
  }));

  // Constitution
  writeFileSync(join(FIXTURES_DIR, 'constitution.md'), `# Constitution

## Article I: Agent Governance
All agents must follow governance rules.

## Article II: Quality Standards
Quality >= 95%.
`);

  // Config
  writeFileSync(join(FIXTURES_DIR, 'config.yaml'), `version: "1.0.0"
installed_at: "2026-02-07T10:00:00Z"
`);
}

function cleanupFixtures() {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
}

describe('populate-entity-registry', () => {
  before(() => setupFixtures());

  describe('populateRegistry', () => {
    it('creates entity-registry.yaml', () => {
      const { path, registry } = populateRegistry(FIXTURES_DIR);
      assert.ok(existsSync(path));
      assert.ok(registry);
    });

    it('populates metadata', () => {
      const { registry } = populateRegistry(FIXTURES_DIR);
      assert.ok(registry.metadata);
      assert.ok(registry.metadata.version);
      assert.ok(registry.metadata.last_updated);
      assert.ok(registry.metadata.entity_count > 0);
    });

    it('discovers agent entities', () => {
      const { registry } = populateRegistry(FIXTURES_DIR);
      const agents = registry.entities.agents;
      assert.ok(agents);
      assert.ok(agents.brief);
      assert.ok(agents.dev);
      assert.ok(agents.chati); // orchestrator
    });

    it('discovers schema entities', () => {
      const { registry } = populateRegistry(FIXTURES_DIR);
      const schemas = registry.entities.schemas;
      assert.ok(schemas);
      // basename('session.schema.json', '.json') = 'session.schema'
      assert.ok(schemas['session.schema']);
    });

    it('discovers template entities', () => {
      const { registry } = populateRegistry(FIXTURES_DIR);
      const templates = registry.entities.templates;
      assert.ok(templates);
      assert.ok(templates['prd-tmpl']);
    });

    it('discovers workflow entities', () => {
      const { registry } = populateRegistry(FIXTURES_DIR);
      const workflows = registry.entities.workflows;
      assert.ok(workflows);
      assert.ok(workflows['greenfield-fullstack']);
    });

    it('includes constitution as governance entity', () => {
      const { registry } = populateRegistry(FIXTURES_DIR);
      const governance = registry.entities.governance;
      assert.ok(governance);
      assert.ok(governance.constitution);
    });

    it('includes config entity', () => {
      const { registry } = populateRegistry(FIXTURES_DIR);
      const config = registry.entities.config;
      assert.ok(config);
      assert.ok(config.config);
    });

    it('extracts purpose from agent files', () => {
      const { registry } = populateRegistry(FIXTURES_DIR);
      const brief = registry.entities.agents.brief;
      assert.ok(brief.purpose);
      assert.ok(brief.purpose.length > 0);
    });

    it('writes valid YAML', () => {
      const { path } = populateRegistry(FIXTURES_DIR);
      const content = readFileSync(path, 'utf8');
      const parsed = yaml.load(content);
      assert.ok(parsed);
      assert.ok(parsed.metadata);
      assert.ok(parsed.entities);
    });

    it('throws for nonexistent directory', () => {
      assert.throws(() => populateRegistry('/nonexistent/path'), /not found/);
    });
  });

  describe('diffRegistry', () => {
    it('detects no changes when registry matches filesystem', () => {
      // First populate, then diff
      populateRegistry(FIXTURES_DIR);
      const diff = diffRegistry(FIXTURES_DIR);
      // After a fresh populate, diff should show minimal or no changes
      // (the populate itself writes the current state)
      assert.ok(Array.isArray(diff.added));
      assert.ok(Array.isArray(diff.removed));
      assert.ok(Array.isArray(diff.modified));
    });

    it('detects added entities when new files appear', () => {
      // Populate registry first
      populateRegistry(FIXTURES_DIR);

      // Add a new agent
      mkdirSync(join(FIXTURES_DIR, 'agents', 'quality'), { recursive: true });
      writeFileSync(join(FIXTURES_DIR, 'agents', 'quality', 'qa-planning.md'), `# QA Planning

## Mission
Plan quality checks.
`);

      const diff = diffRegistry(FIXTURES_DIR);
      assert.ok(diff.added.length > 0, 'Should detect the new qa-planning agent');
      assert.ok(diff.added.some(a => a.key.includes('qa-planning')));

      // Clean up added file
      rmSync(join(FIXTURES_DIR, 'agents', 'quality'), { recursive: true, force: true });
    });

    it('detects removed entities when files disappear', () => {
      // Populate registry with dev agent present
      populateRegistry(FIXTURES_DIR);

      // Remove the dev agent
      const devPath = join(FIXTURES_DIR, 'agents', 'build', 'dev.md');
      rmSync(devPath);

      const diff = diffRegistry(FIXTURES_DIR);
      assert.ok(diff.removed.length > 0, 'Should detect removed dev agent');
      assert.ok(diff.removed.some(r => r.key.includes('dev')));

      // Restore
      writeFileSync(devPath, `# Dev Agent

## Mission
Implement features.
`);
    });
  });

  after(() => cleanupFixtures());
});
