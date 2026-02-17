---
id: qa-planning-gate-define
agent: qa-planning
trigger: qa-planning-test-strategy
phase: plan
requires_input: false
parallelizable: false
outputs: [quality-gates.yaml]
handoff_to: qa-planning-coverage-plan
autonomous_gate: false
criteria:
  - Quality gates defined for all pipeline stages
  - Thresholds established with clear pass/fail criteria
  - Gate enforcement mechanisms specified
---

# Quality Gate Definition

## Purpose
Define quality gates and enforcement thresholds for each stage of the chati.dev pipeline, ensuring consistent quality standards from development through deployment.

## Prerequisites
- test-strategy.yaml completed with testing approach
- Phase plan showing pipeline stages (planning → build → validate → deploy)
- Understanding of mode governance rules from constitution
- Risk matrix inputs (will be formalized in later task)

## Steps

1. **Review Pipeline Architecture**
   - Identify all pipeline stages: planning (8 agents), build (dev + qa-impl), validate (qa-impl verdict), deploy (devops)
   - Map agent handoff points where quality checks occur
   - Note autonomous transition triggers (qa-planning → dev at 95%, qa-impl verdict → devops on PASS)
   - Identify backward transition scenarios (build → planning when spec issues found)

2. **Define Pre-Commit Gates**
   - **Unit Test Pass Rate**: 100% (all unit tests must pass)
   - **Code Coverage**: Minimum 70% overall, 80% for new code
   - **Linting**: Zero errors, warnings under threshold (10 max)
   - **Type Safety**: Zero TypeScript errors
   - **Enforcement**: Git pre-commit hooks
   - **Bypass**: Not allowed (ensures baseline quality)

3. **Define Planning Phase Gates**
   - **Agent Completion**: All 8 planning agents must complete (greenfield-wu/brownfield-wu → brief → detail → architect → ux → phases → tasks → qa-planning)
   - **Specification Completeness**: 100% of required sections filled
   - **QA Planning Score**: >= 95% for autonomous transition to build phase
   - **Manual Override**: Available if score 90-94% with justification
   - **Enforcement**: Orchestrator validation before mode transition

4. **Define Build Phase Gates**
   - **Implementation Complete**: All tasks marked done in session.yaml
   - **Test Execution**: All unit + integration tests passing
   - **SAST Clean**: Zero critical vulnerabilities, high vulnerabilities < 3
   - **No Regressions**: All regression checks passing vs baseline
   - **Performance**: Benchmarks within 10% of targets
   - **Enforcement**: qa-implementation agent validation

5. **Define Validate Phase Gates**
   - **QA Verdict**: PASS required for deployment
   - **Manual Testing**: All critical paths verified
   - **Documentation**: README, API docs, migration guides complete
   - **Backward Compatibility**: Upgrade path validated
   - **Enforcement**: qa-impl-verdict task with autonomous gate

6. **Define Deploy Phase Gates**
   - **Package Integrity**: npm audit clean, no missing dependencies
   - **Version Compliance**: Semantic versioning followed
   - **Release Notes**: Complete with breaking changes documented
   - **Rollback Plan**: Tested and verified
   - **Enforcement**: devops agent validation

7. **Establish Threshold Levels**
   - **BLOCKER**: Must fix immediately, blocks all progress (test failures, critical vulnerabilities)
   - **CRITICAL**: Must fix before merge/release (high vulnerabilities, major regressions)
   - **MAJOR**: Should fix in current phase (moderate issues, technical debt)
   - **MINOR**: Can defer to backlog (low priority issues, enhancements)

8. **Define Gate Enforcement Mechanisms**
   - **Automated**: CI/CD pipeline checks, pre-commit hooks
   - **Agent-Enforced**: Orchestrator mode governance, qa-planning consolidation score
   - **Manual**: Human review for override decisions, complex risk assessment
   - **Audit Trail**: All gate passes/failures logged in session.yaml mode_transitions

9. **Create Gate Bypass Procedures**
   - **Deviation Protocol**: Orchestrator-managed with user confirmation
   - **Documentation Required**: Reason, risk assessment, mitigation plan
   - **Approval Level**: User approval for mode transitions, team lead for deploy gates
   - **Temporal Limits**: Bypass expires after 24 hours, requires renewal

10. **Map Gates to Risk Levels**
    - **Critical Risk Areas**: Stricter gates (state management → 100% test coverage, zero errors)
    - **High Risk Areas**: Standard gates (agent logic → 80% coverage, < 3 warnings)
    - **Medium Risk Areas**: Relaxed gates (UI/formatting → 70% coverage)
    - **Low Risk Areas**: Minimal gates (documentation → linting only)

11. **Define Monitoring and Metrics**
    - **Gate Pass Rate**: Track percentage of clean gate passes
    - **Bypass Frequency**: Monitor override usage patterns
    - **Time in Gate**: Measure delay caused by gate failures
    - **Trend Analysis**: Track improvement/degradation over phases

12. **Compile Quality Gates Document**
    - Structure gates by pipeline stage
    - Include enforcement mechanisms and thresholds
    - Document bypass procedures
    - Map to mode governance rules

## Decision Points

- **Threshold Strictness**: For new projects (greenfield), gates can be stricter (80% coverage baseline). For existing codebases (brownfield), gates may need gradual tightening (70% → 75% → 80% over releases).

- **Autonomous Transition Score**: The 95% threshold for qa-planning → dev transition is constitutional. If project risk profile suggests adjustment, flag for deviation protocol review.

- **SAST Severity Tolerance**: Zero critical vulnerabilities is standard. If legacy dependencies have unavoidable high-severity issues, document exceptions explicitly.

## Error Handling

**Conflicting Gate Requirements**
- If test coverage gates conflict with timeline constraints, document trade-off
- Propose phased gate implementation (strict for new code, gradual for legacy)
- Escalate to orchestrator if unresolvable

**Unmeasurable Metrics**
- If a proposed gate lacks tooling for measurement (e.g., "code readability"), convert to measurable proxy (e.g., "cyclomatic complexity < 10")
- Document limitation and suggest manual review cadence

**Tool Integration Failures**
- If CI/CD pipeline cannot enforce a gate automatically, define manual checklist
- Flag for devops agent to implement automation in future phase
- Ensure interim manual process is documented

## Output Format

```yaml
# quality-gates.yaml
version: 1.0.0
created: YYYY-MM-DD
agent: qa-planning

pipeline_stages:
  pre_commit:
    gates:
      - name: Unit Tests
        threshold: 100% pass rate
        enforcement: git pre-commit hook
        bypass: not_allowed

      - name: Code Coverage
        threshold: 70% overall, 80% new code
        enforcement: coverage tool (c8)
        bypass: not_allowed

      - name: Linting
        threshold: 0 errors, max 10 warnings
        enforcement: eslint pre-commit
        bypass: not_allowed

      - name: Type Safety
        threshold: 0 TypeScript errors
        enforcement: tsc --noEmit
        bypass: not_allowed

  planning:
    gates:
      - name: Agent Completion
        threshold: 8/8 agents complete
        enforcement: orchestrator validation
        bypass: deviation_protocol

      - name: Specification Completeness
        threshold: 100% required sections
        enforcement: agent self-validation
        bypass: manual_review

      - name: QA Planning Score
        threshold: ">= 95% for autonomous transition"
        enforcement: qa-planning-consolidate
        bypass: manual_approval_90_94_percent
        autonomous_gate: true

  build:
    gates:
      - name: Implementation Complete
        threshold: All tasks done
        enforcement: session.yaml validation
        bypass: deviation_protocol

      - name: Test Suite
        threshold: 100% pass rate
        enforcement: CI pipeline
        bypass: not_allowed

      - name: SAST
        threshold: 0 critical, < 3 high severity
        enforcement: eslint-plugin-security
        bypass: documented_exception

      - name: Regressions
        threshold: 0 new regressions
        enforcement: regression test suite
        bypass: risk_assessment

      - name: Performance
        threshold: Within 10% of baseline
        enforcement: benchmark suite
        bypass: justified_trade_off

  validate:
    gates:
      - name: QA Verdict
        threshold: PASS status
        enforcement: qa-impl-verdict
        bypass: not_allowed
        autonomous_gate: true

      - name: Manual Testing
        threshold: All critical paths verified
        enforcement: qa-impl checklist
        bypass: risk_accepted

      - name: Documentation
        threshold: Complete and accurate
        enforcement: manual review
        bypass: defer_to_post_release

  deploy:
    gates:
      - name: Package Integrity
        threshold: npm audit clean
        enforcement: npm audit
        bypass: documented_exception

      - name: Version Compliance
        threshold: semver rules followed
        enforcement: automated check
        bypass: not_allowed

      - name: Release Notes
        threshold: Complete with breaking changes
        enforcement: manual review
        bypass: not_allowed

severity_levels:
  BLOCKER:
    description: Blocks all progress
    examples: [test failures, critical vulnerabilities, build breakage]
    resolution_time: immediate

  CRITICAL:
    description: Blocks merge/release
    examples: [high vulnerabilities, major regressions, data loss risks]
    resolution_time: same day

  MAJOR:
    description: Fix in current phase
    examples: [moderate issues, technical debt, performance degradation]
    resolution_time: within phase

  MINOR:
    description: Backlog eligible
    examples: [low priority issues, enhancements, cosmetic fixes]
    resolution_time: next phase or later

bypass_procedures:
  deviation_protocol:
    trigger: orchestrator
    requires: user confirmation
    documentation: [reason, risk assessment, mitigation plan]
    audit: logged in session.yaml mode_transitions
    expiration: 24 hours

  manual_approval:
    trigger: agent or developer
    requires: team lead approval
    documentation: [justification, alternative validation]
    audit: logged in gate override log

  documented_exception:
    trigger: persistent issue
    requires: exception record in exceptions.yaml
    documentation: [issue details, why unfixable, risk acceptance]
    review_cadence: quarterly

enforcement:
  automated:
    - Git pre-commit hooks
    - CI/CD pipeline checks
    - Coverage threshold enforcement

  agent_enforced:
    - Orchestrator mode governance
    - qa-planning consolidation score
    - qa-impl verdict gate

  manual:
    - Override decision review
    - Complex risk assessment
    - Deployment approval

metrics:
  gate_pass_rate:
    target: ">= 90%"
    measurement: successful gates / total gate checks

  bypass_frequency:
    target: "< 5% of gate checks"
    measurement: bypass approvals / total gate checks

  time_in_gate:
    target: "< 4 hours average"
    measurement: time from failure to resolution

  trend:
    measurement: monthly comparison
    alert_threshold: 10% degradation

risk_mapping:
  critical:
    areas: [state management, mode governance, file operations]
    gates: [100% coverage, 0 errors, full integration tests]

  high:
    areas: [agent logic, handoff validation, MCP integration]
    gates: [80% coverage, "< 3 warnings", contract tests]

  medium:
    areas: [i18n, CLI parsing, error messages]
    gates: [70% coverage, standard linting]

  low:
    areas: [documentation, formatting, comments]
    gates: [linting only]

next_steps:
  - Create detailed coverage plan per module
  - Build risk matrix mapping features to risk levels
  - Validate gate thresholds against project timeline
```
