/**
 * @fileoverview Tests for quality gates module
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { GateBase } from '../../src/gates/gate-base.js';
import { CircuitBreaker, CIRCUIT_STATES } from '../../src/gates/circuit-breaker.js';
import { PlanningCompleteGate } from '../../src/gates/g1-planning-complete.js';
import { QAPlanningGate } from '../../src/gates/g2-qa-planning.js';
import { ImplementationGate } from '../../src/gates/g3-implementation.js';
import { QAImplementationGate, QA_IMPL_VERDICTS } from '../../src/gates/g4-qa-implementation.js';
import { DeployReadyGate } from '../../src/gates/g5-deploy-ready.js';
import { getGateForPipelinePoint } from '../../src/gates/index.js';
import { initSession, updateSession } from '../../src/orchestrator/session-manager.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTempDir() {
  return mkdtempSync(join(tmpdir(), 'chati-gates-test-'));
}

function setupProjectDir(tempDir, options = {}) {
  // Init session
  initSession(tempDir, {
    mode: options.mode || 'discover',
    isGreenfield: true,
    language: 'en',
  });

  // Create artifact dirs if requested
  if (options.artifacts) {
    const artifactsBase = join(tempDir, 'chati.dev', 'artifacts');
    mkdirSync(artifactsBase, { recursive: true });

    for (const dir of options.artifacts) {
      const dirPath = join(artifactsBase, dir);
      mkdirSync(dirPath, { recursive: true });
      // Place a dummy file so the dir is not empty
      writeFileSync(join(dirPath, 'artifact.md'), '# Artifact\nContent here.');
    }
  }

  // Create handoffs if requested
  if (options.handoffs) {
    const handoffsDir = join(tempDir, 'chati.dev', 'artifacts', 'handoffs');
    mkdirSync(handoffsDir, { recursive: true });

    for (const [agent, handoffData] of Object.entries(options.handoffs)) {
      const timestamp = new Date().toISOString();
      const status = handoffData.status || 'complete';
      const score = handoffData.score ?? 95;
      const outputs = handoffData.outputs || [];
      const blockers = handoffData.blockers || [];
      const criteriaMet = handoffData.criteria_met || ['c1', 'c2'];
      const criteriaUnmet = handoffData.criteria_unmet || [];

      const lines = [
        '---',
        `from_agent: ${agent}`,
        `from_task: ${agent}-task`,
        'from_phase: plan',
        'to: orchestrator',
        `timestamp: ${timestamp}`,
        `status: ${status}`,
        `score: ${score}`,
        '---',
        '',
        `# Handoff: ${agent}`,
        '',
        '## Summary',
        `${agent} handoff.`,
        '',
      ];

      if (outputs.length > 0) {
        lines.push('## Outputs');
        for (const o of outputs) {
          lines.push(`- ${o}`);
        }
        lines.push('');
      }
      if (blockers.length > 0) {
        lines.push('## Blockers');
        for (const b of blockers) {
          lines.push(`- ${b}`);
        }
        lines.push('');
      }
      if (criteriaMet.length > 0) {
        lines.push('## Criteria Met');
        for (const c of criteriaMet) {
          lines.push(`- [x] ${c}`);
        }
        lines.push('');
      }
      if (criteriaUnmet.length > 0) {
        lines.push('## Criteria Unmet');
        for (const c of criteriaUnmet) {
          lines.push(`- [ ] ${c}`);
        }
        lines.push('');
      }

      writeFileSync(
        join(handoffsDir, `${agent}-handoff.md`),
        lines.join('\n'),
        'utf-8'
      );
    }
  }

  // Create extra files if requested
  if (options.extraFiles) {
    for (const [relPath, content] of Object.entries(options.extraFiles)) {
      const absPath = join(tempDir, relPath);
      mkdirSync(join(absPath, '..'), { recursive: true });
      writeFileSync(absPath, content, 'utf-8');
    }
  }

  return tempDir;
}

// ---------------------------------------------------------------------------
// Test: GateBase
// ---------------------------------------------------------------------------

describe('quality-gates', () => {
  describe('GateBase', () => {
    it('should throw when instantiated directly', () => {
      assert.throws(
        () => new GateBase({ id: 'x', name: 'X', pipelinePoint: 'y', agent: 'z' }),
        /GateBase is abstract/
      );
    });

    it('should throw when config is incomplete', () => {
      class TestGate extends GateBase {
        _collectEvidence() { return {}; }
        _validateEvidence() { return { score: 100, criteriaResults: [], allCriteria: [], warnings: [] }; }
      }

      assert.throws(
        () => new TestGate({ id: 'x', name: 'X' }),
        /GateBase requires/
      );
    });

    it('should throw when abstract methods are not implemented', () => {
      class EmptyGate extends GateBase {
        constructor() {
          super({ id: 'empty', name: 'Empty', pipelinePoint: 'test', agent: 'test' });
        }
      }

      const gate = new EmptyGate();
      assert.throws(() => gate._collectEvidence('/tmp'), /must implement _collectEvidence/);
      assert.throws(() => gate._validateEvidence({}), /must implement _validateEvidence/);
    });

    it('should evaluate in autonomous mode', () => {
      class PassGate extends GateBase {
        constructor() {
          super({ id: 'pass', name: 'Pass Gate', pipelinePoint: 'test', agent: 'dev' });
        }
        _collectEvidence() { return { checked: true }; }
        _validateEvidence() {
          return {
            score: 95,
            criteriaResults: ['c1', 'c2', 'c3'],
            allCriteria: ['c1', 'c2', 'c3'],
            warnings: [],
          };
        }
      }

      const gate = new PassGate();
      const result = gate.evaluate('/tmp/nonexistent', 'autonomous');

      assert.equal(result.gateId, 'pass');
      assert.equal(result.gateName, 'Pass Gate');
      assert.equal(result.result, 'pass');
      assert.ok(result.canProceed);
      assert.ok(result.score >= 90);
    });

    it('should evaluate in human-in-the-loop mode', () => {
      class HumanGate extends GateBase {
        constructor() {
          super({ id: 'human', name: 'Human Gate', pipelinePoint: 'test', agent: 'dev' });
        }
        _collectEvidence() { return { data: 'present' }; }
        _validateEvidence() {
          return {
            score: 95,
            criteriaResults: ['c1'],
            allCriteria: ['c1'],
            warnings: [],
          };
        }
      }

      const gate = new HumanGate();
      const result = gate.evaluate('/tmp/nonexistent', 'human-in-the-loop');

      assert.equal(result.result, 'review');
      assert.equal(result.canProceed, false);
      assert.ok(result.recommendation);
    });

    it('should return gate info', () => {
      class InfoGate extends GateBase {
        constructor() {
          super({ id: 'info', name: 'Info Gate', pipelinePoint: 'pre-build', agent: 'qa-planning' });
        }
        _collectEvidence() { return {}; }
        _validateEvidence() { return { score: 0, criteriaResults: [], allCriteria: [], warnings: [] }; }
      }

      const gate = new InfoGate();
      const info = gate.getInfo();

      assert.equal(info.id, 'info');
      assert.equal(info.name, 'Info Gate');
      assert.equal(info.pipelinePoint, 'pre-build');
      assert.equal(info.threshold, 95); // qa-planning threshold
    });
  });

  // ---------------------------------------------------------------------------
  // Test: CircuitBreaker
  // ---------------------------------------------------------------------------

  describe('CircuitBreaker', () => {
    it('should start in CLOSED state', () => {
      const cb = new CircuitBreaker();
      assert.equal(cb.getState(), CIRCUIT_STATES.CLOSED);
    });

    it('should execute normally when CLOSED', () => {
      const cb = new CircuitBreaker();
      const result = cb.execute(() => 42);
      assert.equal(result, 42);
    });

    it('should track successes', () => {
      const cb = new CircuitBreaker();
      cb.execute(() => 'ok');
      cb.execute(() => 'ok');

      const stats = cb.getStats();
      assert.equal(stats.successes, 2);
      assert.equal(stats.failures, 0);
    });

    it('should increment failure count on errors', () => {
      const cb = new CircuitBreaker({ failureThreshold: 5 });

      assert.throws(() => cb.execute(() => { throw new Error('fail'); }));
      assert.throws(() => cb.execute(() => { throw new Error('fail'); }));

      const stats = cb.getStats();
      assert.equal(stats.failures, 2);
      assert.equal(cb.getState(), CIRCUIT_STATES.CLOSED);
    });

    it('should open after reaching failure threshold', () => {
      const cb = new CircuitBreaker({ failureThreshold: 3 });

      for (let i = 0; i < 3; i++) {
        assert.throws(() => cb.execute(() => { throw new Error('fail'); }));
      }

      assert.equal(cb.getState(), CIRCUIT_STATES.OPEN);
    });

    it('should reject immediately when OPEN', () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 60000 });

      assert.throws(() => cb.execute(() => { throw new Error('fail'); }));
      assert.equal(cb.getState(), CIRCUIT_STATES.OPEN);

      assert.throws(
        () => cb.execute(() => 'should not run'),
        /Circuit breaker is OPEN/
      );
    });

    it('should transition to HALF_OPEN after timeout', () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1 });

      assert.throws(() => cb.execute(() => { throw new Error('fail'); }));
      assert.equal(cb.getState(), CIRCUIT_STATES.OPEN);

      // Wait just a bit for the 1ms timeout to elapse
      const start = Date.now();
      while (Date.now() - start < 5) { /* spin */ }

      // Next execute should transition to HALF_OPEN then succeed
      const result = cb.execute(() => 'recovered');
      assert.equal(result, 'recovered');
      assert.equal(cb.getState(), CIRCUIT_STATES.CLOSED);
    });

    it('should return to OPEN from HALF_OPEN on failure', () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1 });

      assert.throws(() => cb.execute(() => { throw new Error('fail'); }));

      const start = Date.now();
      while (Date.now() - start < 5) { /* spin */ }

      assert.throws(() => cb.execute(() => { throw new Error('still broken'); }));
      assert.equal(cb.getState(), CIRCUIT_STATES.OPEN);
    });

    it('should reset to CLOSED manually', () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });

      assert.throws(() => cb.execute(() => { throw new Error('fail'); }));
      assert.equal(cb.getState(), CIRCUIT_STATES.OPEN);

      cb.reset();
      assert.equal(cb.getState(), CIRCUIT_STATES.CLOSED);
      assert.equal(cb.getStats().failures, 0);
    });

    it('should report complete stats', () => {
      const cb = new CircuitBreaker();
      cb.execute(() => 'ok');

      const stats = cb.getStats();
      assert.equal(stats.state, CIRCUIT_STATES.CLOSED);
      assert.equal(stats.successes, 1);
      assert.equal(stats.failures, 0);
      assert.ok(stats.lastSuccess !== null);
      assert.equal(stats.lastFailure, null);
    });
  });

  // ---------------------------------------------------------------------------
  // Test: PlanningCompleteGate (G1)
  // ---------------------------------------------------------------------------

  describe('PlanningCompleteGate', () => {
    it('should PASS with all artifacts present and QA-Planning approved', () => {
      const dir = createTempDir();
      setupProjectDir(dir, {
        artifacts: ['1-Brief', '2-PRD', '3-Architecture', '4-UX', '5-Phases', '6-Tasks'],
        handoffs: {
          'qa-planning': { score: 96, status: 'complete' },
        },
      });

      // Update session to mark planning agents complete
      updateSession(dir, {
        completed_agents: ['brief', 'detail', 'architect', 'ux', 'phases', 'tasks', 'qa-planning'],
        agents: {
          brief: { status: 'completed', score: 95 },
          detail: { status: 'completed', score: 90 },
          architect: { status: 'completed', score: 92 },
          ux: { status: 'completed', score: 91 },
          phases: { status: 'completed', score: 93 },
          tasks: { status: 'completed', score: 94 },
          'qa-planning': { status: 'completed', score: 96 },
        },
      });

      const gate = new PlanningCompleteGate();
      const result = gate.evaluate(dir, 'autonomous');

      assert.equal(result.result, 'pass');
      assert.ok(result.canProceed);

      rmSync(dir, { recursive: true, force: true });
    });

    it('should FAIL with missing artifacts', () => {
      const dir = createTempDir();
      setupProjectDir(dir, {
        artifacts: ['1-Brief'], // Only one artifact
      });

      const gate = new PlanningCompleteGate();
      const result = gate.evaluate(dir, 'autonomous');

      assert.equal(result.result, 'fail');
      assert.equal(result.canProceed, false);

      rmSync(dir, { recursive: true, force: true });
    });

    it('should report warnings for empty artifact dirs', () => {
      const dir = createTempDir();
      setupProjectDir(dir, {});

      // Create empty artifact dirs
      const artifactsBase = join(dir, 'chati.dev', 'artifacts');
      mkdirSync(artifactsBase, { recursive: true });
      mkdirSync(join(artifactsBase, '1-Brief'));

      const gate = new PlanningCompleteGate();
      const result = gate.evaluate(dir, 'autonomous');

      assert.ok(result.warnings.length > 0);

      rmSync(dir, { recursive: true, force: true });
    });
  });

  // ---------------------------------------------------------------------------
  // Test: QAPlanningGate (G2)
  // ---------------------------------------------------------------------------

  describe('QAPlanningGate', () => {
    it('should PASS with test strategy present and high score', () => {
      const dir = createTempDir();
      setupProjectDir(dir, {
        handoffs: {
          'qa-planning': {
            score: 97,
            status: 'complete',
            outputs: ['test-strategy.md', 'coverage-plan.md', 'risk-assessment.md'],
            criteria_unmet: [],
          },
        },
      });

      const gate = new QAPlanningGate();
      const result = gate.evaluate(dir, 'autonomous');

      assert.equal(result.result, 'pass');
      assert.ok(result.canProceed);

      rmSync(dir, { recursive: true, force: true });
    });

    it('should FAIL without QA-Planning handoff', () => {
      const dir = createTempDir();
      setupProjectDir(dir, {});

      const gate = new QAPlanningGate();
      const result = gate.evaluate(dir, 'autonomous');

      assert.equal(result.result, 'fail');
      assert.equal(result.canProceed, false);

      rmSync(dir, { recursive: true, force: true });
    });
  });

  // ---------------------------------------------------------------------------
  // Test: ImplementationGate (G3)
  // ---------------------------------------------------------------------------

  describe('ImplementationGate', () => {
    it('should PASS with completed dev and test files', () => {
      const dir = createTempDir();
      setupProjectDir(dir, {
        handoffs: {
          dev: {
            score: 92,
            status: 'complete',
            outputs: ['src/feature.js', 'test/feature.test.js'],
          },
        },
        extraFiles: {
          '.lint-result': 'OK',
          '.security-scan': 'CLEAN',
        },
      });

      // Mark dev as completed in session
      updateSession(dir, {
        completed_agents: ['dev'],
        agents: {
          dev: { status: 'completed', score: 92 },
        },
      });

      const gate = new ImplementationGate();
      const result = gate.evaluate(dir, 'autonomous');

      assert.equal(result.result, 'pass');
      assert.ok(result.canProceed);

      rmSync(dir, { recursive: true, force: true });
    });

    it('should FAIL without test files', () => {
      const dir = createTempDir();
      setupProjectDir(dir, {
        handoffs: {
          dev: {
            score: 60,
            status: 'partial',
            outputs: [],
          },
        },
      });

      const gate = new ImplementationGate();
      const result = gate.evaluate(dir, 'autonomous');

      assert.equal(result.result, 'fail');
      assert.equal(result.canProceed, false);

      rmSync(dir, { recursive: true, force: true });
    });
  });

  // ---------------------------------------------------------------------------
  // Test: QAImplementationGate (G4)
  // ---------------------------------------------------------------------------

  describe('QAImplementationGate', () => {
    it('should produce PASS verdict with high score and no bugs', () => {
      const dir = createTempDir();
      setupProjectDir(dir, {
        handoffs: {
          'qa-implementation': {
            score: 95,
            status: 'complete',
            outputs: ['test-report.md'],
            blockers: [],
            criteria_unmet: [],
            criteria_met: ['tests-pass', 'coverage-met', 'no-regressions'],
          },
        },
        extraFiles: {
          'chati.dev/artifacts/performance-report.md': '# Performance\nAll benchmarks met.',
          'chati.dev/artifacts/security-report.md': '# Security\nNo issues found.',
        },
      });

      const gate = new QAImplementationGate();
      const result = gate.evaluate(dir, 'autonomous');

      assert.equal(result.result, 'pass');
      assert.ok(result.canProceed);

      rmSync(dir, { recursive: true, force: true });
    });

    it('should produce CONCERNS verdict for borderline score', () => {
      const dir = createTempDir();
      setupProjectDir(dir, {
        handoffs: {
          'qa-implementation': {
            score: 92,
            status: 'complete',
            outputs: [],
            blockers: [],
            criteria_unmet: ['minor-issue'],
            criteria_met: ['tests-pass'],
          },
        },
      });

      const gate = new QAImplementationGate();
      const evidence = gate._collectEvidence(dir);

      assert.equal(evidence.verdict, QA_IMPL_VERDICTS.CONCERNS);

      rmSync(dir, { recursive: true, force: true });
    });

    it('should produce FAIL verdict with critical bugs', () => {
      const dir = createTempDir();
      setupProjectDir(dir, {
        handoffs: {
          'qa-implementation': {
            score: 70,
            status: 'partial',
            outputs: [],
            blockers: ['Critical: data loss bug'],
            criteria_unmet: ['no-critical-bugs'],
          },
        },
      });

      const gate = new QAImplementationGate();
      const evidence = gate._collectEvidence(dir);

      assert.equal(evidence.verdict, QA_IMPL_VERDICTS.FAIL);

      rmSync(dir, { recursive: true, force: true });
    });

    it('should FAIL without handoff', () => {
      const dir = createTempDir();
      setupProjectDir(dir, {});

      const gate = new QAImplementationGate();
      const evidence = gate._collectEvidence(dir);

      assert.equal(evidence.verdict, QA_IMPL_VERDICTS.FAIL);

      rmSync(dir, { recursive: true, force: true });
    });
  });

  // ---------------------------------------------------------------------------
  // Test: DeployReadyGate (G5)
  // ---------------------------------------------------------------------------

  describe('DeployReadyGate', () => {
    it('should PASS when all deploy criteria met', () => {
      const dir = createTempDir();
      setupProjectDir(dir, {
        handoffs: {
          'qa-implementation': {
            score: 95,
            status: 'complete',
            blockers: [],
          },
        },
        extraFiles: {
          'README.md': '# Project\nReadme content.',
          'CHANGELOG.md': '# Changelog\n## 1.0.0\n- Initial release',
          'RELEASE.md': '# Release Notes\nVersion 1.0.0',
        },
      });

      // Mark all agents completed or skipped (realistic deploy-ready scenario)
      updateSession(dir, {
        completed_agents: [
          'greenfield-wu', 'brief', 'detail', 'architect', 'ux',
          'phases', 'tasks', 'qa-planning', 'dev', 'qa-implementation',
        ],
        agents: {
          'greenfield-wu': { status: 'completed', score: 92 },
          'brownfield-wu': { status: 'skipped', score: 0 },
          brief: { status: 'completed', score: 93 },
          detail: { status: 'completed', score: 91 },
          architect: { status: 'completed', score: 94 },
          ux: { status: 'completed', score: 90 },
          phases: { status: 'completed', score: 92 },
          tasks: { status: 'completed', score: 91 },
          'qa-planning': { status: 'completed', score: 96 },
          dev: { status: 'completed', score: 92 },
          'qa-implementation': { status: 'completed', score: 95 },
          devops: { status: 'completed', score: 90 },
        },
      });

      const gate = new DeployReadyGate();
      const result = gate.evaluate(dir, 'autonomous');

      assert.equal(result.result, 'pass');
      assert.ok(result.canProceed);

      rmSync(dir, { recursive: true, force: true });
    });

    it('should FAIL when not ready', () => {
      const dir = createTempDir();
      setupProjectDir(dir, {});

      const gate = new DeployReadyGate();
      const result = gate.evaluate(dir, 'autonomous');

      assert.equal(result.result, 'fail');
      assert.equal(result.canProceed, false);

      rmSync(dir, { recursive: true, force: true });
    });
  });

  // ---------------------------------------------------------------------------
  // Test: Gate Registry
  // ---------------------------------------------------------------------------

  describe('gate registry', () => {
    it('should return PlanningCompleteGate for pre-build', () => {
      const gate = getGateForPipelinePoint('pre-build');
      assert.ok(gate instanceof PlanningCompleteGate);
    });

    it('should return QAPlanningGate for post-qa-planning', () => {
      const gate = getGateForPipelinePoint('post-qa-planning');
      assert.ok(gate instanceof QAPlanningGate);
    });

    it('should return ImplementationGate for post-dev', () => {
      const gate = getGateForPipelinePoint('post-dev');
      assert.ok(gate instanceof ImplementationGate);
    });

    it('should return QAImplementationGate for post-qa-impl', () => {
      const gate = getGateForPipelinePoint('post-qa-impl');
      assert.ok(gate instanceof QAImplementationGate);
    });

    it('should return DeployReadyGate for pre-deploy', () => {
      const gate = getGateForPipelinePoint('pre-deploy');
      assert.ok(gate instanceof DeployReadyGate);
    });

    it('should throw for unknown pipeline point', () => {
      assert.throws(
        () => getGateForPipelinePoint('nonexistent'),
        /No gate registered/
      );
    });
  });
});
