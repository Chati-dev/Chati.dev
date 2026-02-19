import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { detectProjectType, detectInstalledIDEs } from '../../src/utils/detector.js';

describe('detectProjectType', () => {
  let tempDir;

  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'chati-test-'));
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns greenfield for empty directory', () => {
    const result = detectProjectType(tempDir);
    assert.equal(result.suggestion, 'greenfield');
    assert.equal(result.confidence, 'low');
  });

  it('returns brownfield when 2+ signals detected', () => {
    writeFileSync(join(tempDir, 'package.json'), '{}');
    mkdirSync(join(tempDir, 'src'), { recursive: true });

    const result = detectProjectType(tempDir);
    assert.equal(result.suggestion, 'brownfield');
    assert.equal(result.confidence, 'high');
    assert.equal(result.signals.packageJson, true);
    assert.equal(result.signals.srcDir, true);
  });

  it('returns greenfield with medium confidence for 1 signal', () => {
    const singleDir = mkdtempSync(join(tmpdir(), 'chati-test-single-'));
    writeFileSync(join(singleDir, 'package.json'), '{}');

    const result = detectProjectType(singleDir);
    assert.equal(result.suggestion, 'greenfield');
    assert.equal(result.confidence, 'medium');

    rmSync(singleDir, { recursive: true, force: true });
  });
});

describe('detectInstalledIDEs', () => {
  it('returns an array', () => {
    const result = detectInstalledIDEs();
    assert.ok(Array.isArray(result));
  });

  it('contains only known IDE identifiers', () => {
    const knownIDEs = ['claude-code', 'vscode', 'cursor', 'antigravity', 'codex-cli', 'gemini-cli', 'github-copilot'];
    const result = detectInstalledIDEs();
    for (const ide of result) {
      assert.ok(knownIDEs.includes(ide), `Unknown IDE: ${ide}`);
    }
  });
});
