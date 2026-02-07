#!/usr/bin/env node

/**
 * Bundle framework files into the npm package.
 * Run before `npm publish` — copies chati.dev/ source files
 * into packages/chati-dev/framework/ so they ship with the package.
 */

import { cpSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');
const MONOREPO_ROOT = join(PACKAGE_ROOT, '..', '..');
const SOURCE = join(MONOREPO_ROOT, 'chati.dev');
const DEST = join(PACKAGE_ROOT, 'framework');

if (!existsSync(SOURCE)) {
  console.error('Error: chati.dev/ source directory not found at:', SOURCE);
  process.exit(1);
}

// Clean previous bundle
if (existsSync(DEST)) {
  rmSync(DEST, { recursive: true });
}

// Copy framework files
console.log('Bundling framework files...');
mkdirSync(DEST, { recursive: true });

const dirs = [
  'orchestrator',
  'agents/clarity', 'agents/quality', 'agents/build', 'agents/deploy',
  'templates', 'workflows', 'quality-gates',
  'schemas', 'frameworks', 'intelligence', 'patterns',
  'i18n', 'migrations',
];

for (const dir of dirs) {
  const src = join(SOURCE, dir);
  if (existsSync(src)) {
    cpSync(src, join(DEST, dir), { recursive: true });
  }
}

// Copy root files
const rootFiles = ['constitution.md', 'config.yaml'];
for (const file of rootFiles) {
  const src = join(SOURCE, file);
  if (existsSync(src)) {
    cpSync(src, join(DEST, file));
  }
}

console.log('Framework bundled to:', DEST);
console.log('Done.');
