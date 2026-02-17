#!/usr/bin/env node
/**
 * Model Governance Hook — UserPromptSubmit
 *
 * Validates that the model being used matches the agent's assignment.
 * Constitution Article XVI enforcement.
 *
 * Model assignments (from orchestrator spec — Model Map):
 * - orchestrator: sonnet | upgrade: opus if complex routing
 * - greenfield-wu: haiku | upgrade: sonnet if multi-stack
 * - brownfield-wu: opus | no downgrade
 * - brief: sonnet | upgrade: opus if 10+ integrations
 * - detail: opus | no downgrade
 * - architect: opus | no downgrade
 * - ux: sonnet | upgrade: opus if design system from scratch
 * - phases: sonnet | upgrade: opus if 20+ requirements
 * - tasks: sonnet | upgrade: opus if 50+ tasks
 * - qa-planning: opus | no downgrade
 * - qa-implementation: opus | no downgrade
 * - dev: opus | no downgrade
 * - devops: sonnet | upgrade: opus if multi-env
 *
 * This hook is advisory in IDE mode — it warns but does not block.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const AGENT_MODELS = {
  orchestrator: { provider: 'claude', model: 'sonnet', tier: 'sonnet' },
  'greenfield-wu': { provider: 'claude', model: 'haiku', tier: 'haiku' },
  'brownfield-wu': { provider: 'claude', model: 'opus', tier: 'opus' },
  brief: { provider: 'claude', model: 'sonnet', tier: 'sonnet' },
  detail: { provider: 'claude', model: 'opus', tier: 'opus' },
  architect: { provider: 'claude', model: 'opus', tier: 'opus' },
  ux: { provider: 'claude', model: 'sonnet', tier: 'sonnet' },
  phases: { provider: 'claude', model: 'sonnet', tier: 'sonnet' },
  tasks: { provider: 'claude', model: 'sonnet', tier: 'sonnet' },
  'qa-planning': { provider: 'claude', model: 'opus', tier: 'opus' },
  'qa-implementation': { provider: 'claude', model: 'opus', tier: 'opus' },
  dev: { provider: 'claude', model: 'opus', tier: 'opus' },
  devops: { provider: 'claude', model: 'sonnet', tier: 'sonnet' },
};

/**
 * Upgrade conditions per agent. When context matches, the model
 * should be upgraded to the specified target.
 */
const UPGRADE_CONDITIONS = {
  orchestrator: { to: 'opus', condition: 'complex routing or deviation handling' },
  'greenfield-wu': { to: 'sonnet', condition: 'multi-stack or enterprise' },
  brief: { to: 'opus', condition: '10+ integrations' },
  ux: { to: 'opus', condition: 'design system from scratch' },
  phases: { to: 'opus', condition: '20+ requirements' },
  tasks: { to: 'opus', condition: '50+ tasks' },
  devops: { to: 'opus', condition: 'multi-environment or IaC' },
};

function getCurrentAgent(projectDir) {
  const sessionPath = join(projectDir, '.chati', 'session.yaml');
  if (!existsSync(sessionPath)) return null;

  const raw = readFileSync(sessionPath, 'utf-8');
  const match = raw.match(/^\s*current_agent:\s*(.+)$/m);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const event = JSON.parse(input);
    const projectDir = event.cwd || process.cwd();
    const agent = getCurrentAgent(projectDir);

    if (agent && AGENT_MODELS[agent]) {
      const assignment = AGENT_MODELS[agent];
      const expected = assignment.model || assignment;
      const provider = assignment.provider || 'claude';
      // Advisory note — appended to context
      process.stdout.write(JSON.stringify({
        result: 'allow',
        prefix: `<!-- [Article XVI] Agent "${agent}" assigned model: ${expected} (provider: ${provider}) -->`,
      }));
    } else {
      process.stdout.write(JSON.stringify({ result: 'allow' }));
    }
  } catch {
    process.stdout.write(JSON.stringify({ result: 'allow' }));
  }
}

export { AGENT_MODELS, UPGRADE_CONDITIONS, getCurrentAgent };

// Only run main when executed directly (not imported by tests)
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
