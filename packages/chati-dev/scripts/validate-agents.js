#!/usr/bin/env node

/**
 * Validate Agents — Validates agent definition files (.md with frontmatter-like structure).
 *
 * Exports:
 *   validateAllAgents(frameworkDir) → AgentValidationReport
 *   validateAgent(frameworkDir, agentPath) → single agent validation result
 *   getAgentCompleteness(agentContent) → { score: 0-100, missing: [] }
 *
 * EXPECTED_AGENTS: 12 agents + 1 orchestrator = 13 total
 */

import { readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import yaml from 'js-yaml';

/**
 * Expected agents organized by category.
 */
export const EXPECTED_AGENTS = {
  discover: ['greenfield-wu', 'brownfield-wu', 'brief'],
  plan: ['detail', 'architect', 'ux', 'phases', 'tasks'],
  quality: ['qa-planning', 'qa-implementation'],
  build: ['dev'],
  deploy: ['devops'],
};

/**
 * All expected agent names as a flat list (excluding orchestrator).
 */
export const ALL_AGENT_NAMES = Object.values(EXPECTED_AGENTS).flat();

/**
 * Sections expected in a complete agent definition.
 */
const COMPLETENESS_SECTIONS = [
  { name: 'Identity', patterns: ['## Identity', '## identity'] },
  { name: 'Mission', patterns: ['## Mission', '## mission'] },
  { name: 'On Activation', patterns: ['## On Activation', '## on activation'] },
  { name: 'Execution', patterns: ['## Execution', '## execution', '## Steps', '## steps'] },
  { name: 'Self-Validation', patterns: ['## Self-Validation', '## self-validation', '## Validation', 'Self-Validation Criteria'] },
  { name: 'Handoff', patterns: ['## Handoff', '## handoff', 'Handoff Protocol', 'handoff_to'] },
  { name: 'Protocols', patterns: ['## Protocols', '## protocols', 'Universal Protocols'] },
  { name: 'Behavioral', patterns: ['## Behavioral', '## behavioral', '## Personality', '## personality', '## Style', '## Communication'] },
];

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Parse identity fields from agent markdown content.
 * Agent files use markdown sections rather than YAML frontmatter.
 * We extract identity from the "## Identity" section.
 * @param {string} content - Full agent .md content.
 * @returns {object} Parsed identity fields.
 */
function parseAgentIdentity(content) {
  const identity = {};

  // Extract Role
  const roleMatch = content.match(/\*\*Role\*\*:\s*(.+)/);
  if (roleMatch) identity.role = roleMatch[1].trim();

  // Extract Pipeline Position
  const posMatch = content.match(/\*\*Pipeline Position\*\*:\s*(.+)/);
  if (posMatch) identity.pipelinePosition = posMatch[1].trim();

  // Extract Category
  const catMatch = content.match(/\*\*Category\*\*:\s*(.+)/);
  if (catMatch) identity.category = catMatch[1].trim();

  // Extract name from title
  const titleMatch = content.match(/^#\s+(.+?)(?:\s*—|\s*-|\n)/m);
  if (titleMatch) identity.title = titleMatch[1].trim();

  // Extract Question Answered
  const questionMatch = content.match(/\*\*Question Answered\*\*:\s*(.+)/);
  if (questionMatch) identity.questionAnswered = questionMatch[1].trim();

  return identity;
}

/**
 * Extract the agent name from the filename.
 * @param {string} filePath - Path to the agent .md file.
 * @returns {string} Agent name without extension.
 */
function agentNameFromPath(filePath) {
  return basename(filePath, '.md');
}

/**
 * Get the completeness score for an agent definition.
 * @param {string} agentContent - Full markdown content of the agent.
 * @returns {{ score: number, missing: string[], found: string[] }}
 */
export function getAgentCompleteness(agentContent) {
  const found = [];
  const missing = [];

  for (const section of COMPLETENESS_SECTIONS) {
    const hasSection = section.patterns.some(p =>
      agentContent.toLowerCase().includes(p.toLowerCase()),
    );
    if (hasSection) {
      found.push(section.name);
    } else {
      missing.push(section.name);
    }
  }

  const score = Math.round((found.length / COMPLETENESS_SECTIONS.length) * 100);

  return { score, missing, found };
}

/**
 * Validate a single agent definition file.
 * @param {string} frameworkDir - Path to the framework directory.
 * @param {string} agentRelPath - Relative path to the agent file within agents/ or orchestrator/.
 * @returns {object} Validation result.
 */
export function validateAgent(frameworkDir, agentRelPath) {
  const fullPath = join(frameworkDir, agentRelPath);
  const agentName = agentNameFromPath(fullPath);

  const result = {
    name: agentName,
    path: agentRelPath,
    valid: true,
    errors: [],
    warnings: [],
    completeness: null,
    identity: null,
  };

  // Check file exists
  if (!existsSync(fullPath)) {
    result.valid = false;
    result.errors.push(`File not found: ${agentRelPath}`);
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

  // Check non-empty
  if (content.trim().length === 0) {
    result.valid = false;
    result.errors.push('File is empty');
    return result;
  }

  // Check has a title heading
  if (!content.match(/^#\s+.+/m)) {
    result.warnings.push('No title heading found');
  }

  // Parse identity
  const identity = parseAgentIdentity(content);
  result.identity = identity;

  // Check Identity section exists
  if (!identity.role && agentName !== 'chati') {
    result.warnings.push('No Role found in Identity section');
  }

  // Check Category for non-orchestrator agents
  if (agentName !== 'chati' && !identity.category) {
    result.warnings.push('No Category found in Identity section');
  }

  // Check Mission section
  if (!content.toLowerCase().includes('## mission') && !content.toLowerCase().includes('## on activation')) {
    result.warnings.push('No Mission or On Activation section found');
  }

  // Completeness check
  result.completeness = getAgentCompleteness(content);

  // Low completeness is a warning
  if (result.completeness.score < 50) {
    result.warnings.push(`Low completeness score: ${result.completeness.score}%`);
  }

  // Validation result
  if (result.errors.length > 0) {
    result.valid = false;
  }

  return result;
}

/**
 * Validate all expected agent files.
 * @param {string} frameworkDir - Path to the framework directory.
 * @returns {object} Full validation report.
 */
export function validateAllAgents(frameworkDir) {
  const report = {
    valid: true,
    agents: [],
    missing: [],
    totalExpected: ALL_AGENT_NAMES.length + 1, // +1 for orchestrator
    totalFound: 0,
    totalValid: 0,
    errors: [],
    warnings: [],
  };

  if (!existsSync(frameworkDir)) {
    report.valid = false;
    report.errors.push(`Framework directory not found: ${frameworkDir}`);
    return report;
  }

  // Validate each expected agent
  for (const [category, agents] of Object.entries(EXPECTED_AGENTS)) {
    for (const agent of agents) {
      const relPath = join('agents', category, `${agent}.md`);
      const fullPath = join(frameworkDir, relPath);

      if (!existsSync(fullPath)) {
        report.missing.push(agent);
        report.agents.push({
          name: agent,
          path: relPath,
          valid: false,
          errors: ['File not found'],
          warnings: [],
          completeness: null,
          identity: null,
        });
        continue;
      }

      report.totalFound++;
      const result = validateAgent(frameworkDir, relPath);
      report.agents.push(result);
      if (result.valid) report.totalValid++;
    }
  }

  // Validate orchestrator
  const orchRelPath = join('orchestrator', 'chati.md');
  const orchFullPath = join(frameworkDir, orchRelPath);

  if (!existsSync(orchFullPath)) {
    report.missing.push('orchestrator');
    report.agents.push({
      name: 'orchestrator',
      path: orchRelPath,
      valid: false,
      errors: ['File not found'],
      warnings: [],
      completeness: null,
      identity: null,
    });
  } else {
    report.totalFound++;
    const orchResult = validateAgent(frameworkDir, orchRelPath);
    orchResult.name = 'orchestrator';
    report.agents.push(orchResult);
    if (orchResult.valid) report.totalValid++;
  }

  // Cross-reference with entity-registry
  const regPath = join(frameworkDir, 'data', 'entity-registry.yaml');
  if (existsSync(regPath)) {
    try {
      const registry = yaml.load(readFileSync(regPath, 'utf8'));
      const registeredAgents = registry?.entities?.agents ? Object.keys(registry.entities.agents) : [];

      for (const agent of ALL_AGENT_NAMES) {
        if (!registeredAgents.includes(agent)) {
          report.warnings.push(`Agent '${agent}' not found in entity-registry.yaml`);
        }
      }

      if (!registeredAgents.includes('orchestrator')) {
        report.warnings.push("Orchestrator not found in entity-registry.yaml");
      }
    } catch {
      report.warnings.push('Could not cross-reference with entity-registry.yaml');
    }
  }

  // Overall validity
  if (report.missing.length > 0) {
    report.valid = false;
    report.errors.push(`Missing ${report.missing.length} agent(s): ${report.missing.join(', ')}`);
  }

  return report;
}

/**
 * Format agent validation report as a human-readable string.
 * @param {object} report - Report from validateAllAgents.
 * @returns {string}
 */
export function formatAgentReport(report) {
  const lines = [
    '=== Agent Validation Report ===',
    `Status: ${report.valid ? '[PASS]' : '[FAIL]'}`,
    `Agents: ${report.totalFound}/${report.totalExpected} found, ${report.totalValid} valid`,
    '',
  ];

  if (report.missing.length > 0) {
    lines.push(`Missing: ${report.missing.join(', ')}`);
    lines.push('');
  }

  for (const agent of report.agents) {
    const symbol = agent.valid ? '[PASS]' : '[FAIL]';
    const completeness = agent.completeness ? ` (${agent.completeness.score}%)` : '';
    lines.push(`  ${symbol} ${agent.name}${completeness}`);

    for (const err of agent.errors) {
      lines.push(`        ERROR: ${err}`);
    }
    for (const warn of agent.warnings) {
      lines.push(`        WARN: ${warn}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warn of report.warnings) {
      lines.push(`  - ${warn}`);
    }
  }

  lines.push('');
  lines.push('=== End Report ===');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('validate-agents.js') ||
  process.argv[1].endsWith('validate-agents')
);

if (isMainModule) {
  const frameworkDir = process.argv[2] || join(process.cwd(), 'chati.dev');

  console.log(`Validating agents in: ${frameworkDir}`);
  const report = validateAllAgents(frameworkDir);
  console.log(formatAgentReport(report));

  if (!report.valid) {
    process.exit(1);
  }
}
