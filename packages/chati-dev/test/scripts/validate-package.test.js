import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { validatePackage } from '../../scripts/validate-package.js';

describe('validate-package', () => {
  let tempDir;

  before(() => {
    tempDir = join(tmpdir(), `chati-pkg-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('reports error when framework/ is missing', () => {
    const results = validatePackage(tempDir);
    assert.ok(results.errors.length > 0);
    assert.ok(results.errors.some(e => e.includes('framework/')));
  });

  it('reports error when bundle dirs are missing', () => {
    // Create framework/ but empty
    mkdirSync(join(tempDir, 'framework'), { recursive: true });
    const results = validatePackage(tempDir);
    assert.ok(results.errors.some(e => e.includes('Missing framework directories')));
  });

  it('reports error when sensitive files are in publishable dirs', () => {
    const dirWithSecrets = join(tmpdir(), `chati-secrets-${Date.now()}`);
    mkdirSync(join(dirWithSecrets, 'framework'), { recursive: true });
    writeFileSync(join(dirWithSecrets, 'framework', '.signing-key.pem'), 'PRIVATE KEY');
    writeFileSync(join(dirWithSecrets, 'package.json'), JSON.stringify({
      exports: {}, bin: {},
    }));

    const results = validatePackage(dirWithSecrets);
    assert.ok(results.errors.some(e => e.includes('.signing-key.pem')));

    rmSync(dirWithSecrets, { recursive: true, force: true });
  });

  it('reports error when exports dont resolve', () => {
    const dirWithBadExports = join(tmpdir(), `chati-exports-${Date.now()}`);
    mkdirSync(dirWithBadExports, { recursive: true });
    writeFileSync(join(dirWithBadExports, 'package.json'), JSON.stringify({
      exports: { '.': './nonexistent.js' },
      bin: {},
    }));

    const results = validatePackage(dirWithBadExports);
    assert.ok(results.errors.some(e => e.includes('Unresolved exports')));

    rmSync(dirWithBadExports, { recursive: true, force: true });
  });

  it('reports error when bin entry is missing', () => {
    const dirWithBadBin = join(tmpdir(), `chati-bin-${Date.now()}`);
    mkdirSync(dirWithBadBin, { recursive: true });
    writeFileSync(join(dirWithBadBin, 'package.json'), JSON.stringify({
      exports: {},
      bin: { 'chati': 'bin/missing.js' },
    }));

    const results = validatePackage(dirWithBadBin);
    assert.ok(results.errors.some(e => e.includes('Missing bin')));

    rmSync(dirWithBadBin, { recursive: true, force: true });
  });

  it('passes for a complete package structure', () => {
    const completeDir = join(tmpdir(), `chati-complete-${Date.now()}`);
    mkdirSync(completeDir, { recursive: true });

    // Create package.json
    const binDir = join(completeDir, 'bin');
    const srcDir = join(completeDir, 'src', 'wizard');
    mkdirSync(binDir, { recursive: true });
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(binDir, 'chati.js'), '#!/usr/bin/env node\nconsole.log("hi");');
    writeFileSync(join(srcDir, 'index.js'), 'export default {};');
    writeFileSync(join(completeDir, 'package.json'), JSON.stringify({
      exports: { '.': './src/wizard/index.js' },
      bin: { 'chati': 'bin/chati.js' },
    }));

    // Create framework/ with all expected dirs and files
    const frameworkDir = join(completeDir, 'framework');
    const dirs = [
      'orchestrator', 'agents/discover', 'agents/plan', 'agents/quality', 'agents/build', 'agents/deploy',
      'templates', 'workflows', 'quality-gates', 'schemas', 'frameworks',
      'intelligence', 'patterns', 'hooks', 'domains', 'i18n', 'migrations',
      'data', 'tasks', 'context',
    ];
    for (const dir of dirs) {
      mkdirSync(join(frameworkDir, dir), { recursive: true });
      writeFileSync(join(frameworkDir, dir, '.gitkeep'), '');
    }
    writeFileSync(join(frameworkDir, 'constitution.md'), '# Constitution');
    writeFileSync(join(frameworkDir, 'config.yaml'), 'version: 1.0.0');

    const results = validatePackage(completeDir);
    assert.equal(results.errors.length, 0, `Unexpected errors: ${results.errors.join(', ')}`);
    assert.equal(results.passed, results.checks);

    rmSync(completeDir, { recursive: true, force: true });
  });
});
