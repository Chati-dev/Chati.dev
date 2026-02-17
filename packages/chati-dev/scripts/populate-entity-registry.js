#!/usr/bin/env node

/**
 * Populate Entity Registry — Scans filesystem and populates entity-registry.yaml.
 *
 * Exports:
 *   populateRegistry(frameworkDir) → writes data/entity-registry.yaml
 *   diffRegistry(frameworkDir) → { added: [], removed: [], modified: [] }
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, basename, extname } from 'path';
import yaml from 'js-yaml';

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the first meaningful line or YAML description from a file.
 * @param {string} filePath - Absolute path to the file.
 * @returns {string} Purpose string.
 */
function extractPurpose(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const ext = extname(filePath);

    // YAML files — look for description or purpose field
    if (ext === '.yaml' || ext === '.yml') {
      const parsed = yaml.load(content);
      if (parsed?.description) return parsed.description;
      if (parsed?.purpose) return parsed.purpose;
      if (parsed?.summary) return String(parsed.summary).slice(0, 120);
    }

    // JSON files — look for description
    if (ext === '.json') {
      const parsed = JSON.parse(content);
      if (parsed.description) return parsed.description;
      if (parsed.title) return parsed.title;
    }

    // Markdown files — first heading or first paragraph
    if (ext === '.md') {
      // Check for YAML frontmatter with purpose/description
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (fmMatch) {
        try {
          const fm = yaml.load(fmMatch[1]);
          if (fm?.purpose) return fm.purpose;
          if (fm?.description) return fm.description;
        } catch {
          // Ignore
        }
      }

      // First heading
      const headingMatch = content.match(/^#\s+(.+)/m);
      if (headingMatch) return headingMatch[1].trim().slice(0, 120);

      // First non-empty line
      const firstLine = content.split('\n').find(l => l.trim().length > 0);
      if (firstLine) return firstLine.trim().slice(0, 120);
    }

    // JS files — first JSDoc or comment
    if (ext === '.js' || ext === '.mjs') {
      const jsdocMatch = content.match(/\/\*\*\s*\n?\s*\*\s*(.+)/);
      if (jsdocMatch) return jsdocMatch[1].trim().slice(0, 120);

      const commentMatch = content.match(/^\/\/\s*(.+)/m);
      if (commentMatch) return commentMatch[1].trim().slice(0, 120);
    }

    return '';
  } catch {
    return '';
  }
}

/**
 * Extract keywords from a file.
 * @param {string} filePath - Absolute path to the file.
 * @returns {string[]} Extracted keywords.
 */
function extractKeywords(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const ext = extname(filePath);

    // YAML frontmatter — tags or keywords field
    if (ext === '.md') {
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (fmMatch) {
        try {
          const fm = yaml.load(fmMatch[1]);
          if (Array.isArray(fm?.tags)) return fm.tags;
          if (Array.isArray(fm?.keywords)) return fm.keywords;
        } catch {
          // Ignore
        }
      }
    }

    // YAML files
    if (ext === '.yaml' || ext === '.yml') {
      const parsed = yaml.load(content);
      if (Array.isArray(parsed?.keywords)) return parsed.keywords;
      if (Array.isArray(parsed?.tags)) return parsed.tags;
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Determine entity type from directory name and file extension.
 * @param {string} dirCategory - Parent directory category (e.g., 'agents', 'schemas').
 * @param {string} _ext - File extension.
 * @returns {string} Entity type.
 */
function entityType(dirCategory, _ext) {
  const typeMap = {
    agents: 'agent',
    orchestrator: 'agent',
    schemas: 'schema',
    templates: 'template',
    workflows: 'workflow',
    domains: 'domain',
    hooks: 'hook',
    'quality-gates': 'governance',
    intelligence: 'intelligence',
    frameworks: 'framework',
    patterns: 'framework',
    i18n: 'framework',
    migrations: 'framework',
    data: 'framework',
  };

  return typeMap[dirCategory] || 'unknown';
}

/**
 * Scan a single directory for entities.
 * @param {string} frameworkDir - Root framework directory.
 * @param {string} relDir - Relative directory within framework.
 * @param {string} category - Entity category name.
 * @returns {object[]} Array of entity objects.
 */
function scanEntities(frameworkDir, relDir, category) {
  const dirPath = join(frameworkDir, relDir);
  if (!existsSync(dirPath)) return [];

  const entities = [];

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Recurse into subdirectories (e.g., agents/discover/, agents/plan/, agents/build/)
        const subEntities = scanEntities(frameworkDir, join(relDir, entry.name), category);
        entities.push(...subEntities);
        continue;
      }

      if (!entry.isFile()) continue;

      const ext = extname(entry.name);
      // Only process known file types
      if (!['.md', '.yaml', '.yml', '.json', '.js', '.mjs'].includes(ext)) continue;

      const fullPath = join(dirPath, entry.name);
      const entityName = basename(entry.name, ext);
      const relPath = join(relDir, entry.name);
      const stat = statSync(fullPath);

      entities.push({
        name: entityName,
        path: `chati.dev/${relPath}`,
        type: entityType(category, ext),
        purpose: extractPurpose(fullPath),
        keywords: extractKeywords(fullPath),
        lastModified: stat.mtime.toISOString(),
      });
    }
  } catch {
    // Skip unreadable directories
  }

  return entities;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan the filesystem and build a complete entity registry.
 * @param {string} frameworkDir - Path to the framework directory.
 * @returns {{ path: string, registry: object }} Written registry.
 */
export function populateRegistry(frameworkDir) {
  if (!existsSync(frameworkDir)) {
    throw new Error(`Framework directory not found: ${frameworkDir}`);
  }

  // Define scan targets
  const scanTargets = [
    { relDir: 'agents', category: 'agents' },
    { relDir: 'orchestrator', category: 'orchestrator' },
    { relDir: 'schemas', category: 'schemas' },
    { relDir: 'templates', category: 'templates' },
    { relDir: 'workflows', category: 'workflows' },
    { relDir: 'domains', category: 'domains' },
    { relDir: 'hooks', category: 'hooks' },
    { relDir: 'quality-gates', category: 'quality-gates' },
    { relDir: 'intelligence', category: 'intelligence' },
    { relDir: 'frameworks', category: 'frameworks' },
    { relDir: 'patterns', category: 'patterns' },
    { relDir: 'i18n', category: 'i18n' },
    { relDir: 'migrations', category: 'migrations' },
  ];

  // Collect all entities grouped by category
  const entities = {};
  let totalCount = 0;

  for (const { relDir, category } of scanTargets) {
    const found = scanEntities(frameworkDir, relDir, category);
    if (found.length > 0) {
      // Group into the entity category
      const groupName = category === 'orchestrator' ? 'agents' : category;
      if (!entities[groupName]) entities[groupName] = {};

      for (const entity of found) {
        entities[groupName][entity.name] = {
          path: entity.path,
          type: entity.type,
          purpose: entity.purpose,
          keywords: entity.keywords,
          lastModified: entity.lastModified,
        };
        totalCount++;
      }
    }
  }

  // Also add constitution.md and config.yaml as special entities
  const constPath = join(frameworkDir, 'constitution.md');
  if (existsSync(constPath)) {
    if (!entities.governance) entities.governance = {};
    entities.governance.constitution = {
      path: 'chati.dev/constitution.md',
      type: 'governance',
      purpose: extractPurpose(constPath),
      keywords: ['constitution', 'governance', 'rules', 'articles', 'enforcement'],
      lastModified: statSync(constPath).mtime.toISOString(),
    };
    totalCount++;
  }

  const configPath = join(frameworkDir, 'config.yaml');
  if (existsSync(configPath)) {
    if (!entities.config) entities.config = {};
    entities.config.config = {
      path: 'chati.dev/config.yaml',
      type: 'framework',
      purpose: extractPurpose(configPath),
      keywords: ['config', 'version', 'installation', 'settings'],
      lastModified: statSync(configPath).mtime.toISOString(),
    };
    totalCount++;
  }

  // Add entity-registry itself
  const regPath = join(frameworkDir, 'data', 'entity-registry.yaml');
  if (!entities.data) entities.data = {};
  entities.data['entity-registry'] = {
    path: 'chati.dev/data/entity-registry.yaml',
    type: 'framework',
    purpose: 'Central catalog of all system artifacts (this file)',
    keywords: ['registry', 'catalog', 'entities', 'artifacts'],
    lastModified: existsSync(regPath) ? statSync(regPath).mtime.toISOString() : new Date().toISOString(),
  };
  totalCount++;

  // Build registry object
  const registry = {
    metadata: {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      entity_count: totalCount,
      checksum_algorithm: 'sha256',
    },
    entities,
  };

  // Write the file
  const dataDir = join(frameworkDir, 'data');
  mkdirSync(dataDir, { recursive: true });

  const outputPath = join(dataDir, 'entity-registry.yaml');
  const header = [
    '# chati.dev Entity Registry — Central Catalog of All System Artifacts',
    '# Used by the Decision Engine for REUSE/ADAPT/CREATE recommendations',
    '# and by the Health Check for system integrity validation.',
    '',
  ].join('\n');

  const yamlContent = yaml.dump(registry, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });

  writeFileSync(outputPath, header + yamlContent, 'utf8');

  return { path: outputPath, registry };
}

/**
 * Compare the existing registry with the current filesystem state.
 * @param {string} frameworkDir - Path to the framework directory.
 * @returns {{ added: object[], removed: object[], modified: object[] }} Diff result.
 */
export function diffRegistry(frameworkDir) {
  const result = { added: [], removed: [], modified: [] };

  // Load existing registry
  const regPath = join(frameworkDir, 'data', 'entity-registry.yaml');
  let existingEntities = {};

  if (existsSync(regPath)) {
    try {
      const existing = yaml.load(readFileSync(regPath, 'utf8'));
      existingEntities = existing?.entities || {};
    } catch {
      // Cannot parse existing registry
    }
  }

  // Build current state
  const { registry: currentRegistry } = populateRegistryDry(frameworkDir);
  const currentEntities = currentRegistry?.entities || {};

  // Flatten both registries for comparison
  const flatten = (entities) => {
    const flat = new Map();
    for (const [category, items] of Object.entries(entities)) {
      if (typeof items === 'object' && items !== null) {
        for (const [name, data] of Object.entries(items)) {
          flat.set(`${category}.${name}`, data);
        }
      }
    }
    return flat;
  };

  const existingFlat = flatten(existingEntities);
  const currentFlat = flatten(currentEntities);

  // Find added
  for (const [key, data] of currentFlat) {
    if (!existingFlat.has(key)) {
      result.added.push({ key, ...data });
    }
  }

  // Find removed
  for (const [key, data] of existingFlat) {
    if (!currentFlat.has(key)) {
      result.removed.push({ key, ...data });
    }
  }

  // Find modified (path changed or purpose changed)
  for (const [key, currentData] of currentFlat) {
    if (existingFlat.has(key)) {
      const existingData = existingFlat.get(key);
      if (existingData.path !== currentData.path || existingData.purpose !== currentData.purpose) {
        result.modified.push({ key, old: existingData, new: currentData });
      }
    }
  }

  return result;
}

/**
 * Build registry without writing to disk (for diff comparisons).
 * @param {string} frameworkDir - Path to the framework directory.
 * @returns {{ registry: object }}
 */
function populateRegistryDry(frameworkDir) {
  if (!existsSync(frameworkDir)) {
    return { registry: { entities: {} } };
  }

  const scanTargets = [
    { relDir: 'agents', category: 'agents' },
    { relDir: 'orchestrator', category: 'orchestrator' },
    { relDir: 'schemas', category: 'schemas' },
    { relDir: 'templates', category: 'templates' },
    { relDir: 'workflows', category: 'workflows' },
    { relDir: 'domains', category: 'domains' },
    { relDir: 'hooks', category: 'hooks' },
    { relDir: 'quality-gates', category: 'quality-gates' },
    { relDir: 'intelligence', category: 'intelligence' },
    { relDir: 'frameworks', category: 'frameworks' },
    { relDir: 'patterns', category: 'patterns' },
    { relDir: 'i18n', category: 'i18n' },
    { relDir: 'migrations', category: 'migrations' },
  ];

  const entities = {};
  let totalCount = 0;

  for (const { relDir, category } of scanTargets) {
    const found = scanEntities(frameworkDir, relDir, category);
    if (found.length > 0) {
      const groupName = category === 'orchestrator' ? 'agents' : category;
      if (!entities[groupName]) entities[groupName] = {};

      for (const entity of found) {
        entities[groupName][entity.name] = {
          path: entity.path,
          type: entity.type,
          purpose: entity.purpose,
        };
        totalCount++;
      }
    }
  }

  return {
    registry: {
      metadata: { entity_count: totalCount },
      entities,
    },
  };
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('populate-entity-registry.js') ||
  process.argv[1].endsWith('populate-entity-registry')
);

if (isMainModule) {
  const frameworkDir = process.argv[2] || join(process.cwd(), 'chati.dev');
  const mode = process.argv[3] || 'populate';

  if (mode === 'diff') {
    console.log(`Diffing registry against: ${frameworkDir}`);
    const diff = diffRegistry(frameworkDir);
    console.log(`Added: ${diff.added.length}`);
    for (const a of diff.added) console.log(`  + ${a.key}`);
    console.log(`Removed: ${diff.removed.length}`);
    for (const r of diff.removed) console.log(`  - ${r.key}`);
    console.log(`Modified: ${diff.modified.length}`);
    for (const m of diff.modified) console.log(`  ~ ${m.key}`);
  } else {
    console.log(`Populating registry from: ${frameworkDir}`);
    try {
      const { path, registry } = populateRegistry(frameworkDir);
      console.log(`Entities: ${registry.metadata.entity_count}`);
      console.log(`Categories: ${Object.keys(registry.entities).join(', ')}`);
      console.log(`Written to: ${path}`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  }
}
