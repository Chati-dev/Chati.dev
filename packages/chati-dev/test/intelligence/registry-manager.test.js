import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  checkRegistry, getRegistryStats, validateEntities, runHealthCheck,
} from '../../src/intelligence/registry-manager.js';

describe('registry-manager', () => {
  let tempDir;

  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'chati-reg-'));
    const chatiDir = join(tempDir, 'chati.dev');

    // Create minimal framework structure
    mkdirSync(join(chatiDir, 'data'), { recursive: true });
    mkdirSync(join(chatiDir, 'schemas'), { recursive: true });
    mkdirSync(join(chatiDir, 'orchestrator'), { recursive: true });
    mkdirSync(join(chatiDir, 'agents', 'discover'), { recursive: true });
    mkdirSync(join(chatiDir, 'agents', 'plan'), { recursive: true });
    mkdirSync(join(chatiDir, 'agents', 'quality'), { recursive: true });
    mkdirSync(join(chatiDir, 'agents', 'build'), { recursive: true });
    mkdirSync(join(chatiDir, 'agents', 'deploy'), { recursive: true });

    // Create files referenced by registry
    writeFileSync(join(chatiDir, 'orchestrator', 'chati.md'), '# Orchestrator');
    writeFileSync(join(chatiDir, 'agents', 'discover', 'brief.md'), '# Brief');

    // Create schemas
    for (const s of ['session.schema.json', 'config.schema.json', 'task.schema.json', 'context.schema.json', 'memory.schema.json']) {
      writeFileSync(join(chatiDir, 'schemas', s), '{"$schema": "https://json-schema.org/draft/2020-12/schema"}');
    }

    // Create constitution with 17 articles
    let constitution = '# Constitution\n';
    for (let i = 1; i <= 17; i++) {
      constitution += `## Article ${i}: Title\nContent.\n\n`;
    }
    writeFileSync(join(chatiDir, 'constitution.md'), constitution);

    // Create agents
    for (const a of ['greenfield-wu', 'brownfield-wu', 'brief']) {
      writeFileSync(join(chatiDir, 'agents', 'discover', `${a}.md`), '# Agent');
    }
    for (const a of ['detail', 'architect', 'ux', 'phases', 'tasks']) {
      writeFileSync(join(chatiDir, 'agents', 'plan', `${a}.md`), '# Agent');
    }
    writeFileSync(join(chatiDir, 'agents', 'quality', 'qa-planning.md'), '# Agent');
    writeFileSync(join(chatiDir, 'agents', 'quality', 'qa-implementation.md'), '# Agent');
    writeFileSync(join(chatiDir, 'agents', 'build', 'dev.md'), '# Agent');
    writeFileSync(join(chatiDir, 'agents', 'deploy', 'devops.md'), '# Agent');

    // Create entity registry with 2 entities (both exist)
    writeFileSync(join(chatiDir, 'data', 'entity-registry.yaml'), `metadata:
  version: "1.0.0"
  entity_count: 2
entities:
  agents:
    orchestrator:
      path: chati.dev/orchestrator/chati.md
      type: agent
      purpose: "Route requests"
      keywords: [routing]
      adaptability: 0.2
    brief:
      path: chati.dev/agents/discover/brief.md
      type: agent
      purpose: "Extract requirements"
      keywords: [requirements]
      adaptability: 0.4
`);
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('checkRegistry passes when all entities exist', () => {
    const result = checkRegistry(tempDir);
    assert.equal(result.valid, true);
    assert.equal(result.totalEntities, 2);
    assert.equal(result.found, 2);
    assert.equal(result.missing.length, 0);
  });

  it('checkRegistry detects missing entities', () => {
    const badDir = mkdtempSync(join(tmpdir(), 'chati-bad-'));
    mkdirSync(join(badDir, 'chati.dev', 'data'), { recursive: true });
    writeFileSync(join(badDir, 'chati.dev', 'data', 'entity-registry.yaml'), `metadata:
  version: "1.0.0"
  entity_count: 1
entities:
  agents:
    missing:
      path: chati.dev/agents/nonexistent.md
      type: agent
      purpose: "Does not exist"
      keywords: [test]
      adaptability: 0.5
`);

    const result = checkRegistry(badDir);
    assert.equal(result.valid, false);
    assert.equal(result.missing.length, 1);

    rmSync(badDir, { recursive: true, force: true });
  });

  it('checkRegistry returns error for missing registry', () => {
    const result = checkRegistry('/nonexistent/path');
    assert.equal(result.valid, false);
    assert.ok(result.error);
  });

  it('getRegistryStats returns entity counts', () => {
    const stats = getRegistryStats(tempDir);
    assert.equal(stats.exists, true);
    assert.equal(stats.version, '1.0.0');
    assert.equal(stats.totalEntities, 2);
    assert.equal(stats.byType.agent, 2);
  });

  it('getRegistryStats handles missing registry', () => {
    const stats = getRegistryStats('/nonexistent/path');
    assert.equal(stats.exists, false);
    assert.equal(stats.totalEntities, 0);
  });

  it('validateEntities returns validation result', () => {
    const result = validateEntities(tempDir);
    assert.equal(result.valid, true);
    assert.equal(result.total, 2);
    assert.equal(result.found, 2);
  });

  it('runHealthCheck returns overall status', () => {
    const checks = runHealthCheck(tempDir);
    assert.ok(checks.registry.pass);
    assert.ok(checks.schemas.pass);
    assert.ok(checks.constitution.pass);
    assert.ok(checks.agents.pass);
    assert.ok(checks.entities.pass);
    assert.equal(checks.overall, 'HEALTHY');
    assert.equal(checks.passCount, 5);
  });

  it('runHealthCheck returns UNHEALTHY for empty dir', () => {
    const checks = runHealthCheck('/nonexistent/path');
    assert.equal(checks.overall, 'UNHEALTHY');
  });
});
