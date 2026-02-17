import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import net from 'net';
import http from 'http';

import { LogBuffer } from '../../src/preview/log-buffer.js';
import { detectDevCommand, detectProjectKind } from '../../src/preview/detector.js';
import { findAvailablePort, waitForServer } from '../../src/preview/launcher.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures', 'preview');

function setupFixtures() {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
  mkdirSync(FIXTURES_DIR, { recursive: true });
}

function cleanupFixtures() {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// LogBuffer
// ---------------------------------------------------------------------------
describe('LogBuffer', () => {
  it('appends lines and retrieves them', () => {
    const buf = new LogBuffer();
    buf.append('line 1', 'stdout');
    buf.append('line 2', 'stderr');

    const all = buf.getAll();
    assert.equal(all.length, 2);
    assert.equal(all[0].line, 'line 1');
    assert.equal(all[0].stream, 'stdout');
    assert.equal(all[1].line, 'line 2');
    assert.equal(all[1].stream, 'stderr');
  });

  it('enforces max capacity (circular buffer)', () => {
    const buf = new LogBuffer(3);
    buf.append('a');
    buf.append('b');
    buf.append('c');
    buf.append('d'); // evicts 'a'

    const all = buf.getAll();
    assert.equal(all.length, 3);
    assert.equal(all[0].line, 'b');
    assert.equal(all[2].line, 'd');
  });

  it('filters errors from stderr and error patterns', () => {
    const buf = new LogBuffer();
    buf.append('Server started', 'stdout');
    buf.append('Warning: deprecated API', 'stdout');
    buf.append('Something went wrong', 'stderr');
    buf.append('TypeError: Cannot read properties', 'stdout');
    buf.append('Request handled', 'stdout');

    const errors = buf.getErrors();
    assert.equal(errors.length, 3);
    assert.ok(errors.some((e) => e.line.includes('Warning')));
    assert.ok(errors.some((e) => e.line.includes('Something went wrong')));
    assert.ok(errors.some((e) => e.line.includes('TypeError')));
  });

  it('returns recent lines', () => {
    const buf = new LogBuffer();
    for (let i = 0; i < 100; i++) {
      buf.append(`line ${i}`);
    }

    const recent = buf.getRecent(5);
    assert.equal(recent.length, 5);
    assert.equal(recent[0].line, 'line 95');
    assert.equal(recent[4].line, 'line 99');
  });

  it('tracks size correctly', () => {
    const buf = new LogBuffer(5);
    assert.equal(buf.size, 0);
    buf.append('a');
    assert.equal(buf.size, 1);
    for (let i = 0; i < 10; i++) buf.append(`x${i}`);
    assert.equal(buf.size, 5); // capped at max
  });

  it('clears all lines', () => {
    const buf = new LogBuffer();
    buf.append('a');
    buf.append('b');
    buf.clear();
    assert.equal(buf.size, 0);
    assert.deepEqual(buf.getAll(), []);
  });

  it('generates context for Dev agent', () => {
    const buf = new LogBuffer();
    buf.append('Server started on port 3000', 'stdout');
    buf.append('Error: ECONNREFUSED', 'stderr');
    buf.append('GET /api/users 200 12ms', 'stdout');

    const ctx = buf.toContext();
    assert.equal(ctx.totalLines, 3);
    assert.equal(ctx.errorCount, 1);
    assert.equal(ctx.errors[0], 'Error: ECONNREFUSED');
    assert.equal(ctx.recentOutput.length, 3);
    assert.ok(ctx.recentOutput[0].startsWith('[stdout]'));
    assert.ok(ctx.recentOutput[1].startsWith('[stderr]'));
  });

  it('ignores non-string input', () => {
    const buf = new LogBuffer();
    buf.append(null);
    buf.append(undefined);
    buf.append(42);
    assert.equal(buf.size, 0);
  });

  it('trims whitespace from lines', () => {
    const buf = new LogBuffer();
    buf.append('  hello  \n');
    assert.equal(buf.getAll()[0].line, 'hello');
  });

  it('includes timestamps', () => {
    const before = Date.now();
    const buf = new LogBuffer();
    buf.append('test');
    const after = Date.now();

    const entry = buf.getAll()[0];
    assert.ok(entry.timestamp >= before);
    assert.ok(entry.timestamp <= after);
  });
});

// ---------------------------------------------------------------------------
// detectDevCommand
// ---------------------------------------------------------------------------
describe('detectDevCommand', () => {
  before(() => setupFixtures());

  it('detects Next.js project', () => {
    const dir = join(FIXTURES_DIR, 'nextjs');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'next.config.js'), 'module.exports = {}');
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'next dev' } }));

    const result = detectDevCommand(dir);
    assert.ok(result);
    assert.equal(result.framework, 'nextjs');
    assert.equal(result.defaultPort, 3000);
    assert.equal(result.command, 'npm');
    assert.deepEqual(result.args, ['run', 'dev']);
  });

  it('detects Vite project', () => {
    const dir = join(FIXTURES_DIR, 'vite');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'vite.config.ts'), 'export default {}');
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } }));

    const result = detectDevCommand(dir);
    assert.ok(result);
    assert.equal(result.framework, 'vite');
    assert.equal(result.defaultPort, 5173);
  });

  it('detects Angular project', () => {
    const dir = join(FIXTURES_DIR, 'angular');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'angular.json'), '{}');
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { start: 'ng serve' } }));

    const result = detectDevCommand(dir);
    assert.ok(result);
    assert.equal(result.framework, 'angular');
    assert.equal(result.defaultPort, 4200);
  });

  it('detects Django project', () => {
    const dir = join(FIXTURES_DIR, 'django');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'manage.py'), '#!/usr/bin/env python');

    const result = detectDevCommand(dir);
    assert.ok(result);
    assert.equal(result.framework, 'django');
    assert.equal(result.command, 'python');
    assert.deepEqual(result.args, ['manage.py', 'runserver']);
    assert.equal(result.defaultPort, 8000);
  });

  it('detects generic Node project with dev script', () => {
    const dir = join(FIXTURES_DIR, 'node-generic');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'nodemon server.js' } }));

    const result = detectDevCommand(dir);
    assert.ok(result);
    assert.equal(result.framework, 'node');
    assert.equal(result.command, 'npm');
    assert.deepEqual(result.args, ['run', 'dev']);
  });

  it('prefers dev script over start', () => {
    const dir = join(FIXTURES_DIR, 'node-both');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      scripts: { start: 'node server.js', dev: 'nodemon server.js' },
    }));

    const result = detectDevCommand(dir);
    assert.ok(result);
    assert.deepEqual(result.args, ['run', 'dev']);
  });

  it('falls back to npm start if only start script', () => {
    const dir = join(FIXTURES_DIR, 'node-start');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      scripts: { start: 'node index.js' },
    }));

    const result = detectDevCommand(dir);
    assert.ok(result);
    assert.deepEqual(result.args, ['start']);
    assert.ok(result.description.includes('start'));
  });

  it('detects static HTML project', () => {
    const dir = join(FIXTURES_DIR, 'static');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), '<html></html>');

    const result = detectDevCommand(dir);
    assert.ok(result);
    assert.equal(result.framework, 'static');
    assert.equal(result.command, 'npx');
    assert.deepEqual(result.args, ['serve', '.']);
  });

  it('returns null for empty directory', () => {
    const dir = join(FIXTURES_DIR, 'empty');
    mkdirSync(dir, { recursive: true });

    const result = detectDevCommand(dir);
    assert.equal(result, null);
  });

  it('returns null for library with no scripts', () => {
    const dir = join(FIXTURES_DIR, 'library');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      name: 'my-lib',
      main: 'index.js',
      exports: { '.': './index.js' },
    }));

    const result = detectDevCommand(dir);
    assert.equal(result, null);
  });

  it('handles invalid package.json gracefully', () => {
    const dir = join(FIXTURES_DIR, 'bad-json');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), 'not valid json {{{');

    const result = detectDevCommand(dir);
    assert.equal(result, null);
  });

  after(() => cleanupFixtures());
});

// ---------------------------------------------------------------------------
// detectProjectKind
// ---------------------------------------------------------------------------
describe('detectProjectKind', () => {
  before(() => setupFixtures());

  it('detects frontend (Vite)', () => {
    const dir = join(FIXTURES_DIR, 'kind-vite');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'vite.config.js'), 'export default {}');
    assert.equal(detectProjectKind(dir), 'frontend');
  });

  it('detects fullstack (Next.js)', () => {
    const dir = join(FIXTURES_DIR, 'kind-next');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'next.config.mjs'), 'export default {}');
    assert.equal(detectProjectKind(dir), 'fullstack');
  });

  it('detects API (Express)', () => {
    const dir = join(FIXTURES_DIR, 'kind-api');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      dependencies: { express: '^4.18.0' },
    }));
    assert.equal(detectProjectKind(dir), 'api');
  });

  it('detects CLI tool', () => {
    const dir = join(FIXTURES_DIR, 'kind-cli');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      bin: { mycli: './bin/cli.js' },
    }));
    assert.equal(detectProjectKind(dir), 'cli');
  });

  it('detects library', () => {
    const dir = join(FIXTURES_DIR, 'kind-lib');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      main: 'index.js',
      exports: { '.': './index.js' },
    }));
    assert.equal(detectProjectKind(dir), 'library');
  });

  it('detects static site', () => {
    const dir = join(FIXTURES_DIR, 'kind-static');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), '<html></html>');
    assert.equal(detectProjectKind(dir), 'static');
  });

  it('defaults to library for unknown project', () => {
    const dir = join(FIXTURES_DIR, 'kind-unknown');
    mkdirSync(dir, { recursive: true });
    assert.equal(detectProjectKind(dir), 'library');
  });

  after(() => cleanupFixtures());
});

// ---------------------------------------------------------------------------
// findAvailablePort
// ---------------------------------------------------------------------------
describe('findAvailablePort', () => {
  it('returns the start port if available', async () => {
    const port = await findAvailablePort(49152);
    assert.equal(typeof port, 'number');
    assert.ok(port >= 49152);
  });

  it('skips occupied ports', async () => {
    // Occupy a port
    const server = net.createServer();
    await new Promise((resolve) => server.listen(49200, resolve));

    try {
      const port = await findAvailablePort(49200, 5);
      assert.ok(port > 49200, `Expected port > 49200, got ${port}`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('throws when no port available in range', async () => {
    await assert.rejects(
      () => findAvailablePort(49500, 0), // maxAttempts=0 → immediate throw
      /No available port found/,
    );
  });
});

// ---------------------------------------------------------------------------
// waitForServer
// ---------------------------------------------------------------------------
describe('waitForServer', () => {
  it('resolves when server is up', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(200);
      res.end('ok');
    });

    const port = await findAvailablePort(49300);
    await new Promise((resolve) => server.listen(port, resolve));

    try {
      await waitForServer(`http://localhost:${port}`, 5000);
      // If we get here, server was detected — pass
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('rejects on timeout', async () => {
    // No server on this port
    const port = await findAvailablePort(49400);

    await assert.rejects(
      () => waitForServer(`http://localhost:${port}`, 1500),
      /did not respond within/,
    );
  });
});
