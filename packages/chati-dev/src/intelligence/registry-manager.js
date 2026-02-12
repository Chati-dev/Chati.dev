import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const REGISTRY_PATH = 'chati.dev/data/entity-registry.yaml';

/**
 * Check registry integrity against filesystem
 */
export function checkRegistry(targetDir) {
  const registryPath = join(targetDir, REGISTRY_PATH);
  if (!existsSync(registryPath)) {
    return { valid: false, error: 'Entity registry not found', missing: [], orphaned: [] };
  }

  const registry = loadRegistry(registryPath);
  if (!registry) {
    return { valid: false, error: 'Failed to parse entity registry', missing: [], orphaned: [] };
  }

  const missing = [];
  const found = [];

  // Check each registered entity exists on disk
  const entities = flattenEntities(registry.entities);
  for (const entity of entities) {
    const filePath = join(targetDir, entity.path);
    if (existsSync(filePath)) {
      found.push(entity);
    } else {
      missing.push(entity);
    }
  }

  return {
    valid: missing.length === 0,
    totalEntities: entities.length,
    found: found.length,
    missing,
  };
}

/**
 * Get registry statistics
 */
export function getRegistryStats(targetDir) {
  const registryPath = join(targetDir, REGISTRY_PATH);
  if (!existsSync(registryPath)) {
    return { exists: false, totalEntities: 0, byType: {} };
  }

  const registry = loadRegistry(registryPath);
  if (!registry) {
    return { exists: true, totalEntities: 0, byType: {}, error: 'Parse error' };
  }

  const entities = flattenEntities(registry.entities);
  const byType = {};
  for (const entity of entities) {
    const type = entity.type || 'unknown';
    byType[type] = (byType[type] || 0) + 1;
  }

  return {
    exists: true,
    version: registry.metadata?.version || 'unknown',
    totalEntities: entities.length,
    declaredCount: registry.metadata?.entity_count || 0,
    countMatch: entities.length === (registry.metadata?.entity_count || 0),
    byType,
  };
}

/**
 * Validate all entities exist on disk
 */
export function validateEntities(targetDir) {
  const result = checkRegistry(targetDir);
  return {
    valid: result.valid,
    total: result.totalEntities || 0,
    found: result.found || 0,
    missing: (result.missing || []).map(e => e.path),
  };
}

/**
 * Run comprehensive health check
 */
export function runHealthCheck(targetDir) {
  const checks = {
    registry: { pass: false, details: '' },
    schemas: { pass: false, details: '' },
    constitution: { pass: false, details: '' },
    agents: { pass: false, details: '' },
    entities: { pass: false, details: '' },
    overall: 'UNHEALTHY',
  };

  // 1. Registry check
  const registryStats = getRegistryStats(targetDir);
  if (registryStats.exists && registryStats.totalEntities > 0) {
    checks.registry.pass = true;
    checks.registry.details = `${registryStats.totalEntities} entities registered (v${registryStats.version})`;
  } else {
    checks.registry.details = registryStats.exists ? 'Registry empty or invalid' : 'Registry not found';
  }

  // 2. Schema validation
  const schemaFiles = [
    'session.schema.json', 'config.schema.json', 'task.schema.json',
    'context.schema.json', 'memory.schema.json',
  ];
  let validSchemas = 0;
  for (const file of schemaFiles) {
    const schemaPath = join(targetDir, 'chati.dev', 'schemas', file);
    if (existsSync(schemaPath)) {
      try {
        JSON.parse(readFileSync(schemaPath, 'utf-8'));
        validSchemas++;
      } catch {
        // Invalid JSON
      }
    }
  }
  checks.schemas.pass = validSchemas === schemaFiles.length;
  checks.schemas.details = `${validSchemas}/${schemaFiles.length} valid`;

  // 3. Constitution check
  const constitutionPath = join(targetDir, 'chati.dev', 'constitution.md');
  if (existsSync(constitutionPath)) {
    const content = readFileSync(constitutionPath, 'utf-8');
    const articleCount = (content.match(/^## Article/gm) || []).length;
    checks.constitution.pass = articleCount >= 16;
    checks.constitution.details = `${articleCount}/16 articles`;
  } else {
    checks.constitution.details = 'Not found';
  }

  // 4. Agent check
  const agentPaths = [
    'orchestrator/chati.md',
    'agents/clarity/greenfield-wu.md', 'agents/clarity/brownfield-wu.md',
    'agents/clarity/brief.md', 'agents/clarity/detail.md',
    'agents/clarity/architect.md', 'agents/clarity/ux.md',
    'agents/clarity/phases.md', 'agents/clarity/tasks.md',
    'agents/quality/qa-planning.md', 'agents/quality/qa-implementation.md',
    'agents/build/dev.md', 'agents/deploy/devops.md',
  ];
  let foundAgents = 0;
  for (const p of agentPaths) {
    if (existsSync(join(targetDir, 'chati.dev', p))) foundAgents++;
  }
  checks.agents.pass = foundAgents === 13;
  checks.agents.details = `${foundAgents}/13 present`;

  // 5. Entity validation (registry vs filesystem)
  const entityResult = validateEntities(targetDir);
  checks.entities.pass = entityResult.valid;
  checks.entities.details = `${entityResult.found}/${entityResult.total} present`;

  // Overall
  const passCount = Object.values(checks).filter(c => c && c.pass).length;
  const totalChecks = 5;
  checks.overall = passCount === totalChecks ? 'HEALTHY' : passCount >= 3 ? 'DEGRADED' : 'UNHEALTHY';
  checks.passCount = passCount;
  checks.totalChecks = totalChecks;

  return checks;
}

/**
 * Load and parse registry YAML
 */
function loadRegistry(registryPath) {
  try {
    const content = readFileSync(registryPath, 'utf-8');
    return yaml.load(content);
  } catch {
    return null;
  }
}

/**
 * Flatten nested entity categories into flat array
 */
function flattenEntities(entities) {
  if (!entities) return [];
  const flat = [];

  for (const [, items] of Object.entries(entities)) {
    if (typeof items === 'object' && items !== null) {
      for (const [name, entity] of Object.entries(items)) {
        if (entity && entity.path) {
          flat.push({ name, ...entity });
        }
      }
    }
  }

  return flat;
}
