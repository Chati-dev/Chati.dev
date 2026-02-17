#!/usr/bin/env node

/**
 * Validate Tasks — Validates task definition files (.md with YAML frontmatter).
 *
 * Exports:
 *   validateAllTasks(tasksDir) → TaskValidationReport
 *   validateTask(tasksDir, taskId) → single task validation
 *   validateHandoffChain(tasksDir) → checks the entire handoff chain is connected
 *   getTaskStats(tasksDir) → { total, byAgent, byPhase, withHandoffs, withoutHandoffs }
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import yaml from 'js-yaml';

import { ALL_AGENT_NAMES } from './validate-agents.js';

/**
 * Required fields in task frontmatter.
 */
const REQUIRED_FIELDS = ['id', 'agent'];

/**
 * Valid phase values.
 */
const VALID_PHASES = ['discover', 'plan', 'planning', 'build', 'deploy', 'validate', 'quality'];

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Parse YAML frontmatter from a markdown file.
 * @param {string} content - Full file content.
 * @returns {{ frontmatter: object|null, body: string, error: string|null }}
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return { frontmatter: null, body: content, error: 'No YAML frontmatter found' };
  }

  try {
    const frontmatter = yaml.load(match[1]);
    const body = content.slice(match[0].length).trim();
    return { frontmatter, body, error: null };
  } catch (err) {
    return { frontmatter: null, body: content, error: `Invalid YAML: ${err.message}` };
  }
}

/**
 * Validate a single task definition.
 * @param {string} tasksDir - Directory containing task .md files.
 * @param {string} filename - Task filename (e.g., 'brief-extract-requirements.md').
 * @returns {object} Validation result.
 */
export function validateTask(tasksDir, filename) {
  const fullPath = join(tasksDir, filename);
  const taskName = basename(filename, '.md');

  const result = {
    name: taskName,
    file: filename,
    valid: true,
    errors: [],
    warnings: [],
    frontmatter: null,
  };

  // Check file exists
  if (!existsSync(fullPath)) {
    result.valid = false;
    result.errors.push(`File not found: ${filename}`);
    return result;
  }

  let content;
  try {
    content = readFileSync(fullPath, 'utf8');
  } catch (err) {
    result.valid = false;
    result.errors.push(`Cannot read file: ${err.message}`);
    return result;
  }

  // Parse frontmatter
  const { frontmatter, error } = parseFrontmatter(content);
  if (error) {
    result.valid = false;
    result.errors.push(error);
    return result;
  }

  result.frontmatter = frontmatter;

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!frontmatter[field]) {
      result.valid = false;
      result.errors.push(`Missing required field: '${field}'`);
    }
  }

  // Check id matches filename
  if (frontmatter.id && frontmatter.id !== taskName) {
    result.warnings.push(`Task id '${frontmatter.id}' does not match filename '${taskName}'`);
  }

  // Check agent is a known agent
  if (frontmatter.agent) {
    const knownAgents = [...ALL_AGENT_NAMES, 'orchestrator'];
    if (!knownAgents.includes(frontmatter.agent)) {
      result.warnings.push(`Unknown agent: '${frontmatter.agent}'`);
    }
  }

  // Check phase is valid
  if (frontmatter.phase && !VALID_PHASES.includes(frontmatter.phase)) {
    result.warnings.push(`Unknown phase: '${frontmatter.phase}'`);
  }

  // Check criteria is not empty (if present)
  if (frontmatter.criteria !== undefined) {
    if (!Array.isArray(frontmatter.criteria) || frontmatter.criteria.length === 0) {
      result.warnings.push('criteria field is empty or not an array');
    }
  } else {
    result.warnings.push('No criteria defined');
  }

  // Check outputs is not empty (if present)
  if (frontmatter.outputs !== undefined) {
    if (!Array.isArray(frontmatter.outputs) || frontmatter.outputs.length === 0) {
      result.warnings.push('outputs field is empty or not an array');
    }
  }

  // Check handoff_to is a valid reference
  if (frontmatter.handoff_to) {
    // handoff_to could be a task id or agent name — validated in chain check
  }

  return result;
}

/**
 * Validate all task files in a directory.
 * @param {string} tasksDir - Directory containing task .md files.
 * @returns {object} TaskValidationReport.
 */
export function validateAllTasks(tasksDir) {
  const report = {
    valid: true,
    tasks: [],
    errors: [],
    warnings: [],
    totalFiles: 0,
    totalValid: 0,
    duplicateIds: [],
  };

  if (!existsSync(tasksDir)) {
    report.valid = false;
    report.errors.push(`Tasks directory not found: ${tasksDir}`);
    return report;
  }

  let files;
  try {
    files = readdirSync(tasksDir).filter(f => f.endsWith('.md'));
  } catch (err) {
    report.valid = false;
    report.errors.push(`Cannot read directory: ${err.message}`);
    return report;
  }

  report.totalFiles = files.length;

  if (files.length === 0) {
    report.warnings.push('No task .md files found');
    return report;
  }

  // Track IDs for duplicate detection
  const seenIds = new Map();

  for (const file of files) {
    const result = validateTask(tasksDir, file);
    report.tasks.push(result);

    if (result.valid) {
      report.totalValid++;
    }

    // Track duplicate IDs
    const taskId = result.frontmatter?.id;
    if (taskId) {
      if (seenIds.has(taskId)) {
        report.duplicateIds.push({ id: taskId, files: [seenIds.get(taskId), file] });
      } else {
        seenIds.set(taskId, file);
      }
    }
  }

  // Report duplicate IDs
  if (report.duplicateIds.length > 0) {
    report.valid = false;
    for (const dup of report.duplicateIds) {
      report.errors.push(`Duplicate task id '${dup.id}' in: ${dup.files.join(', ')}`);
    }
  }

  return report;
}

/**
 * Validate the handoff chain across all tasks.
 * @param {string} tasksDir - Directory containing task .md files.
 * @returns {object} Handoff chain validation result.
 */
export function validateHandoffChain(tasksDir) {
  const result = {
    valid: true,
    chains: [],
    orphans: [],
    brokenLinks: [],
    errors: [],
  };

  if (!existsSync(tasksDir)) {
    result.valid = false;
    result.errors.push(`Tasks directory not found: ${tasksDir}`);
    return result;
  }

  let files;
  try {
    files = readdirSync(tasksDir).filter(f => f.endsWith('.md'));
  } catch (err) {
    result.valid = false;
    result.errors.push(`Cannot read directory: ${err.message}`);
    return result;
  }

  // Load all tasks
  const tasks = new Map();
  const tasksByAgent = new Map();

  for (const file of files) {
    const fullPath = join(tasksDir, file);
    try {
      const content = readFileSync(fullPath, 'utf8');
      const { frontmatter } = parseFrontmatter(content);
      if (frontmatter?.id) {
        tasks.set(frontmatter.id, frontmatter);
        const agent = frontmatter.agent;
        if (agent) {
          if (!tasksByAgent.has(agent)) tasksByAgent.set(agent, []);
          tasksByAgent.get(agent).push(frontmatter.id);
        }
      }
    } catch {
      // Skip unparseable files
    }
  }

  // Check handoff_to references
  const targetedBy = new Set();

  for (const [taskId, task] of tasks) {
    if (task.handoff_to) {
      // handoff_to can reference a task id or an agent-prefixed task
      const target = task.handoff_to;
      // Check if it's a known task ID
      const isKnownTask = tasks.has(target);
      // Check if it's a known agent (handoff to any task of that agent)
      const isKnownAgent = [...ALL_AGENT_NAMES, 'orchestrator'].includes(target);

      if (isKnownTask) {
        targetedBy.add(target);
      } else if (isKnownAgent) {
        // Valid — handoff to an agent
        targetedBy.add(target);
      } else {
        result.brokenLinks.push({ from: taskId, to: target });
      }
    }
  }

  // Find orphaned tasks (not targeted by any handoff, and not triggered by orchestrator)
  for (const [taskId, task] of tasks) {
    if (!targetedBy.has(taskId) && task.trigger !== 'orchestrator') {
      result.orphans.push(taskId);
    }
  }

  // Check agent coverage — every agent should have at least 1 task
  const knownAgents = [...ALL_AGENT_NAMES, 'orchestrator'];
  const uncoveredAgents = knownAgents.filter(agent => !tasksByAgent.has(agent));

  if (uncoveredAgents.length > 0) {
    result.errors.push(`Agents without tasks: ${uncoveredAgents.join(', ')}`);
  }

  if (result.brokenLinks.length > 0) {
    result.valid = false;
    for (const link of result.brokenLinks) {
      result.errors.push(`Broken handoff: '${link.from}' -> '${link.to}'`);
    }
  }

  return result;
}

/**
 * Get statistics about task definitions.
 * @param {string} tasksDir - Directory containing task .md files.
 * @returns {object} Task statistics.
 */
export function getTaskStats(tasksDir) {
  const stats = {
    total: 0,
    byAgent: {},
    byPhase: {},
    withHandoffs: 0,
    withoutHandoffs: 0,
    withCriteria: 0,
    withoutCriteria: 0,
  };

  if (!existsSync(tasksDir)) return stats;

  let files;
  try {
    files = readdirSync(tasksDir).filter(f => f.endsWith('.md'));
  } catch {
    return stats;
  }

  for (const file of files) {
    const fullPath = join(tasksDir, file);
    try {
      const content = readFileSync(fullPath, 'utf8');
      const { frontmatter } = parseFrontmatter(content);
      if (!frontmatter?.id) continue;

      stats.total++;

      // By agent
      if (frontmatter.agent) {
        stats.byAgent[frontmatter.agent] = (stats.byAgent[frontmatter.agent] || 0) + 1;
      }

      // By phase
      if (frontmatter.phase) {
        stats.byPhase[frontmatter.phase] = (stats.byPhase[frontmatter.phase] || 0) + 1;
      }

      // Handoffs
      if (frontmatter.handoff_to) {
        stats.withHandoffs++;
      } else {
        stats.withoutHandoffs++;
      }

      // Criteria
      if (Array.isArray(frontmatter.criteria) && frontmatter.criteria.length > 0) {
        stats.withCriteria++;
      } else {
        stats.withoutCriteria++;
      }
    } catch {
      // Skip
    }
  }

  return stats;
}

/**
 * Format task validation report as a human-readable string.
 * @param {object} report - Report from validateAllTasks.
 * @returns {string}
 */
export function formatTaskReport(report) {
  const lines = [
    '=== Task Validation Report ===',
    `Status: ${report.valid ? '[PASS]' : '[FAIL]'}`,
    `Tasks: ${report.totalValid}/${report.totalFiles} valid`,
    '',
  ];

  if (report.duplicateIds.length > 0) {
    lines.push('Duplicate IDs:');
    for (const dup of report.duplicateIds) {
      lines.push(`  - '${dup.id}' in ${dup.files.join(', ')}`);
    }
    lines.push('');
  }

  for (const task of report.tasks) {
    if (task.errors.length > 0 || task.warnings.length > 0) {
      const symbol = task.valid ? '[WARN]' : '[FAIL]';
      lines.push(`  ${symbol} ${task.name}`);
      for (const err of task.errors) lines.push(`        ERROR: ${err}`);
      for (const warn of task.warnings) lines.push(`        WARN: ${warn}`);
    }
  }

  if (report.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const err of report.errors) lines.push(`  - ${err}`);
  }

  lines.push('');
  lines.push('=== End Report ===');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('validate-tasks.js') ||
  process.argv[1].endsWith('validate-tasks')
);

if (isMainModule) {
  const tasksDir = process.argv[2] || join(process.cwd(), 'chati.dev', 'tasks');

  console.log(`Validating tasks in: ${tasksDir}`);

  const report = validateAllTasks(tasksDir);
  console.log(formatTaskReport(report));

  console.log('\n--- Task Stats ---');
  const stats = getTaskStats(tasksDir);
  console.log(`Total: ${stats.total}`);
  console.log(`By agent:`, stats.byAgent);
  console.log(`By phase:`, stats.byPhase);
  console.log(`With handoffs: ${stats.withHandoffs}, Without: ${stats.withoutHandoffs}`);
  console.log(`With criteria: ${stats.withCriteria}, Without: ${stats.withoutCriteria}`);

  console.log('\n--- Handoff Chain ---');
  const chain = validateHandoffChain(tasksDir);
  if (chain.brokenLinks.length > 0) {
    console.log('Broken links:');
    for (const link of chain.brokenLinks) console.log(`  ${link.from} -> ${link.to}`);
  }
  if (chain.orphans.length > 0) {
    console.log(`Orphaned tasks: ${chain.orphans.join(', ')}`);
  }
  if (chain.errors.length > 0) {
    for (const err of chain.errors) console.log(`  ERROR: ${err}`);
  }

  if (!report.valid) {
    process.exit(1);
  }
}
