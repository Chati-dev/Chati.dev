import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isSensitivePath } from '../../../../chati.dev/hooks/read-protection.js';

const CWD = '/project';

describe('read-protection hook', () => {
  describe('blocks sensitive files', () => {
    it('blocks .env', () => {
      const result = isSensitivePath('/project/.env', CWD);
      assert.equal(result.sensitive, true);
    });

    it('blocks .env.production', () => {
      const result = isSensitivePath('/project/.env.production', CWD);
      assert.equal(result.sensitive, true);
    });

    it('blocks .env.local', () => {
      const result = isSensitivePath('/project/.env.local', CWD);
      assert.equal(result.sensitive, true);
    });

    it('blocks credentials.json', () => {
      const result = isSensitivePath('/project/credentials.json', CWD);
      assert.equal(result.sensitive, true);
    });

    it('blocks credentials without extension (e.g. ~/.aws/credentials)', () => {
      const result = isSensitivePath('/project/credentials', CWD);
      assert.equal(result.sensitive, true);
    });

    it('blocks secrets.yaml', () => {
      const result = isSensitivePath('/project/secrets.yaml', CWD);
      assert.equal(result.sensitive, true);
    });

    it('blocks server.key', () => {
      const result = isSensitivePath('/project/server.key', CWD);
      assert.equal(result.sensitive, true);
    });

    it('blocks private.pem', () => {
      const result = isSensitivePath('/project/private.pem', CWD);
      assert.equal(result.sensitive, true);
    });

    it('blocks .git/config', () => {
      const result = isSensitivePath('/project/.git/config', CWD);
      assert.equal(result.sensitive, true);
    });
  });

  describe('allows safe files', () => {
    it('allows .env.example', () => {
      const result = isSensitivePath('/project/.env.example', CWD);
      assert.equal(result.sensitive, false);
    });

    it('allows .env.template', () => {
      const result = isSensitivePath('/project/.env.template', CWD);
      assert.equal(result.sensitive, false);
    });

    it('allows signing-public-key.pem', () => {
      const result = isSensitivePath('/project/src/installer/signing-public-key.pem', CWD);
      assert.equal(result.sensitive, false);
    });

    it('allows normal source files', () => {
      const result = isSensitivePath('/project/src/index.js', CWD);
      assert.equal(result.sensitive, false);
    });

    it('allows package.json', () => {
      const result = isSensitivePath('/project/package.json', CWD);
      assert.equal(result.sensitive, false);
    });

    it('allows README.md', () => {
      const result = isSensitivePath('/project/README.md', CWD);
      assert.equal(result.sensitive, false);
    });
  });

  describe('edge cases', () => {
    it('handles null input', () => {
      const result = isSensitivePath(null, CWD);
      assert.equal(result.sensitive, false);
    });

    it('handles empty string', () => {
      const result = isSensitivePath('', CWD);
      assert.equal(result.sensitive, false);
    });

    it('blocks nested .env files', () => {
      const result = isSensitivePath('/project/config/.env', CWD);
      assert.equal(result.sensitive, true);
    });
  });
});
