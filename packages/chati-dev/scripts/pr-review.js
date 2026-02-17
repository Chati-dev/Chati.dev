/**
 * PR Review — Automated pull request review helper.
 *
 * Uses git diff to analyze changes between branches, assess risk levels,
 * and generate formatted review reports suitable for PR comments.
 *
 * @module scripts/pr-review
 */

import { execFileSync } from 'node:child_process';
import { extname, dirname } from 'node:path';

/**
 * @typedef {Object} ChangedFiles
 * @property {string[]} added
 * @property {string[]} modified
 * @property {string[]} deleted
 * @property {string[]} renamed
 */

/**
 * @typedef {Object} ChangeAnalysis
 * @property {string} file
 * @property {string} changeType — 'added' | 'modified' | 'deleted' | 'renamed'
 * @property {string} risk       — 'low' | 'medium' | 'high'
 * @property {string[]} suggestions
 */

/**
 * @typedef {Object} ReviewReport
 * @property {ChangedFiles} changedFiles
 * @property {ChangeAnalysis[]} analyses
 * @property {{ high: number, medium: number, low: number }} riskSummary
 * @property {number} totalFiles
 */

/**
 * Returns paths that should receive extra scrutiny during review.
 * @returns {string[]}
 */
export function getSensitivePaths() {
  return [
    'auth/',
    'security/',
    'database/',
    'migrations/',
    'middleware/',
    '.env',
    '.env.',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'Dockerfile',
    'docker-compose',
    '.github/workflows/',
    'tsconfig.json',
    'config/',
    'secrets/',
    'credentials',
    'prisma/schema',
  ];
}

/**
 * Executes a git command and returns the output.
 * @param {string[]} args - Git subcommand and arguments
 * @param {string} cwd
 * @returns {string}
 */
function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Gets the list of changed files between two branches.
 *
 * @param {string} base — base branch name
 * @param {string} head — head branch name
 * @param {string} [cwd=process.cwd()]
 * @returns {ChangedFiles}
 */
export function getChangedFiles(base, head, cwd = process.cwd()) {
  const output = git(['diff', '--name-status', `${base}...${head}`], cwd);
  if (!output) {
    return { added: [], modified: [], deleted: [], renamed: [] };
  }

  const added = [];
  const modified = [];
  const deleted = [];
  const renamed = [];

  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const status = parts[0].trim();
    const file = parts[parts.length - 1].trim();

    if (status === 'A') added.push(file);
    else if (status === 'M') modified.push(file);
    else if (status === 'D') deleted.push(file);
    else if (status.startsWith('R')) renamed.push(file);
    else modified.push(file); // default to modified for unknown statuses
  }

  return { added, modified, deleted, renamed };
}

/**
 * Determines if a file path touches a sensitive area.
 *
 * @param {string} filePath
 * @returns {boolean}
 */
function isSensitivePath(filePath) {
  const sensitive = getSensitivePaths();
  const lower = filePath.toLowerCase();
  return sensitive.some((s) => lower.includes(s.toLowerCase()));
}

/**
 * Analyzes a single file change and assesses risk.
 *
 * @param {string} filePath
 * @param {string} changeType — 'added' | 'modified' | 'deleted' | 'renamed'
 * @returns {ChangeAnalysis}
 */
export function analyzeChange(filePath, changeType) {
  const suggestions = [];
  let risk = 'low';

  const ext = extname(filePath);
  const dir = dirname(filePath);
  const sensitive = isSensitivePath(filePath);

  // Risk assessment based on change type
  if (changeType === 'deleted') {
    risk = 'high';
    suggestions.push('Verify this file is no longer referenced anywhere');
    suggestions.push('Check for imports or requires that depend on this file');
  } else if (changeType === 'modified') {
    risk = 'medium';
  }

  // Sensitive path escalation
  if (sensitive) {
    risk = 'high';
    suggestions.push('This file is in a sensitive area — review carefully');
  }

  // Test-only changes are low risk
  if (filePath.includes('.test.') || filePath.includes('.spec.') ||
      filePath.includes('__tests__') || dir.includes('test')) {
    if (!sensitive) {
      risk = 'low';
    }
    suggestions.push('Verify tests pass after this change');
  }

  // Config file changes
  if (['.json', '.yaml', '.yml', '.toml', '.env'].includes(ext) ||
      filePath.includes('config')) {
    if (risk !== 'high') risk = 'medium';
    suggestions.push('Configuration change — verify all environments');
  }

  // Lock file changes
  if (filePath.includes('lock') || filePath === 'package-lock.json' ||
      filePath === 'yarn.lock' || filePath === 'pnpm-lock.yaml') {
    risk = 'medium';
    suggestions.push('Lock file changed — ensure dependencies are intentional');
  }

  // Migration files
  if (filePath.includes('migration')) {
    risk = 'high';
    suggestions.push('Database migration — verify rollback strategy');
    suggestions.push('Test migration on a staging database first');
  }

  // Large file additions (just flag it)
  if (changeType === 'added') {
    if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
      suggestions.push('New file — ensure it follows project conventions');
    }
  }

  return { file: filePath, changeType, risk, suggestions };
}

/**
 * Performs a full review of changes between two branches.
 *
 * @param {Object} options
 * @param {string} options.baseBranch
 * @param {string} options.headBranch
 * @param {string} [options.targetDir]
 * @returns {ReviewReport}
 */
export function reviewPR(options) {
  const { baseBranch, headBranch, targetDir = process.cwd() } = options;

  const changedFiles = getChangedFiles(baseBranch, headBranch, targetDir);
  const analyses = [];

  for (const file of changedFiles.added) {
    analyses.push(analyzeChange(file, 'added'));
  }
  for (const file of changedFiles.modified) {
    analyses.push(analyzeChange(file, 'modified'));
  }
  for (const file of changedFiles.deleted) {
    analyses.push(analyzeChange(file, 'deleted'));
  }
  for (const file of changedFiles.renamed) {
    analyses.push(analyzeChange(file, 'renamed'));
  }

  const riskSummary = { high: 0, medium: 0, low: 0 };
  for (const a of analyses) {
    riskSummary[a.risk]++;
  }

  return {
    changedFiles,
    analyses,
    riskSummary,
    totalFiles:
      changedFiles.added.length +
      changedFiles.modified.length +
      changedFiles.deleted.length +
      changedFiles.renamed.length,
  };
}

/**
 * Formats a review report as markdown suitable for a PR comment.
 *
 * @param {ReviewReport} report
 * @returns {string}
 */
export function formatReviewReport(report) {
  const lines = [];

  lines.push('## PR Review Summary');
  lines.push('');
  lines.push(`**Files changed:** ${report.totalFiles}`);
  lines.push(`**Risk breakdown:** ${report.riskSummary.high} high, ${report.riskSummary.medium} medium, ${report.riskSummary.low} low`);
  lines.push('');

  // File change overview
  const { changedFiles } = report;
  if (changedFiles.added.length > 0) {
    lines.push(`**Added (${changedFiles.added.length}):** ${changedFiles.added.join(', ')}`);
  }
  if (changedFiles.modified.length > 0) {
    lines.push(`**Modified (${changedFiles.modified.length}):** ${changedFiles.modified.join(', ')}`);
  }
  if (changedFiles.deleted.length > 0) {
    lines.push(`**Deleted (${changedFiles.deleted.length}):** ${changedFiles.deleted.join(', ')}`);
  }
  if (changedFiles.renamed.length > 0) {
    lines.push(`**Renamed (${changedFiles.renamed.length}):** ${changedFiles.renamed.join(', ')}`);
  }
  lines.push('');

  // High-risk items first
  const highRisk = report.analyses.filter((a) => a.risk === 'high');
  if (highRisk.length > 0) {
    lines.push('### High Risk');
    lines.push('');
    for (const item of highRisk) {
      lines.push(`- **${item.file}** (${item.changeType})`);
      for (const suggestion of item.suggestions) {
        lines.push(`  - ${suggestion}`);
      }
    }
    lines.push('');
  }

  // Medium-risk items
  const mediumRisk = report.analyses.filter((a) => a.risk === 'medium');
  if (mediumRisk.length > 0) {
    lines.push('### Medium Risk');
    lines.push('');
    for (const item of mediumRisk) {
      lines.push(`- **${item.file}** (${item.changeType})`);
      for (const suggestion of item.suggestions) {
        lines.push(`  - ${suggestion}`);
      }
    }
    lines.push('');
  }

  // Low-risk summary
  const lowRisk = report.analyses.filter((a) => a.risk === 'low');
  if (lowRisk.length > 0) {
    lines.push('### Low Risk');
    lines.push('');
    for (const item of lowRisk) {
      const sugText = item.suggestions.length > 0 ? ` — ${item.suggestions[0]}` : '';
      lines.push(`- ${item.file} (${item.changeType})${sugText}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
