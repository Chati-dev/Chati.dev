/**
 * @fileoverview Tests for health check engine.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  checkFrameworkIntegrity,
  checkSessionState,
  checkHooksHealth,
  checkGitStatus,
  checkCliAvailability,
  checkDependencies,
  runHealthChecks,
} from '../../src/health/engine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTempProject() {
  const dir = mkdtempSync(join(tmpdir(), 'chati-health-'));
  return dir;
}

function setupFullProject(dir) {
  // chati.dev/ structure
  const chatiDir = join(dir, 'chati.dev');
  mkdirSync(join(chatiDir, 'data'), { recursive: true });
  mkdirSync(join(chatiDir, 'hooks'), { recursive: true });

  // entity-registry with real paths
  writeFileSync(
    join(chatiDir, 'data', 'entity-registry.yaml'),
    ['entries:', '  - path: "chati.dev/hooks/prism-engine.js"'].join('\n'),
  );

  // 6 hooks
  const hooks = [
    'prism-engine.js', 'model-governance.js', 'mode-governance.js',
    'constitution-guard.js', 'read-protection.js', 'session-digest.js',
  ];
  for (const h of hooks) {
    writeFileSync(join(chatiDir, 'hooks', h), '// hook');
  }

  // config.yaml (claude only)
  writeFileSync(
    join(chatiDir, 'config.yaml'),
    ['providers:', '  claude:', '    enabled: true'].join('\n'),
  );

  // .chati/ session
  mkdirSync(join(dir, '.chati'), { recursive: true });
  writeFileSync(
    join(dir, '.chati', 'session.yaml'),
    ['project: test-project', 'language: en'].join('\n'),
  );

  // .git/
  mkdirSync(join(dir, '.git'), { recursive: true });

  return dir;
}

// ---------------------------------------------------------------------------
// checkFrameworkIntegrity
// ---------------------------------------------------------------------------

describe('checkFrameworkIntegrity', () => {
  let dir;

  before(() => { dir = createTempProject(); });
  after(() => { rmSync(dir, { recursive: true, force: true }); });

  it('warns when entity-registry.yaml does not exist', async () => {
    const result = await checkFrameworkIntegrity(dir);
    assert.equal(result.name, 'framework-integrity');
    assert.equal(result.status, 'warn');
    assert.ok(result.message.includes('No entity registry'));
  });

  it('passes when registry exists and files are present', async () => {
    const chatiDir = join(dir, 'chati.dev');
    mkdirSync(join(chatiDir, 'data'), { recursive: true });
    mkdirSync(join(chatiDir, 'agents'), { recursive: true });
    writeFileSync(join(chatiDir, 'agents', 'brief.md'), '# Brief');
    writeFileSync(
      join(chatiDir, 'data', 'entity-registry.yaml'),
      ['entries:', '  - path: "chati.dev/agents/brief.md"'].join('\n'),
    );
    const result = await checkFrameworkIntegrity(dir);
    assert.equal(result.status, 'pass');
    assert.ok(result.message.includes('All registered entities'));
  });

  it('warns when registered files are missing from filesystem', async () => {
    writeFileSync(
      join(dir, 'chati.dev', 'data', 'entity-registry.yaml'),
      ['entries:', '  - path: "chati.dev/missing-file.md"'].join('\n'),
    );
    const result = await checkFrameworkIntegrity(dir);
    assert.equal(result.status, 'warn');
    assert.ok(result.message.includes('missing from filesystem'));
  });

  it('has duration >= 0', async () => {
    const result = await checkFrameworkIntegrity(dir);
    assert.ok(result.duration >= 0);
  });
});

// ---------------------------------------------------------------------------
// checkSessionState
// ---------------------------------------------------------------------------

describe('checkSessionState', () => {
  let dir;

  before(() => { dir = createTempProject(); });
  after(() => { rmSync(dir, { recursive: true, force: true }); });

  it('passes when no session file exists (new project)', async () => {
    const result = await checkSessionState(dir);
    assert.equal(result.name, 'session-state');
    assert.equal(result.status, 'pass');
    assert.ok(result.message.includes('No active session'));
  });

  it('passes when session has required fields', async () => {
    mkdirSync(join(dir, '.chati'), { recursive: true });
    writeFileSync(
      join(dir, '.chati', 'session.yaml'),
      ['project: my-project', 'language: en', 'state: discover'].join('\n'),
    );
    const result = await checkSessionState(dir);
    assert.equal(result.status, 'pass');
    assert.ok(result.message.includes('valid'));
  });

  it('warns when session is missing project field', async () => {
    writeFileSync(join(dir, '.chati', 'session.yaml'), 'language: en\nstate: discover');
    const result = await checkSessionState(dir);
    assert.equal(result.status, 'warn');
    assert.ok(result.message.includes('project'));
  });

  it('warns when session is missing language field', async () => {
    writeFileSync(join(dir, '.chati', 'session.yaml'), 'project: test\nstate: discover');
    const result = await checkSessionState(dir);
    assert.equal(result.status, 'warn');
    assert.ok(result.message.includes('language'));
  });
});

// ---------------------------------------------------------------------------
// checkHooksHealth
// ---------------------------------------------------------------------------

describe('checkHooksHealth', () => {
  let dir;

  before(() => { dir = createTempProject(); });
  after(() => { rmSync(dir, { recursive: true, force: true }); });

  it('fails when hooks directory does not exist', async () => {
    const result = await checkHooksHealth(dir);
    assert.equal(result.name, 'hooks-health');
    assert.equal(result.status, 'fail');
    assert.ok(result.message.includes('not found'));
  });

  it('fails when some hooks are missing', async () => {
    const hooksDir = join(dir, 'chati.dev', 'hooks');
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(join(hooksDir, 'prism-engine.js'), '// ok');
    const result = await checkHooksHealth(dir);
    assert.equal(result.status, 'fail');
    assert.ok(result.message.includes('Missing hooks'));
    assert.ok(result.message.includes('model-governance.js'));
  });

  it('passes when all 6 hooks are present', async () => {
    const hooksDir = join(dir, 'chati.dev', 'hooks');
    const hooks = [
      'prism-engine.js', 'model-governance.js', 'mode-governance.js',
      'constitution-guard.js', 'read-protection.js', 'session-digest.js',
    ];
    for (const h of hooks) {
      writeFileSync(join(hooksDir, h), '// hook');
    }
    const result = await checkHooksHealth(dir);
    assert.equal(result.status, 'pass');
    assert.ok(result.message.includes('All 6 hooks'));
  });

  it('lists missing hook names in the message', async () => {
    // Remove one hook
    rmSync(join(dir, 'chati.dev', 'hooks', 'session-digest.js'), { force: true });
    const result = await checkHooksHealth(dir);
    assert.equal(result.status, 'fail');
    assert.ok(result.message.includes('session-digest.js'));
  });
});

// ---------------------------------------------------------------------------
// checkGitStatus
// ---------------------------------------------------------------------------

describe('checkGitStatus', () => {
  let dir;

  before(() => { dir = createTempProject(); });
  after(() => { rmSync(dir, { recursive: true, force: true }); });

  it('warns when .git/ does not exist', async () => {
    const result = await checkGitStatus(dir);
    assert.equal(result.name, 'git-status');
    assert.equal(result.status, 'warn');
    assert.ok(result.message.includes('Not a git'));
  });

  it('passes when .git/ exists', async () => {
    mkdirSync(join(dir, '.git'), { recursive: true });
    const result = await checkGitStatus(dir);
    assert.equal(result.status, 'pass');
    assert.ok(result.message.includes('Git repository'));
  });
});

// ---------------------------------------------------------------------------
// checkCliAvailability
// ---------------------------------------------------------------------------

describe('checkCliAvailability', () => {
  let dir;

  before(() => { dir = createTempProject(); });
  after(() => { rmSync(dir, { recursive: true, force: true }); });

  it('warns when config.yaml does not exist', async () => {
    const result = await checkCliAvailability(dir);
    assert.equal(result.name, 'cli-availability');
    assert.equal(result.status, 'warn');
    assert.ok(result.message.includes('No config.yaml'));
  });

  it('returns a valid CheckResult structure', async () => {
    mkdirSync(join(dir, 'chati.dev'), { recursive: true });
    writeFileSync(
      join(dir, 'chati.dev', 'config.yaml'),
      ['providers:', '  claude:', '    enabled: true'].join('\n'),
    );
    const result = await checkCliAvailability(dir);
    assert.equal(result.name, 'cli-availability');
    assert.ok(['pass', 'warn', 'fail'].includes(result.status));
    assert.equal(typeof result.message, 'string');
    assert.ok(result.duration >= 0);
  });
});

// ---------------------------------------------------------------------------
// checkDependencies
// ---------------------------------------------------------------------------

describe('checkDependencies', () => {
  it('returns pass when Node >= v20 and git are available', async () => {
    const result = await checkDependencies();
    assert.equal(result.name, 'dependencies');
    // We're running on Node 20+ so this should pass
    assert.equal(result.status, 'pass');
    assert.ok(result.message.includes('All dependencies'));
  });

  it('has valid CheckResult structure', async () => {
    const result = await checkDependencies();
    assert.ok(['pass', 'warn', 'fail'].includes(result.status));
    assert.equal(typeof result.message, 'string');
    assert.ok(result.duration >= 0);
  });
});

// ---------------------------------------------------------------------------
// runHealthChecks
// ---------------------------------------------------------------------------

describe('runHealthChecks', () => {
  let dir;

  before(() => {
    dir = createTempProject();
    setupFullProject(dir);
  });
  after(() => { rmSync(dir, { recursive: true, force: true }); });

  it('returns HealthReport with all expected fields', async () => {
    const report = await runHealthChecks(dir);
    assert.equal(typeof report.score, 'number');
    assert.equal(typeof report.total, 'number');
    assert.equal(typeof report.passed, 'number');
    assert.equal(typeof report.warned, 'number');
    assert.equal(typeof report.failed, 'number');
    assert.ok(Array.isArray(report.checks));
    assert.equal(typeof report.timestamp, 'string');
  });

  it('runs exactly 6 checks', async () => {
    const report = await runHealthChecks(dir);
    assert.equal(report.checks.length, 6);
    assert.equal(report.total, 6);
  });

  it('calculates score as (passed/total) * 100', async () => {
    const report = await runHealthChecks(dir);
    const expected = Math.round((report.passed / report.total) * 100);
    assert.equal(report.score, expected);
  });

  it('counts passed + warned + failed = total', async () => {
    const report = await runHealthChecks(dir);
    assert.equal(report.passed + report.warned + report.failed, report.total);
  });

  it('produces ISO timestamp', async () => {
    const report = await runHealthChecks(dir);
    assert.ok(!isNaN(Date.parse(report.timestamp)));
  });

  it('each check has name, status, message, duration', async () => {
    const report = await runHealthChecks(dir);
    for (const check of report.checks) {
      assert.equal(typeof check.name, 'string');
      assert.ok(['pass', 'warn', 'fail'].includes(check.status));
      assert.equal(typeof check.message, 'string');
      assert.equal(typeof check.duration, 'number');
    }
  });
});
