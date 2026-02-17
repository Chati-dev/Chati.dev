/**
 * @fileoverview GateBase — Template Method pattern base class for quality gates.
 *
 * Provides the abstract skeleton for all pipeline quality gates.
 * Subclasses implement _collectEvidence() and _validateEvidence()
 * while this base class handles evaluation orchestration.
 */

import { evaluateGate, getGateThreshold, resolveGateAction } from '../autonomy/autonomous-gate.js';

/**
 * Gate verdict constants (v3.0.0).
 * APPROVED: Score >= threshold — proceed to next pipeline stage.
 * NEEDS_REVISION: Score within 5 points below threshold — return to agent for fixes.
 * BLOCKED: Score significantly below threshold or critical blocker — halt pipeline.
 */
export const GateVerdict = {
  APPROVED: 'approved',
  NEEDS_REVISION: 'needs_revision',
  BLOCKED: 'blocked',
};

/**
 * Determine the gate verdict from a score and threshold.
 *
 * @param {number} score - Gate evaluation score (0-100)
 * @param {number} threshold - Minimum score to pass
 * @param {boolean} [hasCriticalBlocker=false] - Whether a critical blocker exists
 * @returns {string} One of GateVerdict values
 */
export function determineVerdict(score, threshold, hasCriticalBlocker = false) {
  if (hasCriticalBlocker) return GateVerdict.BLOCKED;
  if (score >= threshold) return GateVerdict.APPROVED;
  if (score >= threshold - 5) return GateVerdict.NEEDS_REVISION;
  return GateVerdict.BLOCKED;
}

/**
 * Abstract base class for quality gates.
 *
 * Uses the Template Method pattern: evaluate() is the template that
 * calls _collectEvidence() and _validateEvidence() which subclasses implement.
 */
export class GateBase {
  /**
   * @param {object} config
   * @param {string} config.id - Unique gate identifier (e.g. 'g1-planning-complete')
   * @param {string} config.name - Human-readable gate name
   * @param {string} config.pipelinePoint - Pipeline point this gate guards
   * @param {string} config.agent - Agent whose output this gate evaluates
   */
  constructor(config) {
    if (new.target === GateBase) {
      throw new Error('GateBase is abstract and cannot be instantiated directly.');
    }

    const { id, name, pipelinePoint, agent } = config;

    if (!id || !name || !pipelinePoint || !agent) {
      throw new Error('GateBase requires id, name, pipelinePoint, and agent in config.');
    }

    this.id = id;
    this.name = name;
    this.pipelinePoint = pipelinePoint;
    this.agent = agent;
  }

  /**
   * Evaluate the quality gate.
   *
   * Template Method: collects evidence, validates it, then either runs
   * autonomous evaluation or returns recommendation for human review.
   *
   * @param {string} projectDir - Project root directory
   * @param {string} [mode='autonomous'] - 'autonomous' or 'human-in-the-loop'
   * @returns {object} GateResult: { result, score, evidence, recommendation, canProceed }
   */
  evaluate(projectDir, mode = 'autonomous') {
    // Step 1: Collect evidence (subclass implements)
    const evidence = this._collectEvidence(projectDir);

    // Step 2: Validate evidence (subclass implements)
    const validation = this._validateEvidence(evidence);

    const { score, criteriaResults, allCriteria, warnings = [] } = validation;

    if (mode === 'autonomous') {
      // Step 3a: Autonomous evaluation via autonomous-gate module
      const gateResult = evaluateGate({
        agent: this.agent,
        score,
        criteriaResults,
        allCriteria,
        warnings,
      });

      const action = resolveGateAction(gateResult.result, mode);

      const threshold = getGateThreshold(this.agent);
      const hasCriticalBlocker = warnings.some(w => w.toLowerCase().includes('critical'));
      const verdict = determineVerdict(gateResult.score, threshold, hasCriticalBlocker);

      return {
        gateId: this.id,
        gateName: this.name,
        result: gateResult.result,
        verdict,
        score: gateResult.score,
        evidence,
        recommendation: action.action,
        canProceed: verdict === GateVerdict.APPROVED,
        details: gateResult.details,
        warnings,
      };
    }

    // Step 3b: Human-in-the-loop — return evidence + recommendation
    const threshold = getGateThreshold(this.agent);
    const recommendation = score >= threshold
      ? 'Recommend approval — criteria met.'
      : `Recommend review — score ${score} below threshold ${threshold}.`;

    return {
      gateId: this.id,
      gateName: this.name,
      result: 'review',
      score,
      evidence,
      recommendation,
      canProceed: false, // Human must explicitly approve
      details: {
        criteriaResults,
        allCriteria,
        threshold,
      },
      warnings,
    };
  }

  /**
   * Collect evidence from the project filesystem.
   * ABSTRACT — subclass MUST implement.
   *
   * @param {string} _projectDir
   * @returns {object} Evidence data
   */
  _collectEvidence(_projectDir) {
    throw new Error(`${this.constructor.name} must implement _collectEvidence()`);
  }

  /**
   * Validate collected evidence and produce a score.
   * ABSTRACT — subclass MUST implement.
   *
   * @param {object} _evidence
   * @returns {{ score: number, criteriaResults: string[], allCriteria: string[], warnings: string[] }}
   */
  _validateEvidence(_evidence) {
    throw new Error(`${this.constructor.name} must implement _validateEvidence()`);
  }

  /**
   * Get gate metadata.
   *
   * @returns {{ id: string, name: string, pipelinePoint: string, threshold: number }}
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      pipelinePoint: this.pipelinePoint,
      threshold: getGateThreshold(this.agent),
    };
  }
}
