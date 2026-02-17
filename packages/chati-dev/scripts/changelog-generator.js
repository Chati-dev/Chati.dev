/**
 * Changelog Generator — Produces markdown changelogs from conventional commits.
 *
 * Reads git history, parses conventional commit messages, groups them by type,
 * and formats the output as a structured markdown document.
 *
 * @module scripts/changelog-generator
 */

import { execFileSync } from 'node:child_process';

/**
 * @typedef {Object} ParsedCommit
 * @property {string} type
 * @property {string|null} scope
 * @property {string} description
 * @property {boolean} breaking
 */

/**
 * @typedef {Object} GitCommit
 * @property {string} hash
 * @property {string} message
 * @property {string} date
 * @property {string} author
 */

const TYPE_LABELS = {
  feat: 'Features',
  fix: 'Bug Fixes',
  docs: 'Documentation',
  chore: 'Chores',
  refactor: 'Refactoring',
  test: 'Tests',
  ci: 'CI/CD',
  perf: 'Performance',
  style: 'Style',
  build: 'Build',
  revert: 'Reverts',
};

const TYPE_ORDER = ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'ci', 'chore', 'style', 'build', 'revert'];

/**
 * Parses a conventional commit message.
 *
 * Format: type(scope): description
 * Breaking: type(scope)!: description  OR  BREAKING CHANGE: in body
 *
 * @param {string} message
 * @returns {ParsedCommit|null}
 */
export function parseConventionalCommit(message) {
  if (!message || typeof message !== 'string') return null;

  // Match: type(scope)!: description  or  type!: description  or  type(scope): description  or  type: description
  const regex = /^(\w+)(?:\(([^)]*)\))?(!)?\s*:\s*(.+)/;
  const match = message.trim().match(regex);

  if (!match) return null;

  const [, type, scope, bang, description] = match;
  const breaking = bang === '!' || /\bBREAKING[\s-]CHANGE\b/i.test(message);

  return {
    type: type.toLowerCase(),
    scope: scope || null,
    description: description.trim(),
    breaking,
  };
}

/**
 * Retrieves git commits since a given ref (tag, commit, or date).
 * If `since` is null, returns all commits.
 *
 * @param {string|null} since — git ref or null for all
 * @param {string} [cwd=process.cwd()]
 * @returns {GitCommit[]}
 */
export function getGitCommits(since = null, cwd = process.cwd()) {
  const range = since ? `${since}..HEAD` : 'HEAD';
  const format = '%H||%s||%ai||%an';

  let output;
  try {
    output = execFileSync('git', ['log', range, `--pretty=format:${format}`], {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return [];
  }

  if (!output.trim()) return [];

  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('||');
      return {
        hash: (parts[0] || '').trim(),
        message: (parts[1] || '').trim(),
        date: (parts[2] || '').trim(),
        author: (parts[3] || '').trim(),
      };
    });
}

/**
 * Groups parsed commits by their conventional type.
 *
 * @param {GitCommit[]} commits
 * @returns {Record<string, Array<{ commit: GitCommit, parsed: ParsedCommit }>>}
 */
export function groupCommits(commits) {
  const groups = {};

  for (const commit of commits) {
    const parsed = parseConventionalCommit(commit.message);
    if (!parsed) {
      // Put non-conventional commits under 'other'
      if (!groups.other) groups.other = [];
      groups.other.push({ commit, parsed: { type: 'other', scope: null, description: commit.message, breaking: false } });
      continue;
    }
    const type = parsed.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push({ commit, parsed });
  }

  return groups;
}

/**
 * Formats a single changelog section for a version.
 *
 * @param {string} version
 * @param {string} date
 * @param {Record<string, Array<{ commit: GitCommit, parsed: ParsedCommit }>>} grouped
 * @returns {string}
 */
export function formatChangelogSection(version, date, grouped) {
  const lines = [];
  lines.push(`## ${version} (${date})`);
  lines.push('');

  // Breaking changes first
  const breakingChanges = [];
  for (const entries of Object.values(grouped)) {
    for (const { commit, parsed } of entries) {
      if (parsed.breaking) {
        const scope = parsed.scope ? `**${parsed.scope}**: ` : '';
        breakingChanges.push(`- ${scope}${parsed.description} (${commit.hash.slice(0, 7)})`);
      }
    }
  }

  if (breakingChanges.length > 0) {
    lines.push('### BREAKING CHANGES');
    lines.push('');
    lines.push(...breakingChanges);
    lines.push('');
  }

  // Sections in defined order
  for (const type of TYPE_ORDER) {
    const entries = grouped[type];
    if (!entries || entries.length === 0) continue;

    const label = TYPE_LABELS[type] || type;
    lines.push(`### ${label}`);
    lines.push('');

    for (const { commit, parsed } of entries) {
      if (parsed.breaking) continue; // already listed above
      const scope = parsed.scope ? `**${parsed.scope}**: ` : '';
      lines.push(`- ${scope}${parsed.description} (${commit.hash.slice(0, 7)})`);
    }

    lines.push('');
  }

  // Other (non-conventional) commits
  if (grouped.other && grouped.other.length > 0) {
    lines.push('### Other');
    lines.push('');
    for (const { commit } of grouped.other) {
      lines.push(`- ${commit.message} (${commit.hash.slice(0, 7)})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generates a full changelog string.
 *
 * @param {Object} [options]
 * @param {string} [options.since]    — git ref to start from (tag or commit)
 * @param {string} [options.version]  — version label (default: 'Unreleased')
 * @param {string} [options.cwd]      — working directory
 * @returns {string}
 */
export function generateChangelog(options = {}) {
  const cwd = options.cwd || process.cwd();
  const since = options.since || null;
  const version = options.version || 'Unreleased';
  const date = new Date().toISOString().slice(0, 10);

  const commits = getGitCommits(since, cwd);
  if (commits.length === 0) {
    return `## ${version} (${date})\n\nNo changes.\n`;
  }

  const grouped = groupCommits(commits);
  return formatChangelogSection(version, date, grouped);
}
