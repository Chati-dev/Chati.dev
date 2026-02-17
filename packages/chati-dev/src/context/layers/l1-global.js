/**
 * L1 Global Layer — ALWAYS active.
 *
 * Loads global rules: coding standards, bracket-specific behavioral rules,
 * mode governance constraints (discover/plan → planning, build, deploy).
 */

import { loadGlobalDomain, extractRules } from '../domain-loader.js';

// Maps session states to governance modes for domain lookup
const STATE_TO_GOVERNANCE_MODE = {
  discover: 'planning',
  plan: 'planning',
  planning: 'planning',
  build: 'build',
  validate: 'build',
  deploy: 'deploy',
  completed: 'deploy',
};

/**
 * Process L1: load global rules + mode governance.
 * @param {object} ctx - Pipeline context
 * @param {string} ctx.domainsDir - Path to chati.dev/domains/
 * @param {string} ctx.mode - Current session state (discover, plan, build, deploy)
 * @param {string} ctx.bracket - Current bracket (FRESH, MODERATE, etc.)
 * @returns {{ layer: string, rules: Array, mode: string, modeRules: object }}
 */
export function processL1(ctx) {
  const domain = loadGlobalDomain(ctx.domainsDir);
  const rules = extractRules(domain);
  const sessionMode = ctx.mode || 'discover';
  const governanceMode = STATE_TO_GOVERNANCE_MODE[sessionMode] || 'planning';

  const modeRules = domain?.modes?.[governanceMode] || {};
  const bracketRules = domain?.brackets?.[ctx.bracket] || {};

  return {
    layer: 'L1',
    rules,
    mode: sessionMode,
    modeRules: {
      writeScope: modeRules.writeScope || 'chati.dev/',
      allowedActions: modeRules.allowedActions || [],
      blockedActions: modeRules.blockedActions || [],
    },
    bracketBehavior: bracketRules.behavior || 'normal',
  };
}
