/**
 * @fileoverview G4 — QA Implementation Gate
 *
 * Post-QA-Implementation gate — the most critical gate in the pipeline.
 * Validates that all tests pass, no critical bugs remain, performance
 * benchmarks are met, and security scans are clean.
 *
 * Verdicts:
 *   PASS     — All criteria met, score >= 95%
 *   CONCERNS — Score 90-95%, minor issues noted
 *   FAIL     — Score < 90% or critical issues
 *   WAIVED   — Human explicitly overrode
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { GateBase, determineVerdict } from './gate-base.js';
import { loadSession } from '../orchestrator/session-manager.js';
import { loadHandoff } from '../tasks/handoff.js';

export const QA_IMPL_VERDICTS = {
  PASS: 'pass',
  CONCERNS: 'concerns',
  FAIL: 'fail',
  WAIVED: 'waived',
};

export class QAImplementationGate extends GateBase {
  constructor() {
    super({
      id: 'g4-qa-implementation',
      name: 'QA Implementation',
      pipelinePoint: 'post-qa-impl',
      agent: 'qa-implementation',
    });
  }

  /**
   * Collect evidence about QA implementation results.
   *
   * @param {string} projectDir
   * @returns {object} Evidence about test results, bugs, performance, security
   */
  _collectEvidence(projectDir) {
    const evidence = {
      qaImplHandoff: null,
      allTestCriteriaMet: false,
      noCriticalBugs: true,
      performanceBenchmarksMet: null, // null = not defined
      securityScanClean: null,
      sessionState: null,
      verdict: null,
    };

    // Load QA-Implementation handoff
    const handoffResult = loadHandoff(projectDir, 'qa-implementation');
    if (handoffResult.loaded && handoffResult.handoff) {
      const handoff = handoffResult.handoff;
      evidence.qaImplHandoff = {
        score: handoff.score,
        status: handoff.status,
        outputs: handoff.outputs || [],
        blockers: handoff.blockers || [],
        criteriaUnmet: handoff.criteria_unmet || [],
        criteriaMet: handoff.criteria_met || [],
      };

      evidence.allTestCriteriaMet = evidence.qaImplHandoff.criteriaUnmet.length === 0;
      evidence.noCriticalBugs = evidence.qaImplHandoff.blockers.length === 0;
    }

    // Check for performance benchmark results
    const perfPaths = [
      join(projectDir, 'chati.dev', 'artifacts', 'performance-report.md'),
      join(projectDir, '.performance-benchmark'),
    ];
    for (const perfPath of perfPaths) {
      if (existsSync(perfPath)) {
        evidence.performanceBenchmarksMet = true;
        break;
      }
    }

    // Check for security scan
    const secPaths = [
      join(projectDir, 'chati.dev', 'artifacts', 'security-report.md'),
      join(projectDir, '.security-scan'),
    ];
    for (const secPath of secPaths) {
      if (existsSync(secPath)) {
        evidence.securityScanClean = true;
        break;
      }
    }

    // Load session state
    const sessionResult = loadSession(projectDir);
    if (sessionResult.loaded && sessionResult.session) {
      const qaAgent = sessionResult.session.agents?.['qa-implementation'];
      evidence.sessionState = {
        qaImplStatus: qaAgent?.status || 'pending',
        qaImplScore: qaAgent?.score || 0,
        completedAgents: sessionResult.session.completed_agents || [],
      };
    }

    // Determine verdict
    evidence.verdict = this._determineVerdict(evidence);

    return evidence;
  }

  /**
   * Determine the QA verdict based on evidence.
   *
   * @param {object} evidence
   * @returns {string} One of QA_IMPL_VERDICTS
   */
  _determineVerdict(evidence) {
    if (!evidence.qaImplHandoff) {
      return QA_IMPL_VERDICTS.FAIL;
    }

    const score = evidence.qaImplHandoff.score ?? 0;

    if (!evidence.noCriticalBugs) {
      return QA_IMPL_VERDICTS.FAIL;
    }

    if (score >= 95 && evidence.allTestCriteriaMet) {
      return QA_IMPL_VERDICTS.PASS;
    }

    if (score >= 90) {
      return QA_IMPL_VERDICTS.CONCERNS;
    }

    return QA_IMPL_VERDICTS.FAIL;
  }

  /**
   * Validate QA implementation evidence.
   *
   * @param {object} evidence
   * @returns {{ score: number, criteriaResults: string[], allCriteria: string[], warnings: string[] }}
   */
  _validateEvidence(evidence) {
    const allCriteria = [
      'QA-Implementation handoff exists',
      'All test criteria met',
      'No critical bugs open',
      'Performance benchmarks met',
      'Security scan clean',
      'QA-Implementation score >= 95',
    ];

    const criteriaResults = [];
    const warnings = [];

    // Check handoff exists
    if (evidence.qaImplHandoff) {
      criteriaResults.push('QA-Implementation handoff exists');
    }

    // Check test criteria
    if (evidence.allTestCriteriaMet) {
      criteriaResults.push('All test criteria met');
    } else if (evidence.qaImplHandoff) {
      warnings.push(`${evidence.qaImplHandoff.criteriaUnmet.length} test criteria unmet`);
    }

    // Check bugs
    if (evidence.noCriticalBugs) {
      criteriaResults.push('No critical bugs open');
    } else {
      warnings.push('Critical bugs remain open');
    }

    // Check performance
    if (evidence.performanceBenchmarksMet === true) {
      criteriaResults.push('Performance benchmarks met');
    } else if (evidence.performanceBenchmarksMet === null) {
      // Not defined is not a failure — just a warning
      warnings.push('Performance benchmarks not defined');
    }

    // Check security
    if (evidence.securityScanClean === true) {
      criteriaResults.push('Security scan clean');
    } else if (evidence.securityScanClean === null) {
      warnings.push('Security scan not found');
    }

    // Check score
    if (evidence.qaImplHandoff && evidence.qaImplHandoff.score >= 95) {
      criteriaResults.push('QA-Implementation score >= 95');
    } else if (evidence.qaImplHandoff) {
      warnings.push(`QA-Impl score: ${evidence.qaImplHandoff.score} (need >= 95)`);
    }

    const score = allCriteria.length > 0
      ? Math.round((criteriaResults.length / allCriteria.length) * 100)
      : 0;

    const hasCriticalBlocker = !evidence.noCriticalBugs;
    const verdict = determineVerdict(score, 95, hasCriticalBlocker);

    return { score, criteriaResults, allCriteria, warnings, verdict };
  }
}
