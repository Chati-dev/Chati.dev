/**
 * @fileoverview Tests for wizard i18n module.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

import { loadLanguage, t, getCurrentLanguage, SUPPORTED_LANGUAGES } from '../../src/wizard/i18n.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frameworkI18nDir = join(__dirname, '..', '..', 'framework', 'i18n');

// ---------------------------------------------------------------------------
// SUPPORTED_LANGUAGES
// ---------------------------------------------------------------------------

describe('SUPPORTED_LANGUAGES', () => {
  it('contains exactly 4 languages', () => {
    assert.equal(SUPPORTED_LANGUAGES.length, 4);
  });

  it('includes en, pt, es, fr', () => {
    const values = SUPPORTED_LANGUAGES.map((l) => l.value);
    assert.deepEqual(values, ['en', 'pt', 'es', 'fr']);
  });

  it('each entry has value and label', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      assert.equal(typeof lang.value, 'string');
      assert.equal(typeof lang.label, 'string');
    }
  });
});

// ---------------------------------------------------------------------------
// loadLanguage
// ---------------------------------------------------------------------------

describe('loadLanguage', () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'chati-i18n-'));
    // Setup i18n files in temp dir mimicking installed project
    const i18nDir = join(dir, 'chati.dev', 'i18n');
    mkdirSync(i18nDir, { recursive: true });
    for (const lang of ['en', 'pt', 'es', 'fr']) {
      copyFileSync(join(frameworkI18nDir, `${lang}.yaml`), join(i18nDir, `${lang}.yaml`));
    }
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
    // Reset to English
    loadLanguage('en');
  });

  it('loads English using built-in fallback', () => {
    const result = loadLanguage('en');
    assert.ok(result.installer);
    assert.equal(result.installer.welcome, 'Welcome to Chati.dev');
  });

  it('loads Portuguese from targetDir', () => {
    const result = loadLanguage('pt', dir);
    assert.ok(result.installer);
    assert.equal(result.installer.welcome, 'Bem-vindo ao Chati.dev');
  });

  it('loads Spanish from targetDir', () => {
    const result = loadLanguage('es', dir);
    assert.ok(result.installer);
    assert.equal(result.installer.welcome, 'Bienvenido a Chati.dev');
  });

  it('loads French from targetDir', () => {
    const result = loadLanguage('fr', dir);
    assert.ok(result.installer);
    assert.equal(result.installer.welcome, 'Bienvenue sur Chati.dev');
  });

  it('falls back to English for unknown language', () => {
    const result = loadLanguage('xx');
    assert.ok(result.installer);
    assert.equal(result.installer.welcome, 'Welcome to Chati.dev');
  });

  it('returns object with all 5 sections', () => {
    const result = loadLanguage('en');
    assert.ok(result.installer);
    assert.ok(result.agents);
    assert.ok(result.options);
    assert.ok(result.status);
    assert.ok(result.errors);
  });
});

// ---------------------------------------------------------------------------
// t (translation function)
// ---------------------------------------------------------------------------

describe('t', () => {
  before(() => {
    loadLanguage('en');
  });

  it('resolves dot-notation key', () => {
    const result = t('installer.welcome');
    assert.equal(result, 'Welcome to Chati.dev');
  });

  it('interpolates variables', () => {
    const result = t('agents.completed', { agent: 'Brief', score: 97 });
    assert.equal(result, 'Agent Brief completed with score 97%');
  });

  it('returns key when not found', () => {
    const result = t('nonexistent.key');
    assert.equal(result, 'nonexistent.key');
  });

  it('returns key when value is not a string', () => {
    const result = t('installer');
    assert.equal(result, 'installer');
  });

  it('works without vars parameter', () => {
    const result = t('installer.success');
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  it('preserves unmatched placeholders', () => {
    const result = t('agents.completed', { agent: 'Brief' });
    assert.ok(result.includes('{score}'));
  });
});

// ---------------------------------------------------------------------------
// getCurrentLanguage
// ---------------------------------------------------------------------------

describe('getCurrentLanguage', () => {
  it('returns en after loading English', () => {
    loadLanguage('en');
    assert.equal(getCurrentLanguage(), 'en');
  });

  it('returns pt after loading Portuguese', () => {
    loadLanguage('pt');
    assert.equal(getCurrentLanguage(), 'pt');
  });

  it('returns the lang code even for invalid languages', () => {
    loadLanguage('xx');
    assert.equal(getCurrentLanguage(), 'xx');
    // Reset
    loadLanguage('en');
  });
});
