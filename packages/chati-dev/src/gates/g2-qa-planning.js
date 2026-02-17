/**
 * @fileoverview G2 — QA Planning Gate
 *
 * Post-QA-Planning gate that validates the test strategy and
 * quality plan are properly defined before BUILD begins.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { GateBase, determineVerdict } from './gate-base.js';
import { loadSession } from '../orchestrator/session-manager.js';
import { loadHandoff } from '../tasks/handoff.js';

export class QAPlanningGate extends GateBase {
  constructor() {
    super({
      id: 'g2-qa-planning',
      name: 'QA Planning',
      pipelinePoint: 'post-qa-planning',
      agent: 'qa-planning',
    });
  }

  /**
   * Collect evidence about QA planning artifacts.
   *
   * @param {string} projectDir
   * @returns {object} Evidence about test strategy, coverage plan, risk assessment
   */
  _collectEvidence(projectDir) {
    const artifactsBase = join(projectDir, 'chati.dev', 'artifacts');
    const evidence = {
      testStrategy: false,
      coveragePlan: false,
      riskAssessment: false,
      qaPlanningHandoff: null,
      sessionState: null,
    };

    // Check for QA-Planning artifacts (may be in a qa-planning folder or 7-QA-Planning)
    const qaDirs = ['7-QA-Planning', 'qa-planning'];
    for (const dir of qaDirs) {
      const qaPath = join(artifactsBase, dir);
      if (existsSync(qaPath)) {
        try {
          const entries = readdirSync(qaPath);
          for (const entry of entries) {
            const lower = entry.toLowerCase();
            if (lower.includes('strategy') || lower.includes('test-plan')) {
              evidence.testStrategy = true;
            }
            if (lower.includes('coverage')) {
              evidence.coveragePlan = true;
            }
            if (lower.includes('risk')) {
              evidence.riskAssessment = true;
            }
          }
        } catch {
          // Directory read failed, leave as false
        }
      }
    }

    // Load QA-Planning handoff
    const handoffResult = loadHandoff(projectDir, 'qa-planning');
    if (handoffResult.loaded && handoffResult.handoff) {
      evidence.qaPlanningHandoff = {
        score: handoffResult.handoff.score,
        status: handoffResult.handoff.status,
        outputs: handoffResult.handoff.outputs || [],
        criteriaUnmet: handoffResult.handoff.criteria_unmet || [],
      };

      // Handoff outputs may indicate strategy/coverage/risk exist
      for (const output of evidence.qaPlanningHandoff.outputs) {
        const lower = (typeof output === 'string' ? output : '').toLowerCase();
        if (lower.includes('strategy') || lower.includes('test-plan')) {
          evidence.testStrategy = true;
        }
        if (lower.includes('coverage')) {
          evidence.coveragePlan = true;
        }
        if (lower.includes('risk')) {
          evidence.riskAssessment = true;
        }
      }
    }

    // Load session state
    const sessionResult = loadSession(projectDir);
    if (sessionResult.loaded && sessionResult.session) {
      evidence.sessionState = {
        qaPlanningAgent: sessionResult.session.agents?.['qa-planning'] || null,
        completedAgents: sessionResult.session.completed_agents || [],
      };
    }

    return evidence;
  }

  /**
   * Validate QA planning evidence.
   *
   * @param {object} evidence
   * @returns {{ score: number, criteriaResults: string[], allCriteria: string[], warnings: string[] }}
   */
  _validateEvidence(evidence) {
    const allCriteria = [
      'Test strategy document exists',
      'Coverage plan exists',
      'Risk assessment documented',
      'QA-Planning handoff with score >= 95',
      'All QA-Planning criteria met',
    ];

    const criteriaResults = [];
    const warnings = [];

    if (evidence.testStrategy) {
      criteriaResults.push('Test strategy document exists');
    }

    if (evidence.coveragePlan) {
      criteriaResults.push('Coverage plan exists');
    }

    if (evidence.riskAssessment) {
      criteriaResults.push('Risk assessment documented');
    }

    // Check handoff score
    if (evidence.qaPlanningHandoff) {
      if (evidence.qaPlanningHandoff.score >= 95) {
        criteriaResults.push('QA-Planning handoff with score >= 95');
      } else {
        warnings.push(`QA-Planning score: ${evidence.qaPlanningHandoff.score} (need >= 95)`);
      }

      if (evidence.qaPlanningHandoff.criteriaUnmet.length === 0) {
        criteriaResults.push('All QA-Planning criteria met');
      } else {
        warnings.push(`${evidence.qaPlanningHandoff.criteriaUnmet.length} unmet criteria`);
      }
    }

    const score = allCriteria.length > 0
      ? Math.round((criteriaResults.length / allCriteria.length) * 100)
      : 0;

    const verdict = determineVerdict(score, 95);

    return { score, criteriaResults, allCriteria, warnings, verdict };
  }
}
