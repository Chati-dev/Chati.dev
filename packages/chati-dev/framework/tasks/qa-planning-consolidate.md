---
id: qa-planning-consolidate
agent: qa-planning
trigger: qa-planning-risk-matrix
phase: plan
requires_input: false
parallelizable: false
outputs: [qa-plan.yaml]
handoff_to: dev
autonomous_gate: true
criteria:
  - Overall QA plan score >= 95%
  - All quality gates defined
  - Coverage targets set for all modules
  - Risk matrix complete
  - Test strategy documented
---

# QA Planning Consolidation

## Purpose
Compile all QA planning outputs into a final qa-plan.yaml document, calculate an overall quality score, and determine readiness for autonomous transition to the build phase.

## Prerequisites
- test-strategy.yaml (testing approach and tools)
- quality-gates.yaml (gates and thresholds)
- coverage-plan.yaml (module coverage targets)
- risk-matrix.yaml (feature risk mapping)

## Steps

1. **Validate Input Documents**
   - Verify all four prerequisite files exist and are valid YAML
   - Check schema compliance for each document
   - Ensure cross-references are consistent (e.g., risk levels in coverage-plan match risk-matrix)
   - Flag any missing or incomplete sections

2. **Calculate Test Strategy Score (25 points)**
   - **Testing pyramid defined** (5 points): Unit, integration, e2e, manual scopes clear
   - **Risk areas identified** (5 points): Critical, high, medium, low risks documented
   - **Tools selected** (5 points): Test framework, SAST, performance, coverage tools specified
   - **Test environments planned** (5 points): Local, CI, isolation, matrix defined
   - **Execution order established** (5 points): Pre-commit, pre-push, CI, release order set

3. **Calculate Quality Gates Score (25 points)**
   - **Gates for all stages** (7 points): Pre-commit, planning, build, validate, deploy gates defined
   - **Thresholds with pass/fail** (6 points): Clear numeric or boolean thresholds for each gate
   - **Enforcement mechanisms** (6 points): Automated, agent-enforced, manual processes specified
   - **Bypass procedures** (3 points): Deviation protocol, manual approval, exceptions documented
   - **Severity levels** (3 points): BLOCKER, CRITICAL, MAJOR, MINOR defined

4. **Calculate Coverage Plan Score (25 points)**
   - **All modules have targets** (8 points): Every module/component has specific coverage percentage
   - **Target justifications** (5 points): Rationale provided for each target
   - **Measurement approach** (5 points): Tool, metrics, enforcement, reporting defined
   - **Hard-to-test strategies** (4 points): Mocking, isolation, alternative validation approaches
   - **Exceptions documented** (3 points): Uncovered areas with justifications

5. **Calculate Risk Matrix Score (25 points)**
   - **All features mapped** (8 points): Every feature has impact, likelihood, risk level
   - **Risk scoring methodology** (5 points): Clear formula for calculating risk
   - **Mitigation strategies** (5 points): Technical, process, monitoring mitigations per risk
   - **Testing priorities** (4 points): Priority 1-4 with corresponding test approaches
   - **Risk acceptances** (3 points): Known accepted risks with residual risk documentation

6. **Calculate Overall Score**
   - Sum all four category scores (max 100 points)
   - Apply penalties for inconsistencies:
     - Cross-reference mismatch: -5 points per issue (e.g., coverage-plan risk level ≠ risk-matrix)
     - Missing critical sections: -10 points per section
     - Unrealistic targets: -5 points (e.g., 100% coverage on hard-to-test code)
   - Final score = raw score - penalties

7. **Assess Autonomous Transition Readiness**
   - **Score >= 95%**: Autonomous transition to build phase approved
   - **Score 90-94%**: Manual approval required, flag for user review
   - **Score < 90%**: Insufficient quality, identify gaps and remediation

8. **Identify Gaps and Recommendations**
   - List specific missing or weak sections
   - Provide concrete recommendations for improvement
   - Prioritize gaps by impact (critical gaps block transition)
   - Include estimated effort to close gaps

9. **Cross-Validate with Constitution**
   - Verify mode governance rules are respected (autonomous transition at 95%)
   - Ensure quality gates align with mode constraints (planning = read all, write chati.dev/ only)
   - Check that agent handoff logic is valid (qa-planning → dev)
   - Validate autonomous_gate: true is correctly set

10. **Compile Consolidated QA Plan**
    - Create qa-plan.yaml with summary of all planning documents
    - Include overall score and subscores
    - Document autonomous transition decision
    - Add executive summary for stakeholders

11. **Generate Handoff Artifacts**
    - If score >= 95%, prepare handoff to dev agent
    - Include prioritized test implementation roadmap
    - Provide quick-start guide for dev agent
    - Document any open questions or assumptions

12. **Log Completion and Next Steps**
    - Update session.yaml with qa-planning completion status
    - Log overall score and autonomous transition decision
    - If autonomous transition approved, trigger dev agent
    - If manual approval needed, prompt orchestrator for user input

## Decision Points

- **Score in 90-94% Range**: This is the gray zone. Assess whether gaps are minor (documentation completeness) or substantive (missing risk areas). For minor gaps, recommend manual approval. For substantive gaps, require remediation.

- **Conflicting Cross-References**: If coverage-plan.yaml and risk-matrix.yaml disagree on risk levels, trust risk-matrix as the source of truth (it's more comprehensive). Update coverage-plan mentally or flag for correction.

- **Unrealistic Targets**: If coverage targets are excessively high (e.g., 100% on integration tests with external dependencies), apply realism penalty. Suggest adjusted targets in recommendations.

## Error Handling

**Missing Input Document**
- Cannot proceed without all four planning documents
- Log error with specific missing file
- Return to orchestrator with dependency resolution request
- Do not calculate partial score

**Schema Validation Failure**
- If a document fails schema validation, attempt to identify specific issue
- Log detailed error (line number, field name, expected format)
- Escalate to orchestrator for manual correction
- Do not proceed with invalid data

**Cross-Reference Inconsistencies**
- If inconsistencies are minor (e.g., slight wording differences), document and proceed with penalty
- If inconsistencies are major (e.g., module in coverage-plan not in risk-matrix), flag as critical gap
- Provide specific remediation steps in recommendations

**Score Below Threshold**
- If overall score < 90%, compilation succeeds but transition fails
- Generate detailed gap analysis with prioritized action items
- Escalate to orchestrator for user decision (remediate or override via deviation protocol)
- Log decision and rationale in session.yaml

## Output Format

```yaml
# qa-plan.yaml
version: 1.0.0
created: YYYY-MM-DD
agent: qa-planning

overall_score: 96
autonomous_transition: approved
transition_to: dev

subscores:
  test_strategy: 24 / 25
  quality_gates: 25 / 25
  coverage_plan: 24 / 25
  risk_matrix: 23 / 25

scoring_breakdown:
  test_strategy:
    testing_pyramid_defined: 5 / 5
    risk_areas_identified: 5 / 5
    tools_selected: 5 / 5
    environments_planned: 4 / 5 # CI matrix incomplete
    execution_order: 5 / 5

  quality_gates:
    gates_all_stages: 7 / 7
    thresholds_clear: 6 / 6
    enforcement_mechanisms: 6 / 6
    bypass_procedures: 3 / 3
    severity_levels: 3 / 3

  coverage_plan:
    modules_have_targets: 8 / 8
    target_justifications: 5 / 5
    measurement_approach: 5 / 5
    hard_to_test_strategies: 3 / 4 # IDE integration strategy weak
    exceptions_documented: 3 / 3

  risk_matrix:
    features_mapped: 8 / 8
    risk_scoring: 5 / 5
    mitigation_strategies: 5 / 5
    testing_priorities: 2 / 4 # Priority 4 features under-specified
    risk_acceptances: 3 / 3

penalties:
  - issue: CI matrix incomplete (only 2 OSes specified, need 3)
    penalty: -1
  - issue: IDE integration testing strategy needs more detail
    penalty: -1
  - issue: Priority 4 features lack test case examples
    penalty: -2

gaps:
  minor:
    - CI matrix incomplete: Add Windows to existing Ubuntu + macOS
    - IDE integration strategy: Add headless IDE API approach for automated testing
    - Priority 4 test cases: Provide 2-3 example test cases for low-risk features

  major: []

recommendations:
  - Close minor gaps in next iteration (estimated 2 hours)
  - Current score 96% exceeds autonomous transition threshold
  - Proceed to build phase with dev agent
  - Revisit IDE testing strategy in Phase 1 (after installer complete)

constitution_compliance:
  mode_governance: compliant
  autonomous_threshold: met (96% >= 95%)
  agent_handoff: valid (qa-planning -> dev)
  autonomous_gate: set correctly

executive_summary:
  status: APPROVED
  confidence: high
  readiness: 96%
  key_strengths:
    - Comprehensive risk matrix covering all features
    - Clear quality gates with enforcement mechanisms
    - Realistic coverage targets with justifications
    - Thorough test strategy with tools and environments

  areas_for_improvement:
    - CI matrix should include Windows testing
    - IDE integration testing needs automation approach
    - Low-priority features need example test cases

  recommendation: Proceed to build phase with dev agent. Address minor gaps during Phase 1 implementation.

handoff_to_dev:
  priority_1_tests:
    - Mode transition validation (state management, orchestrator)
    - session.yaml write operations (state management)
    - Version migration execution (upgrade system)

  priority_2_tests:
    - Agent routing logic (orchestrator)
    - Task definition loading (agents)
    - config.yaml parsing (configuration)

  test_implementation_order:
    1. Set up test framework (Vitest) and coverage tool (c8)
    2. Implement Priority 1 tests (critical risk)
    3. Set up CI pipeline with quality gates
    4. Implement Priority 2 tests (high risk)
    5. Add integration tests for agent workflows
    6. Implement Priority 3 tests (medium risk)

  quick_start:
    - Review test-strategy.yaml for testing approach
    - Reference coverage-plan.yaml for module-specific targets
    - Use risk-matrix.yaml to prioritize test implementation
    - Enforce quality-gates.yaml thresholds in CI

  open_questions: []

  assumptions:
    - Vitest is compatible with project Node.js version (22.x)
    - CI environment (GitHub Actions assumed) supports matrix builds
    - MCP tool responses can be mocked with fixture data

input_documents:
  - file: test-strategy.yaml
    status: valid
    score_contribution: 24 / 25

  - file: quality-gates.yaml
    status: valid
    score_contribution: 25 / 25

  - file: coverage-plan.yaml
    status: valid
    score_contribution: 24 / 25

  - file: risk-matrix.yaml
    status: valid
    score_contribution: 23 / 25

cross_validation:
  coverage_vs_risk:
    status: consistent
    issues: []

  gates_vs_risk:
    status: consistent
    issues: []

  strategy_vs_coverage:
    status: consistent
    issues: []

session_update:
  agent: qa-planning
  status: completed
  score: 96
  autonomous_transition: approved
  next_agent: dev
  timestamp: YYYY-MM-DDTHH:MM:SSZ

next_steps:
  - Orchestrator triggers dev agent (autonomous transition)
  - Dev agent begins Phase 1 (Installer) implementation
  - QA-Implementation agent on standby for build phase
  - Revisit minor gaps during Phase 1 review
```
