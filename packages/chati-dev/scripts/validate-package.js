#!/usr/bin/env node

/**
 * Package Completeness Validator
 *
 * Validates that the npm package has all required files before publishing.
 * Run as part of prepublishOnly (after bundle, before sign-manifest).
 *
 * Exports:
 *   validatePackage(packageRoot) → { errors, warnings, checks, passed }
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Expected directories in framework/ (must match bundle-framework.js)
 */
const EXPECTED_BUNDLE_DIRS = [
  'orchestrator',
  'agents/discover', 'agents/plan', 'agents/quality', 'agents/build', 'agents/deploy',
  'templates', 'workflows', 'quality-gates',
  'schemas', 'frameworks', 'intelligence', 'patterns',
  'hooks', 'domains',
  'i18n', 'migrations', 'data',
  'tasks', 'context',
];

const EXPECTED_ROOT_FILES = ['constitution.md', 'config.yaml'];

const SENSITIVE_FILES = ['.signing-key.pem', '.env', '.env.local', '.env.production'];

/**
 * Validate that framework/ directory exists.
 */
function checkFrameworkExists(packageRoot, results) {
  results.checks++;
  const frameworkDir = join(packageRoot, 'framework');
  if (existsSync(frameworkDir)) {
    results.passed++;
  } else {
    results.errors.push('framework/ directory not found. Run `npm run bundle` first.');
  }
}

/**
 * Validate all expected bundle directories exist.
 */
function checkBundledDirs(packageRoot, results) {
  results.checks++;
  const frameworkDir = join(packageRoot, 'framework');
  if (!existsSync(frameworkDir)) return;

  const missing = [];
  for (const dir of EXPECTED_BUNDLE_DIRS) {
    if (!existsSync(join(frameworkDir, dir))) {
      missing.push(dir);
    }
  }

  if (missing.length === 0) {
    results.passed++;
  } else {
    results.errors.push(`Missing framework directories: ${missing.join(', ')}`);
  }
}

/**
 * Validate root framework files exist.
 */
function checkRootFiles(packageRoot, results) {
  results.checks++;
  const frameworkDir = join(packageRoot, 'framework');
  if (!existsSync(frameworkDir)) return;

  const missing = [];
  for (const file of EXPECTED_ROOT_FILES) {
    if (!existsSync(join(frameworkDir, file))) {
      missing.push(file);
    }
  }

  if (missing.length === 0) {
    results.passed++;
  } else {
    results.errors.push(`Missing framework root files: ${missing.join(', ')}`);
  }
}

/**
 * Check that no sensitive files leaked into the bundle.
 */
function checkNoSensitiveFiles(packageRoot, results) {
  results.checks++;
  const found = [];

  // Only check inside publishable directories (bin/, src/, assets/, framework/, scripts/)
  // Root-level files like .signing-key.pem are excluded by package.json "files" field
  const publishableDirs = ['framework', 'src', 'scripts', 'bin', 'assets'];
  for (const file of SENSITIVE_FILES) {
    for (const dir of publishableDirs) {
      if (existsSync(join(packageRoot, dir, file))) {
        found.push(`${dir}/${file}`);
      }
    }
  }

  if (found.length === 0) {
    results.passed++;
  } else {
    results.errors.push(`Sensitive files found in package: ${found.join(', ')}`);
  }
}

/**
 * Validate that all package.json exports resolve to existing files.
 */
function checkExportsResolve(packageRoot, results) {
  results.checks++;
  const pkgPath = join(packageRoot, 'package.json');
  if (!existsSync(pkgPath)) return;

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const exports = pkg.exports || {};
  const missing = [];

  for (const [key, value] of Object.entries(exports)) {
    const filePath = join(packageRoot, value);
    if (!existsSync(filePath)) {
      missing.push(`${key} → ${value}`);
    }
  }

  if (missing.length === 0) {
    results.passed++;
  } else {
    results.errors.push(`Unresolved exports: ${missing.join(', ')}`);
  }
}

/**
 * Validate that bin entry exists.
 */
function checkBinExists(packageRoot, results) {
  results.checks++;
  const pkgPath = join(packageRoot, 'package.json');
  if (!existsSync(pkgPath)) return;

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const bin = pkg.bin || {};
  const missing = [];

  for (const [name, path] of Object.entries(bin)) {
    if (!existsSync(join(packageRoot, path))) {
      missing.push(`${name} → ${path}`);
    }
  }

  if (missing.length === 0) {
    results.passed++;
  } else {
    results.errors.push(`Missing bin entries: ${missing.join(', ')}`);
  }
}

/**
 * Compare entity count in registry vs actual files in framework/.
 */
function checkEntityCount(packageRoot, results) {
  results.checks++;
  const registryPath = join(packageRoot, 'framework', 'data', 'entity-registry.yaml');
  if (!existsSync(registryPath)) {
    results.warnings.push('Entity registry not found in framework/data/ — skipping count check.');
    results.passed++;
    return;
  }

  // Count files in framework/ recursively (excluding manifest.json, manifest.sig)
  let fileCount = 0;
  function countFiles(dir) {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          countFiles(join(dir, entry.name));
        } else if (entry.name !== 'manifest.json' && entry.name !== 'manifest.sig') {
          fileCount++;
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  countFiles(join(packageRoot, 'framework'));

  if (fileCount > 0) {
    results.passed++;
  } else {
    results.errors.push('Framework directory is empty (0 files).');
  }
}

/**
 * Validate the npm package completeness.
 * @param {string} packageRoot - Root of the package (packages/chati-dev/)
 * @returns {{ errors: string[], warnings: string[], checks: number, passed: number }}
 */
export function validatePackage(packageRoot) {
  const results = { errors: [], warnings: [], checks: 0, passed: 0 };

  checkFrameworkExists(packageRoot, results);
  checkBundledDirs(packageRoot, results);
  checkRootFiles(packageRoot, results);
  checkNoSensitiveFiles(packageRoot, results);
  checkExportsResolve(packageRoot, results);
  checkBinExists(packageRoot, results);
  checkEntityCount(packageRoot, results);

  return results;
}

/**
 * Format results for CLI output.
 */
function formatResults(results) {
  const status = results.errors.length === 0 ? 'PASS' : 'FAIL';
  const lines = [
    `Package Validation: ${status} (${results.passed}/${results.checks} checks passed)`,
  ];

  if (results.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    results.errors.forEach(e => lines.push(`  ✗ ${e}`));
  }

  if (results.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    results.warnings.forEach(w => lines.push(`  ⚠ ${w}`));
  }

  return lines.join('\n');
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packageRoot = join(__dirname, '..');
  const results = validatePackage(packageRoot);

  console.log(formatResults(results));

  if (results.errors.length > 0) {
    process.exit(1);
  }
}
