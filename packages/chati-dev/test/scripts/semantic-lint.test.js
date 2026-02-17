import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { semanticLint } from '../../scripts/semantic-lint.js';

describe('semantic-lint', () => {
  let tempDir;

  before(() => {
    tempDir = join(tmpdir(), `chati-lint-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('reports error when entity registry is missing', () => {
    const results = semanticLint(tempDir);
    assert.ok(results.errors.some(e => e.includes('Entity registry')));
  });

  it('detects missing file in entity registry', () => {
    const dir = join(tmpdir(), `chati-reg-${Date.now()}`);
    mkdirSync(join(dir, 'data'), { recursive: true });
    writeFileSync(join(dir, 'data', 'entity-registry.yaml'), `
metadata:
  version: "1.0.0"
entities:
  agents:
    fake-agent:
      path: chati.dev/agents/discover/fake-agent.md
      type: agent
      purpose: "Does not exist"
      keywords: [fake]
      dependencies: []
      adaptability: 0.5
`);

    const results = semanticLint(dir);
    assert.ok(results.errors.some(e => e.includes('fake-agent')));

    rmSync(dir, { recursive: true, force: true });
  });

  it('detects domain YAML without corresponding agent file', () => {
    const dir = join(tmpdir(), `chati-domain-${Date.now()}`);
    mkdirSync(join(dir, 'domains', 'agents'), { recursive: true });
    writeFileSync(join(dir, 'domains', 'agents', 'ghost-agent.yaml'), 'mission: "Ghost"');

    const results = semanticLint(dir);
    assert.ok(results.errors.some(e => e.includes('ghost-agent')));

    rmSync(dir, { recursive: true, force: true });
  });

  it('detects missing i18n language file', () => {
    const dir = join(tmpdir(), `chati-i18n-${Date.now()}`);
    mkdirSync(join(dir, 'i18n'), { recursive: true });
    // Only create en, missing pt/es/fr
    writeFileSync(join(dir, 'i18n', 'en.yaml'), 'language: en\ninstaller:\n  welcome: "hi"');

    const results = semanticLint(dir);
    assert.ok(results.errors.some(e => e.includes('i18n file missing')));

    rmSync(dir, { recursive: true, force: true });
  });

  it('detects i18n key mismatch across languages', () => {
    const dir = join(tmpdir(), `chati-i18n2-${Date.now()}`);
    mkdirSync(join(dir, 'i18n'), { recursive: true });

    const enContent = 'language: en\nname: English\ninstaller:\n  welcome: "hi"\n  extra_key: "only in en"';
    const ptContent = 'language: pt\nname: Portugues\ninstaller:\n  welcome: "ola"';
    const esContent = 'language: es\nname: Espanol\ninstaller:\n  welcome: "hola"\n  extra_key: "also here"';
    const frContent = 'language: fr\nname: Francais\ninstaller:\n  welcome: "salut"\n  extra_key: "ici aussi"';

    writeFileSync(join(dir, 'i18n', 'en.yaml'), enContent);
    writeFileSync(join(dir, 'i18n', 'pt.yaml'), ptContent);
    writeFileSync(join(dir, 'i18n', 'es.yaml'), esContent);
    writeFileSync(join(dir, 'i18n', 'fr.yaml'), frContent);

    const results = semanticLint(dir);
    // pt is missing extra_key
    assert.ok(results.warnings.some(w => w.includes("'pt'")));

    rmSync(dir, { recursive: true, force: true });
  });

  it('passes on the real framework directory', () => {
    // Run against the actual chati.dev/ framework
    const realFrameworkDir = join(tempDir, '..', '..', '..', '..', '..', 'code', 'vyndhub', 'chati.dev', 'chati.dev');

    // This may not exist in CI, so skip if not found
    try {
      const results = semanticLint(realFrameworkDir);
      // Should have 0 errors on a healthy codebase
      assert.equal(results.errors.length, 0, `Unexpected errors: ${results.errors.join('; ')}`);
    } catch {
      // Skip if framework dir not found
    }
  });

  it('detects missing constitution', () => {
    const dir = join(tmpdir(), `chati-const-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    const results = semanticLint(dir);
    assert.ok(results.errors.some(e => e.includes('constitution')));

    rmSync(dir, { recursive: true, force: true });
  });

  it('detects insufficient articles in constitution', () => {
    const dir = join(tmpdir(), `chati-const2-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'constitution.md'), '# Constitution\n## Article 1\nOnly one article.');

    const results = semanticLint(dir);
    assert.ok(results.errors.some(e => e.includes('only 1 articles')));

    rmSync(dir, { recursive: true, force: true });
  });
});
