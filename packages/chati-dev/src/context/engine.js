/**
 * PRISM Context Engine — 5-layer context injection pipeline.
 *
 * Orchestrates L0-L4 layers, respects bracket constraints,
 * and produces formatted XML context for agent prompts.
 *
 * Pipeline: bracket calculation → layer processing → formatting → output
 */

import { calculateBracket, isLayerActive } from './bracket-tracker.js';
import { processL0 } from './layers/l0-constitution.js';
import { processL1 } from './layers/l1-global.js';
import { processL2 } from './layers/l2-agent.js';
import { processL3 } from './layers/l3-workflow.js';
import { processL4 } from './layers/l4-task.js';
import { formatContext } from './formatter.js';

const LAYER_TIMEOUT_MS = 100;

/**
 * Run the PRISM context engine pipeline.
 *
 * @param {object} input
 * @param {string} input.domainsDir - Path to chati.dev/domains/
 * @param {number} input.remainingPercent - Context window remaining (0-100)
 * @param {string} [input.mode] - Current mode (planning, build, deploy)
 * @param {string} [input.agent] - Active agent name
 * @param {string} [input.workflow] - Active workflow name
 * @param {string} [input.pipelinePosition] - Current pipeline step
 * @param {string} [input.taskId] - Active task ID
 * @param {object} [input.handoff] - Handoff data from previous agent
 * @param {string[]} [input.artifacts] - Relevant artifact paths
 * @param {string[]} [input.taskCriteria] - Active task criteria
 * @returns {{ xml: string, bracket: object, layers: object[], errors: string[] }}
 */
export function runPrism(input) {
  const errors = [];
  const layers = [];

  // 1. Calculate bracket
  const bracket = calculateBracket(input.remainingPercent);

  // 2. Build context for layer processors
  const ctx = {
    domainsDir: input.domainsDir,
    mode: input.mode || 'discover',
    bracket: bracket.bracket,
    agent: input.agent || null,
    workflow: input.workflow || null,
    pipelinePosition: input.pipelinePosition || null,
    taskId: input.taskId || null,
    handoff: input.handoff || {},
    artifacts: input.artifacts || [],
    taskCriteria: input.taskCriteria || [],
  };

  // 3. Process each active layer with timeout protection
  const layerResults = {};

  // L0 — Always active
  const l0 = safeProcess('L0', () => processL0(ctx), errors);
  if (l0) { layers.push(l0); layerResults.l0 = l0; }

  // L1 — Always active
  if (isLayerActive(bracket.bracket, 'L1')) {
    const l1 = safeProcess('L1', () => processL1(ctx), errors);
    if (l1) { layers.push(l1); layerResults.l1 = l1; }
  }

  // L2 — Agent layer
  if (isLayerActive(bracket.bracket, 'L2') && ctx.agent) {
    const l2 = safeProcess('L2', () => processL2(ctx), errors);
    if (l2) { layers.push(l2); layerResults.l2 = l2; }
  }

  // L3 — Workflow/Pipeline layer
  if (isLayerActive(bracket.bracket, 'L3') && ctx.workflow) {
    const l3 = safeProcess('L3', () => processL3(ctx), errors);
    if (l3) { layers.push(l3); layerResults.l3 = l3; }
  }

  // L4 — Task layer
  if (isLayerActive(bracket.bracket, 'L4') && ctx.taskId) {
    const l4 = safeProcess('L4', () => processL4(ctx), errors);
    if (l4) { layers.push(l4); layerResults.l4 = l4; }
  }

  // 4. Format output
  const xml = formatContext({
    bracket: bracket.bracket,
    tokenBudget: bracket.tokenBudget,
    ...layerResults,
  });

  return {
    xml,
    bracket,
    layers,
    errors,
    layerCount: layers.length,
  };
}

/**
 * Run a layer processor with error protection.
 * If the processor throws, capture the error and return null (graceful degradation).
 */
function safeProcess(layerName, processFn, errors) {
  try {
    const start = Date.now();
    const result = processFn();
    const elapsed = Date.now() - start;

    if (elapsed > LAYER_TIMEOUT_MS) {
      errors.push(`${layerName} exceeded timeout (${elapsed}ms > ${LAYER_TIMEOUT_MS}ms)`);
    }

    return result;
  } catch (err) {
    errors.push(`${layerName} failed: ${err.message}`);
    return null;
  }
}

/**
 * Get a summary of PRISM capabilities for display.
 * @returns {{ layers: number, brackets: string[], features: string[] }}
 */
export function getPrismInfo() {
  return {
    name: 'PRISM',
    version: '1.0.0',
    layers: 5,
    layerNames: ['L0 Constitution', 'L1 Global', 'L2 Agent', 'L3 Workflow', 'L4 Task'],
    brackets: ['FRESH', 'MODERATE', 'DEPLETED', 'CRITICAL'],
    features: [
      'Priority-based context truncation',
      'Per-layer timeout protection',
      'Graceful degradation on layer failure',
      'XML structured output',
      'Bracket-aware layer activation',
    ],
  };
}
