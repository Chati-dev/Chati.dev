import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeEnvFiles, parseEnvFile, formatEnvFile } from '../../src/merger/env-merger.js';
import {
  mergeYamlFiles,
  findManagedSections,
  replaceManagedSections,
  deepMergeYaml,
} from '../../src/merger/yaml-merger.js';
import { replaceFile, shouldReplace } from '../../src/merger/replace-merger.js';
import { getMergeStrategy, mergeFile } from '../../src/merger/index.js';

// ─── env-merger ─────────────────────────────────────────────

describe('env-merger', () => {
  describe('parseEnvFile', () => {
    it('parses KEY=VALUE pairs', () => {
      const { entries } = parseEnvFile('DB_HOST=localhost\nDB_PORT=5432');
      assert.equal(entries.length, 2);
      assert.equal(entries[0].key, 'DB_HOST');
      assert.equal(entries[0].value, 'localhost');
      assert.equal(entries[1].key, 'DB_PORT');
      assert.equal(entries[1].value, '5432');
    });

    it('preserves comments', () => {
      const { entries } = parseEnvFile('# Database config\nDB_HOST=localhost');
      assert.equal(entries[0].isComment, true);
      assert.equal(entries[0].raw, '# Database config');
    });

    it('preserves blank lines', () => {
      const { entries } = parseEnvFile('A=1\n\nB=2');
      assert.equal(entries.length, 3);
      assert.equal(entries[1].isBlank, true);
    });
  });

  describe('formatEnvFile', () => {
    it('round-trips a parsed env file', () => {
      const original = 'DB_HOST=localhost\nDB_PORT=5432';
      const { entries } = parseEnvFile(original);
      const formatted = formatEnvFile(entries);
      assert.equal(formatted, original);
    });
  });

  describe('mergeEnvFiles', () => {
    it('preserves existing values for common keys', () => {
      const existing = 'DB_HOST=myserver\nDB_PORT=3306';
      const incoming = 'DB_HOST=defaulthost\nDB_PORT=5432\nDB_NAME=mydb';
      const merged = mergeEnvFiles(existing, incoming);

      assert.ok(merged.includes('DB_HOST=myserver'));
      assert.ok(merged.includes('DB_PORT=3306'));
    });

    it('adds new keys from incoming', () => {
      const existing = 'DB_HOST=myserver';
      const incoming = 'DB_HOST=default\nNEW_KEY=newvalue';
      const merged = mergeEnvFiles(existing, incoming);

      assert.ok(merged.includes('NEW_KEY=newvalue'));
    });

    it('preserves comments from existing file', () => {
      const existing = '# My config\nDB_HOST=myserver';
      const incoming = 'DB_HOST=default';
      const merged = mergeEnvFiles(existing, incoming);

      assert.ok(merged.includes('# My config'));
    });

    it('adds upgrade comment when new keys are added', () => {
      const existing = 'A=1';
      const incoming = 'A=1\nB=2';
      const merged = mergeEnvFiles(existing, incoming);

      assert.ok(merged.includes('# Added by chati.dev upgrade'));
    });

    it('does not add upgrade comment when no new keys', () => {
      const existing = 'A=1\nB=2';
      const incoming = 'A=1\nB=2';
      const merged = mergeEnvFiles(existing, incoming);

      assert.ok(!merged.includes('# Added by chati.dev upgrade'));
    });
  });
});

// ─── yaml-merger ────────────────────────────────────────────

describe('yaml-merger', () => {
  describe('findManagedSections', () => {
    it('finds managed sections between markers', () => {
      const content = [
        'key: value',
        '# CHATI-MANAGED-START',
        'managed: data',
        '# CHATI-MANAGED-END',
        'other: stuff',
      ].join('\n');

      const sections = findManagedSections(content);
      assert.equal(sections.length, 1);
      assert.equal(sections[0].content, 'managed: data');
    });

    it('finds multiple managed sections', () => {
      const content = [
        '# CHATI-MANAGED-START',
        'section1: a',
        '# CHATI-MANAGED-END',
        'gap: here',
        '# CHATI-MANAGED-START',
        'section2: b',
        '# CHATI-MANAGED-END',
      ].join('\n');

      const sections = findManagedSections(content);
      assert.equal(sections.length, 2);
      assert.equal(sections[0].content, 'section1: a');
      assert.equal(sections[1].content, 'section2: b');
    });

    it('returns empty array when no markers exist', () => {
      const sections = findManagedSections('key: value\nother: data');
      assert.equal(sections.length, 0);
    });
  });

  describe('replaceManagedSections', () => {
    it('replaces managed section content', () => {
      const existing = [
        'top: value',
        '# CHATI-MANAGED-START',
        'old: data',
        '# CHATI-MANAGED-END',
        'bottom: value',
      ].join('\n');

      const newSections = [{ content: 'new: data' }];
      const result = replaceManagedSections(existing, newSections);

      assert.ok(result.includes('new: data'));
      assert.ok(!result.includes('old: data'));
      assert.ok(result.includes('top: value'));
      assert.ok(result.includes('bottom: value'));
    });
  });

  describe('deepMergeYaml', () => {
    it('adds new keys from source', () => {
      const target = { a: 1 };
      const source = { b: 2 };
      const merged = deepMergeYaml(target, source);
      assert.deepEqual(merged, { a: 1, b: 2 });
    });

    it('does NOT overwrite existing keys', () => {
      const target = { a: 'original' };
      const source = { a: 'overwrite' };
      const merged = deepMergeYaml(target, source);
      assert.equal(merged.a, 'original');
    });

    it('recursively merges nested objects', () => {
      const target = { db: { host: 'myhost' } };
      const source = { db: { host: 'default', port: 5432 } };
      const merged = deepMergeYaml(target, source);
      assert.equal(merged.db.host, 'myhost');
      assert.equal(merged.db.port, 5432);
    });

    it('preserves arrays from target without merging', () => {
      const target = { list: [1, 2] };
      const source = { list: [3, 4] };
      const merged = deepMergeYaml(target, source);
      assert.deepEqual(merged.list, [1, 2]);
    });
  });

  describe('mergeYamlFiles', () => {
    it('replaces managed sections when markers exist', () => {
      const existing = [
        'user_config: keep',
        '# CHATI-MANAGED-START',
        'old_managed: value',
        '# CHATI-MANAGED-END',
      ].join('\n');

      const incoming = [
        'user_config: replace_attempt',
        '# CHATI-MANAGED-START',
        'new_managed: value',
        '# CHATI-MANAGED-END',
      ].join('\n');

      const result = mergeYamlFiles(existing, incoming);
      assert.ok(result.includes('user_config: keep'));
      assert.ok(result.includes('new_managed: value'));
      assert.ok(!result.includes('old_managed: value'));
    });

    it('deep merges when no markers exist', () => {
      const existing = 'db:\n  host: myhost\n';
      const incoming = 'db:\n  host: default\n  port: 5432\n';
      const result = mergeYamlFiles(existing, incoming);

      assert.ok(result.includes('myhost'));
      assert.ok(result.includes('5432'));
    });

    it('returns existing content if YAML parsing fails', () => {
      const existing = 'invalid: yaml: content: [[[';
      const incoming = 'valid: yaml';
      const result = mergeYamlFiles(existing, incoming);
      assert.equal(result, existing);
    });
  });
});

// ─── replace-merger ─────────────────────────────────────────

describe('replace-merger', () => {
  describe('replaceFile', () => {
    it('returns new content, ignoring existing', () => {
      const result = replaceFile('old stuff', 'new stuff');
      assert.equal(result, 'new stuff');
    });
  });

  describe('shouldReplace', () => {
    it('returns true for agent files', () => {
      assert.ok(shouldReplace('chati.dev/agents/discover/brief.md'));
    });

    it('returns true for schema files', () => {
      assert.ok(shouldReplace('chati.dev/schemas/session.schema.json'));
    });

    it('returns true for constitution', () => {
      assert.ok(shouldReplace('chati.dev/constitution.md'));
    });

    it('returns true for orchestrator files', () => {
      assert.ok(shouldReplace('chati.dev/orchestrator/chati.md'));
    });

    it('returns false for user config files', () => {
      assert.ok(!shouldReplace('config/app.yaml'));
    });

    it('returns false for root-level files', () => {
      assert.ok(!shouldReplace('.env'));
    });

    it('handles backslash path separators', () => {
      assert.ok(shouldReplace('chati.dev\\agents\\discover\\brief.md'));
    });
  });
});

// ─── merger index (router) ──────────────────────────────────

describe('merger router', () => {
  describe('getMergeStrategy', () => {
    it('returns env for .env files', () => {
      assert.equal(getMergeStrategy('.env'), 'env');
    });

    it('returns env for .env.local', () => {
      assert.equal(getMergeStrategy('.env.local'), 'env');
    });

    it('returns yaml for .yaml files', () => {
      assert.equal(getMergeStrategy('config/settings.yaml'), 'yaml');
    });

    it('returns yaml for .yml files', () => {
      assert.equal(getMergeStrategy('config/settings.yml'), 'yaml');
    });

    it('returns replace for framework-owned agent files', () => {
      assert.equal(getMergeStrategy('chati.dev/agents/discover/brief.md'), 'replace');
    });

    it('returns replace for framework-owned schema files', () => {
      assert.equal(getMergeStrategy('chati.dev/schemas/session.schema.json'), 'replace');
    });

    it('returns replace for other file types', () => {
      assert.equal(getMergeStrategy('some/random/file.txt'), 'replace');
    });
  });

  describe('mergeFile', () => {
    it('routes .env to env merger', () => {
      const existing = 'DB_HOST=myserver';
      const incoming = 'DB_HOST=default\nNEW_KEY=val';
      const result = mergeFile('.env', existing, incoming);
      assert.ok(result.includes('DB_HOST=myserver'));
      assert.ok(result.includes('NEW_KEY=val'));
    });

    it('routes .yaml to yaml merger', () => {
      const existing = 'key: existing\n';
      const incoming = 'key: new\nnew_key: value\n';
      const result = mergeFile('config.yaml', existing, incoming);
      assert.ok(result.includes('existing'));
      assert.ok(result.includes('new_key'));
    });

    it('routes framework files to replace merger', () => {
      const result = mergeFile('chati.dev/agents/discover/brief.md', 'old', 'new');
      assert.equal(result, 'new');
    });
  });
});
