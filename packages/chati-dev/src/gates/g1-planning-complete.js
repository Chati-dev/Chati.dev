/**
 * @fileoverview G1 — Plan Complete Gate
 *
 * Pre-BUILD gate that validates the PLAN phase is fully completed.
 * Checks that all required artifacts exist and QA-Planning has approved.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { GateBase } from './gate-base.js';
import { loadSession } from '../orchestrator/session-manager.js';
import { loadHandoff } from '../tasks/handoff.js';

const REQUIRED_ARTIFACTS = [
  { key: 'brief', dir: '1-Brief', label: 'Brief artifact' },
  { key: 'prd', dir: '2-PRD', label: 'PRD artifact' },
  { key: 'architecture', dir: '3-Architecture', label: 'Architecture artifact' },
  { key: 'ux', dir: '4-UX', label: 'UX artifact' },
  { key: 'phases', dir: '5-Phases', label: 'Phases artifact' },
  { key: 'tasks', dir: '6-Tasks', label: 'Tasks artifact' },
];

export class PlanningCompleteGate extends GateBase {
  constructor() {
    super({
      id: 'g1-planning-complete',
      name: 'Planning Complete',
      pipelinePoint: 'pre-build',
      agent: 'qa-planning',
    });
  }

  /**
   * Collect evidence by checking filesystem for PLAN artifacts.
   *
   * @param {string} projectDir
   * @returns {object} Evidence about artifact presence, session state, and handoff
   */
  _collectEvidence(projectDir) {
    const artifactsBase = join(projectDir, 'chati.dev', 'artifacts');
    const evidence = {
      artifacts: {},
      sessionState: null,
      qaPlanningHandoff: null,
    };

    // Check each required artifact directory
    for (const artifact of REQUIRED_ARTIFACTS) {
      const dirPath = join(artifactsBase, artifact.dir);
      const exists = existsSync(dirPath);
      let hasContent = false;

      if (exists) {
        try {
          const entries = readdirSync(dirPath);
          hasContent = entries.length > 0;
        } catch {
          hasContent = false;
        }
      }

      evidence.artifacts[artifact.key] = {
        exists,
        hasContent,
        label: artifact.label,
      };
    }

    // Check session state
    const sessionResult = loadSession(projectDir);
    if (sessionResult.loaded && sessionResult.session) {
      evidence.sessionState = {
        mode: sessionResult.session.mode,
        completedAgents: sessionResult.session.completed_agents || [],
        agents: sessionResult.session.agents || {},
      };
    }

    // Check QA-Planning handoff
    const handoffResult = loadHandoff(projectDir, 'qa-planning');
    if (handoffResult.loaded && handoffResult.handoff) {
      evidence.qaPlanningHandoff = {
        score: handoffResult.handoff.score,
        status: handoffResult.handoff.status,
        blockers: handoffResult.handoff.blockers || [],
      };
    }

    return evidence;
  }

  /**
   * Validate evidence and produce a score.
   *
   * @param {object} evidence
   * @returns {{ score: number, criteriaResults: string[], allCriteria: string[], warnings: string[] }}
   */
  _validateEvidence(evidence) {
    const allCriteria = [
      ...REQUIRED_ARTIFACTS.map(a => `${a.label} exists`),
      'QA-Planning handoff with passing score',
      'Session shows plan completed',
    ];

    const criteriaResults = [];
    const warnings = [];

    // Check artifacts
    for (const artifact of REQUIRED_ARTIFACTS) {
      const info = evidence.artifacts[artifact.key];
      if (info && info.exists && info.hasContent) {
        criteriaResults.push(`${artifact.label} exists`);
      } else if (info && info.exists) {
        warnings.push(`${artifact.label} directory exists but is empty`);
      }
    }

    // Check QA-Planning handoff score
    if (evidence.qaPlanningHandoff) {
      if (evidence.qaPlanningHandoff.score >= 95) {
        criteriaResults.push('QA-Planning handoff with passing score');
      } else {
        warnings.push(`QA-Planning score ${evidence.qaPlanningHandoff.score} below 95 threshold`);
      }

      if (evidence.qaPlanningHandoff.blockers.length > 0) {
        warnings.push(`${evidence.qaPlanningHandoff.blockers.length} blocker(s) from QA-Planning`);
      }
    }

    // Check session state
    if (evidence.sessionState) {
      const planAgents = ['brief', 'detail', 'architect', 'ux', 'phases', 'tasks', 'qa-planning'];
      const completed = planAgents.filter(a =>
        evidence.sessionState.completedAgents.includes(a)
      );

      if (completed.length === planAgents.length) {
        criteriaResults.push('Session shows plan completed');
      } else {
        const missing = planAgents.filter(a => !completed.includes(a));
        warnings.push(`Incomplete plan agents: ${missing.join(', ')}`);
      }
    }

    // Calculate score
    const score = allCriteria.length > 0
      ? Math.round((criteriaResults.length / allCriteria.length) * 100)
      : 0;

    return { score, criteriaResults, allCriteria, warnings };
  }
}
