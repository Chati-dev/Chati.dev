#!/usr/bin/env node

/**
 * Semantic Linter — Validates cross-reference consistency across the framework.
 *
 * Goes beyond structural validation (validate-agents, validate-tasks) to check
 * semantic consistency: entity registry integrity, domain-agent alignment,
 * workflow references, i18n completeness, schema existence, constitution articles.
 *
 * Exports:
 *   semanticLint(frameworkDir) → { errors, warnings, checks, passed }
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Check that all paths in entity-registry.yaml point to existing files.
 */
function checkEntityRegistryIntegrity(frameworkDir, results) {
  results.checks++;
  const registryPath = join(frameworkDir, 'data', 'entity-registry.yaml');

  if (!existsSync(registryPath)) {
    results.errors.push('Entity registry not found at data/entity-registry.yaml');
    return;
  }

  const registry = yaml.load(readFileSync(registryPath, 'utf-8'));
  const entities = registry.entities || {};
  let total = 0;
  let found = 0;
  const missing = [];

  for (const category of Object.values(entities)) {
    for (const [name, entity] of Object.entries(category)) {
      if (!entity.path) continue;
      total++;

      // Path in registry is relative to project root (e.g., "chati.dev/agents/...")
      // Strip "chati.dev/" prefix to get path relative to frameworkDir
      const relPath = entity.path.replace(/^chati\.dev\//, '');
      if (existsSync(join(frameworkDir, relPath))) {
        found++;
      } else {
        missing.push(`${name}: ${entity.path}`);
      }
    }
  }

  if (missing.length === 0) {
    results.passed++;
    results.details.push(`Entity registry integrity: ${found}/${total} paths exist`);
  } else {
    results.errors.push(`Entity registry: ${missing.length} missing files — ${missing.slice(0, 5).join('; ')}${missing.length > 5 ? '...' : ''}`);
  }
}

/**
 * Check that each agent in domains/agents/ has a corresponding agent definition file.
 */
function checkDomainAgentAlignment(frameworkDir, results) {
  results.checks++;
  const domainsDir = join(frameworkDir, 'domains', 'agents');

  if (!existsSync(domainsDir)) {
    results.errors.push('Domain agents directory not found at domains/agents/');
    return;
  }

  const domainFiles = readdirSync(domainsDir).filter(f => f.endsWith('.yaml'));
  const mismatches = [];

  for (const file of domainFiles) {
    const agentName = basename(file, '.yaml');

    // orchestrator has a different path
    if (agentName === 'orchestrator') {
      if (!existsSync(join(frameworkDir, 'orchestrator', 'chati.md'))) {
        mismatches.push('orchestrator');
      }
      continue;
    }

    // Other agents: check all category dirs
    const agentDirs = ['agents/discover', 'agents/plan', 'agents/quality', 'agents/build', 'agents/deploy'];
    const found = agentDirs.some(dir =>
      existsSync(join(frameworkDir, dir, `${agentName}.md`))
    );

    if (!found) {
      mismatches.push(agentName);
    }
  }

  if (mismatches.length === 0) {
    results.passed++;
    results.details.push(`Domain-agent alignment: ${domainFiles.length}/${domainFiles.length} agents matched`);
  } else {
    results.errors.push(`Domain-agent mismatch: ${mismatches.join(', ')} have domain YAML but no agent .md`);
  }
}

/**
 * Check that i18n files have consistent keys across all languages.
 */
function checkI18nCompleteness(frameworkDir, results) {
  results.checks++;
  const i18nDir = join(frameworkDir, 'i18n');

  if (!existsSync(i18nDir)) {
    results.errors.push('i18n directory not found');
    return;
  }

  const languages = ['en', 'pt', 'es', 'fr'];
  const keysByLang = {};

  for (const lang of languages) {
    const filePath = join(i18nDir, `${lang}.yaml`);
    if (!existsSync(filePath)) {
      results.errors.push(`i18n file missing: ${lang}.yaml`);
      return;
    }

    const content = yaml.load(readFileSync(filePath, 'utf-8'));
    keysByLang[lang] = flattenKeys(content);
  }

  // Use 'en' as reference
  const refKeys = new Set(keysByLang.en);
  const missingByLang = {};

  for (const lang of languages) {
    if (lang === 'en') continue;
    const langKeys = new Set(keysByLang[lang]);

    for (const key of refKeys) {
      // Skip non-translatable keys
      if (key === 'language' || key === 'name') continue;

      if (!langKeys.has(key)) {
        if (!missingByLang[lang]) missingByLang[lang] = [];
        missingByLang[lang].push(key);
      }
    }
  }

  const totalMissing = Object.values(missingByLang).reduce((sum, arr) => sum + arr.length, 0);

  if (totalMissing === 0) {
    results.passed++;
    results.details.push(`i18n completeness: all ${languages.length} languages have consistent keys`);
  } else {
    for (const [lang, keys] of Object.entries(missingByLang)) {
      results.warnings.push(`i18n: '${lang}' missing ${keys.length} key(s): ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`);
    }
    results.passed++; // warnings don't fail the check
  }
}

/**
 * Check that all expected schema files exist.
 */
function checkSchemaExistence(frameworkDir, results) {
  results.checks++;
  const schemasDir = join(frameworkDir, 'schemas');
  const expectedSchemas = [
    'session.schema.json', 'config.schema.json', 'task.schema.json',
    'context.schema.json', 'memory.schema.json',
  ];

  const missing = expectedSchemas.filter(s => !existsSync(join(schemasDir, s)));

  if (missing.length === 0) {
    results.passed++;
    results.details.push(`Schema existence: ${expectedSchemas.length}/${expectedSchemas.length} schemas found`);
  } else {
    results.errors.push(`Missing schemas: ${missing.join(', ')}`);
  }
}

/**
 * Check constitution has >= 17 articles.
 */
function checkConstitution(frameworkDir, results) {
  results.checks++;
  const constitutionPath = join(frameworkDir, 'constitution.md');

  if (!existsSync(constitutionPath)) {
    results.errors.push('constitution.md not found');
    return;
  }

  const content = readFileSync(constitutionPath, 'utf-8');
  const articleCount = (content.match(/^## Article/gm) || []).length;

  if (articleCount >= 17) {
    results.passed++;
    results.details.push(`Constitution: ${articleCount} articles found`);
  } else {
    results.errors.push(`Constitution has only ${articleCount} articles (expected >= 17)`);
  }
}

/**
 * Check that workflow files reference valid agents.
 */
function checkWorkflowAgentRefs(frameworkDir, results) {
  results.checks++;
  const workflowsDir = join(frameworkDir, 'workflows');

  if (!existsSync(workflowsDir)) {
    results.errors.push('workflows/ directory not found');
    return;
  }

  // Collect known agent names
  const knownAgents = new Set(['orchestrator']);
  const agentDirs = ['agents/discover', 'agents/plan', 'agents/quality', 'agents/build', 'agents/deploy'];
  for (const dir of agentDirs) {
    const fullDir = join(frameworkDir, dir);
    if (!existsSync(fullDir)) continue;
    for (const file of readdirSync(fullDir)) {
      if (file.endsWith('.md')) {
        knownAgents.add(basename(file, '.md'));
      }
    }
  }

  const workflowFiles = readdirSync(workflowsDir).filter(f => f.endsWith('.yaml'));
  const unknownRefs = [];

  for (const file of workflowFiles) {
    const content = readFileSync(join(workflowsDir, file), 'utf-8');
    // Look for agent references in YAML (agent: xxx or - xxx in steps)
    const agentRefs = content.match(/agent:\s*(\S+)/g) || [];
    for (const ref of agentRefs) {
      const agentName = ref.replace('agent:', '').trim();
      if (agentName && !knownAgents.has(agentName)) {
        unknownRefs.push(`${file}: ${agentName}`);
      }
    }
  }

  if (unknownRefs.length === 0) {
    results.passed++;
    results.details.push(`Workflow-agent references: ${workflowFiles.length} workflows, all agents valid`);
  } else {
    results.warnings.push(`Unknown agent refs in workflows: ${unknownRefs.join('; ')}`);
    results.passed++; // warnings don't fail
  }
}

/**
 * Flatten a nested object into dot-notation keys.
 */
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Run all semantic lint checks.
 * @param {string} frameworkDir - Path to the framework directory (chati.dev/)
 * @returns {{ errors: string[], warnings: string[], details: string[], checks: number, passed: number }}
 */
export function semanticLint(frameworkDir) {
  const results = { errors: [], warnings: [], details: [], checks: 0, passed: 0 };

  checkEntityRegistryIntegrity(frameworkDir, results);
  checkDomainAgentAlignment(frameworkDir, results);
  checkWorkflowAgentRefs(frameworkDir, results);
  checkI18nCompleteness(frameworkDir, results);
  checkSchemaExistence(frameworkDir, results);
  checkConstitution(frameworkDir, results);

  return results;
}

/**
 * Format results for CLI output.
 */
function formatResults(results) {
  const status = results.errors.length === 0 ? 'PASS' : 'FAIL';
  const lines = [
    `Semantic Lint: ${status} (${results.passed}/${results.checks} checks, ${results.warnings.length} warnings, ${results.errors.length} errors)`,
    '',
  ];

  for (const detail of results.details) {
    lines.push(`  ✓ ${detail}`);
  }

  for (const warning of results.warnings) {
    lines.push(`  ⚠ ${warning}`);
  }

  for (const error of results.errors) {
    lines.push(`  ✗ ${error}`);
  }

  return lines.join('\n');
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const frameworkDir = join(__dirname, '..', '..', '..', 'chati.dev');
  const results = semanticLint(frameworkDir);

  console.log(formatResults(results));

  if (results.errors.length > 0) {
    process.exit(1);
  }
}
