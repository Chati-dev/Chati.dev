import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { validateInstallation } from '../../src/installer/validator.js';

describe('validateInstallation', () => {
  let tempDir;

  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'chati-validate-'));

    // Create minimal valid structure
    const chatiDir = join(tempDir, 'chati.dev');
    mkdirSync(join(chatiDir, 'orchestrator'), { recursive: true });
    mkdirSync(join(chatiDir, 'agents', 'discover'), { recursive: true });
    mkdirSync(join(chatiDir, 'agents', 'plan'), { recursive: true });
    mkdirSync(join(chatiDir, 'agents', 'quality'), { recursive: true });
    mkdirSync(join(chatiDir, 'agents', 'build'), { recursive: true });
    mkdirSync(join(chatiDir, 'agents', 'deploy'), { recursive: true });
    mkdirSync(join(chatiDir, 'schemas'), { recursive: true });
    mkdirSync(join(chatiDir, 'workflows'), { recursive: true });
    mkdirSync(join(chatiDir, 'templates'), { recursive: true });
    mkdirSync(join(chatiDir, 'intelligence'), { recursive: true });
    mkdirSync(join(chatiDir, 'data'), { recursive: true });
    mkdirSync(join(tempDir, '.chati', 'memories', 'shared', 'durable'), { recursive: true });
    mkdirSync(join(tempDir, '.chati', 'memories', 'shared', 'daily'), { recursive: true });
    mkdirSync(join(tempDir, '.chati', 'memories', 'shared', 'session'), { recursive: true });

    // Create agent files
    const agentContent = '# Agent\n## Protocol 5.1\nSelf-validation protocol.';
    writeFileSync(join(chatiDir, 'orchestrator', 'chati.md'), agentContent);
    for (const a of ['greenfield-wu', 'brownfield-wu', 'brief']) {
      writeFileSync(join(chatiDir, 'agents', 'discover', `${a}.md`), agentContent);
    }
    for (const a of ['detail', 'architect', 'ux', 'phases', 'tasks']) {
      writeFileSync(join(chatiDir, 'agents', 'plan', `${a}.md`), agentContent);
    }
    writeFileSync(join(chatiDir, 'agents', 'quality', 'qa-planning.md'), agentContent);
    writeFileSync(join(chatiDir, 'agents', 'quality', 'qa-implementation.md'), agentContent);
    writeFileSync(join(chatiDir, 'agents', 'build', 'dev.md'), agentContent);
    writeFileSync(join(chatiDir, 'agents', 'deploy', 'devops.md'), agentContent);

    // Constitution with 17 articles
    let constitution = '# Constitution\n## Preamble\n';
    const numerals = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII'];
    for (let i = 1; i <= 17; i++) {
      constitution += `## Article ${numerals[i-1]}: Title\nContent.\n\n`;
    }
    writeFileSync(join(chatiDir, 'constitution.md'), constitution);

    // Session
    writeFileSync(join(tempDir, '.chati', 'session.yaml'), 'project:\n  name: test\n');

    // Schemas (5 total)
    for (const s of ['session.schema.json', 'config.schema.json', 'task.schema.json', 'context.schema.json', 'memory.schema.json']) {
      writeFileSync(join(chatiDir, 'schemas', s), '{}');
    }

    // Workflows
    for (const w of ['greenfield-fullstack.yaml', 'brownfield-fullstack.yaml', 'brownfield-discovery.yaml', 'brownfield-service.yaml', 'brownfield-ui.yaml']) {
      writeFileSync(join(chatiDir, 'workflows', w), 'name: test');
    }

    // Templates
    for (const t of ['prd-tmpl.yaml', 'brownfield-prd-tmpl.yaml', 'fullstack-architecture-tmpl.yaml', 'task-tmpl.yaml', 'qa-gate-tmpl.yaml']) {
      writeFileSync(join(chatiDir, 'templates', t), 'name: test');
    }

    // Intelligence files (6: 3 specs + 3 yaml)
    for (const f of ['context-engine.md', 'memory-layer.md', 'decision-engine.md']) {
      writeFileSync(join(chatiDir, 'intelligence', f), '# Spec\nContent.');
    }
    for (const f of ['gotchas.yaml', 'patterns.yaml', 'confidence.yaml']) {
      writeFileSync(join(chatiDir, 'intelligence', f), 'items: []');
    }

    // Entity registry
    writeFileSync(join(chatiDir, 'data', 'entity-registry.yaml'), 'metadata:\n  version: "1.0.0"');

    // Context files (@ import chain for CLAUDE.md)
    mkdirSync(join(chatiDir, 'context'), { recursive: true });
    for (const f of ['root.md', 'governance.md', 'protocols.md', 'quality.md']) {
      writeFileSync(join(chatiDir, 'context', f), `# ${f}\nContent.`);
    }
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('passes all checks for valid installation', async () => {
    const results = await validateInstallation(tempDir);
    assert.equal(results.agents.pass, true, 'agents should pass');
    assert.equal(results.constitution.pass, true, 'constitution should pass');
    assert.equal(results.session.pass, true, 'session should pass');
    assert.equal(results.schemas.pass, true, 'schemas should pass');
    assert.equal(results.workflows.pass, true, 'workflows should pass');
    assert.equal(results.templates.pass, true, 'templates should pass');
    assert.equal(results.intelligence.pass, true, 'intelligence should pass');
    assert.equal(results.registry.pass, true, 'registry should pass');
    assert.equal(results.memories.pass, true, 'memories should pass');
    assert.equal(results.context.pass, true, 'context should pass');
    assert.equal(results.passed, results.total, 'all checks should pass');
  });

  it('fails agents check when agents are missing', async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'chati-empty-'));
    mkdirSync(join(emptyDir, 'chati.dev'), { recursive: true });
    mkdirSync(join(emptyDir, '.chati'), { recursive: true });

    const results = await validateInstallation(emptyDir);
    assert.equal(results.agents.pass, false);

    rmSync(emptyDir, { recursive: true, force: true });
  });

  it('returns correct total count', async () => {
    const results = await validateInstallation(tempDir);
    assert.equal(results.total, 11, 'should check 11 categories');
  });

  it('fails intelligence when spec files are missing', async () => {
    const partialDir = mkdtempSync(join(tmpdir(), 'chati-partial-'));
    mkdirSync(join(partialDir, 'chati.dev', 'intelligence'), { recursive: true });
    // Only create 2 of 6 files
    writeFileSync(join(partialDir, 'chati.dev', 'intelligence', 'gotchas.yaml'), 'items: []');
    writeFileSync(join(partialDir, 'chati.dev', 'intelligence', 'patterns.yaml'), 'items: []');

    const results = await validateInstallation(partialDir);
    assert.equal(results.intelligence.pass, false);
    assert.equal(results.intelligence.details[0].found, 2);

    rmSync(partialDir, { recursive: true, force: true });
  });

  it('fails schemas when new schemas are missing', async () => {
    const partialDir = mkdtempSync(join(tmpdir(), 'chati-schemas-'));
    mkdirSync(join(partialDir, 'chati.dev', 'schemas'), { recursive: true });
    // Only create 3 of 5 schemas
    for (const s of ['session.schema.json', 'config.schema.json', 'task.schema.json']) {
      writeFileSync(join(partialDir, 'chati.dev', 'schemas', s), '{}');
    }

    const results = await validateInstallation(partialDir);
    assert.equal(results.schemas.pass, false);

    rmSync(partialDir, { recursive: true, force: true });
  });

  it('fails context when context files are missing', async () => {
    const partialDir = mkdtempSync(join(tmpdir(), 'chati-context-'));
    mkdirSync(join(partialDir, 'chati.dev', 'context'), { recursive: true });
    // Only create 2 of 4 context files
    writeFileSync(join(partialDir, 'chati.dev', 'context', 'root.md'), '# Root');
    writeFileSync(join(partialDir, 'chati.dev', 'context', 'governance.md'), '# Gov');

    const results = await validateInstallation(partialDir);
    assert.equal(results.context.pass, false);
    assert.equal(results.context.details[0].found, 2);

    rmSync(partialDir, { recursive: true, force: true });
  });

  it('requires 17 constitution articles', async () => {
    const partialDir = mkdtempSync(join(tmpdir(), 'chati-const-'));
    mkdirSync(join(partialDir, 'chati.dev'), { recursive: true });
    // Only 10 articles (old threshold)
    let constitution = '# Constitution\n';
    for (let i = 1; i <= 10; i++) {
      constitution += `## Article ${i}: Title\nContent.\n\n`;
    }
    writeFileSync(join(partialDir, 'chati.dev', 'constitution.md'), constitution);

    const results = await validateInstallation(partialDir);
    assert.equal(results.constitution.pass, false, 'should fail with only 10 articles');

    rmSync(partialDir, { recursive: true, force: true });
  });
});
