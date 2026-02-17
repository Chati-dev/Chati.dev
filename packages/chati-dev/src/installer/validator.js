import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { hashFile } from './file-hasher.js';
import { loadManifest } from './manifest.js';

/**
 * Validate chati.dev installation
 * Checks all 13 agents, constitution, session, schemas, etc.
 */
export async function validateInstallation(targetDir) {
  const results = {
    agents: { pass: false, details: [] },
    constitution: { pass: false, details: [] },
    session: { pass: false, details: [] },
    schemas: { pass: false, details: [] },
    workflows: { pass: false, details: [] },
    templates: { pass: false, details: [] },
    intelligence: { pass: false, details: [] },
    registry: { pass: false, details: [] },
    memories: { pass: false, details: [] },
    context: { pass: false, details: [] },
    integrity: { pass: false, details: [] },
    total: 0,
    passed: 0,
  };

  // Check all 13 agents (orchestrator + 12 specialized)
  const agentFiles = [
    'orchestrator/chati.md',
    'agents/discover/greenfield-wu.md',
    'agents/discover/brownfield-wu.md',
    'agents/discover/brief.md',
    'agents/plan/detail.md',
    'agents/plan/architect.md',
    'agents/plan/ux.md',
    'agents/plan/phases.md',
    'agents/plan/tasks.md',
    'agents/quality/qa-planning.md',
    'agents/quality/qa-implementation.md',
    'agents/build/dev.md',
    'agents/deploy/devops.md',
  ];

  let agentCount = 0;
  for (const file of agentFiles) {
    const filePath = join(targetDir, 'chati.dev', file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      // Check that agent implements protocols (look for key protocol references)
      const hasProtocols = content.includes('Protocol') || content.includes('protocol');
      agentCount++;
      results.agents.details.push({ file, exists: true, hasProtocols });
    } else {
      results.agents.details.push({ file, exists: false, hasProtocols: false });
    }
  }
  results.agents.pass = agentCount === 13;
  results.total += 1;
  if (results.agents.pass) results.passed += 1;

  // Check constitution
  const constitutionPath = join(targetDir, 'chati.dev', 'constitution.md');
  if (existsSync(constitutionPath)) {
    const content = readFileSync(constitutionPath, 'utf-8');
    const articleCount = (content.match(/^## Article/gm) || []).length;
    results.constitution.pass = articleCount >= 17;
    results.constitution.details.push({ articleCount });
  }
  results.total += 1;
  if (results.constitution.pass) results.passed += 1;

  // Check session.yaml
  const sessionPath = join(targetDir, '.chati', 'session.yaml');
  results.session.pass = existsSync(sessionPath);
  results.total += 1;
  if (results.session.pass) results.passed += 1;

  // Check schemas (5 total: session, config, task, context, memory)
  const schemaFiles = [
    'session.schema.json', 'config.schema.json', 'task.schema.json',
    'context.schema.json', 'memory.schema.json',
  ];
  let schemaCount = 0;
  for (const file of schemaFiles) {
    if (existsSync(join(targetDir, 'chati.dev', 'schemas', file))) {
      schemaCount++;
    }
  }
  results.schemas.pass = schemaCount === 5;
  results.total += 1;
  if (results.schemas.pass) results.passed += 1;

  // Check workflows
  const workflowFiles = [
    'greenfield-fullstack.yaml', 'brownfield-fullstack.yaml',
    'brownfield-discovery.yaml', 'brownfield-service.yaml', 'brownfield-ui.yaml',
  ];
  let workflowCount = 0;
  for (const file of workflowFiles) {
    if (existsSync(join(targetDir, 'chati.dev', 'workflows', file))) {
      workflowCount++;
    }
  }
  results.workflows.pass = workflowCount === 5;
  results.total += 1;
  if (results.workflows.pass) results.passed += 1;

  // Check templates
  const templateFiles = [
    'prd-tmpl.yaml', 'brownfield-prd-tmpl.yaml',
    'fullstack-architecture-tmpl.yaml', 'task-tmpl.yaml', 'qa-gate-tmpl.yaml',
  ];
  let templateCount = 0;
  for (const file of templateFiles) {
    if (existsSync(join(targetDir, 'chati.dev', 'templates', file))) {
      templateCount++;
    }
  }
  results.templates.pass = templateCount === 5;
  results.total += 1;
  if (results.templates.pass) results.passed += 1;

  // Check intelligence files (6: 3 specs + 3 yaml)
  const intelligenceFiles = [
    'intelligence/context-engine.md',
    'intelligence/memory-layer.md',
    'intelligence/decision-engine.md',
    'intelligence/gotchas.yaml',
    'intelligence/patterns.yaml',
    'intelligence/confidence.yaml',
  ];
  let intelCount = 0;
  for (const file of intelligenceFiles) {
    if (existsSync(join(targetDir, 'chati.dev', file))) {
      intelCount++;
    }
  }
  results.intelligence.pass = intelCount === 6;
  results.intelligence.details.push({ found: intelCount, expected: 6 });
  results.total += 1;
  if (results.intelligence.pass) results.passed += 1;

  // Check entity registry
  const registryPath = join(targetDir, 'chati.dev', 'data', 'entity-registry.yaml');
  results.registry.pass = existsSync(registryPath);
  results.total += 1;
  if (results.registry.pass) results.passed += 1;

  // Check .chati/memories/ directory tree
  const memoriesPath = join(targetDir, '.chati', 'memories');
  const memoriesShared = join(memoriesPath, 'shared', 'durable');
  results.memories.pass = existsSync(memoriesPath) && existsSync(memoriesShared);
  results.total += 1;
  if (results.memories.pass) results.passed += 1;

  // Check context files (source in chati.dev/context/, deployed to .claude/rules/chati/)
  const contextFileNames = ['root.md', 'governance.md', 'protocols.md', 'quality.md'];
  let contextCount = 0;
  for (const file of contextFileNames) {
    // Check source (chati.dev/context/) OR deployed (.claude/rules/chati/)
    const inSource = existsSync(join(targetDir, 'chati.dev', 'context', file));
    const inRules = existsSync(join(targetDir, '.claude', 'rules', 'chati', file));
    if (inSource || inRules) {
      contextCount++;
    }
  }
  results.context.pass = contextCount === 4;
  results.context.details.push({ found: contextCount, expected: 4 });
  results.total += 1;
  if (results.context.pass) results.passed += 1;

  // Check integrity: verify installed files match manifest hashes
  const manifest = loadManifest(targetDir);
  if (manifest && manifest.files) {
    let matched = 0;
    let mismatched = 0;
    const mismatches = [];

    for (const [relPath, entry] of Object.entries(manifest.files)) {
      const absPath = join(targetDir, 'chati.dev', relPath);
      if (existsSync(absPath)) {
        const currentHash = hashFile(absPath);
        if (currentHash === entry.hash) {
          matched++;
        } else {
          mismatched++;
          mismatches.push(relPath);
        }
      }
    }

    results.integrity.pass = mismatched === 0;
    results.integrity.details.push({ matched, mismatched, mismatches });
  } else {
    // No manifest = skip integrity (first install or dev environment)
    results.integrity.pass = true;
    results.integrity.details.push({ skipped: true, reason: 'no-manifest' });
  }
  results.total += 1;
  if (results.integrity.pass) results.passed += 1;

  return results;
}
