---
id: qa-planning-risk-matrix
agent: qa-planning
trigger: qa-planning-coverage-plan
phase: plan
requires_input: false
parallelizable: false
outputs: [risk-matrix.yaml]
handoff_to: qa-planning-consolidate
autonomous_gate: false
criteria:
  - All features mapped to risk levels
  - Risk mitigation strategies defined
  - Testing priorities established
---

# Risk Matrix Building

## Purpose
Build a comprehensive risk matrix mapping all features, components, and workflows to risk levels (critical, high, medium, low) with corresponding mitigation strategies and testing priorities.

## Prerequisites
- test-strategy.yaml with risk areas identified
- quality-gates.yaml with risk-based gate enforcement
- coverage-plan.yaml with module-level coverage targets
- Architecture and task documents showing all features

## Steps

1. **Enumerate All System Features**
   - Core workflows: greenfield pipeline, brownfield pipeline, mode transitions
   - Agent operations: task execution, handoffs, validation
   - State management: session.yaml CRUD, consistency checks, concurrency
   - File operations: create, read, write, delete, permissions
   - CLI commands: /chati, npx chati-dev *, help, status
   - Configuration: config.yaml loading, merging, validation
   - Internationalization: locale detection, translation loading, rendering
   - Upgrade system: version detection, migrations, backup/restore
   - Error handling: error construction, formatting, recovery
   - Mode governance: autonomous transitions, backward transitions, overrides

2. **Assess Impact for Each Feature**
   - **Critical Impact**: Data loss, corruption, or system unusable
   - **High Impact**: Major functionality broken, workaround difficult
   - **Medium Impact**: Minor functionality impaired, workaround available
   - **Low Impact**: Cosmetic issues, inconvenience only

3. **Assess Likelihood for Each Feature**
   - **High Likelihood**: Complex logic, external dependencies, frequent changes
   - **Medium Likelihood**: Moderate complexity, some dependencies, stable
   - **Low Likelihood**: Simple logic, no dependencies, well-tested patterns

4. **Calculate Risk Level (Impact × Likelihood)**
   - **Critical**: Critical Impact + High Likelihood OR High Impact + High Likelihood
   - **High**: Critical Impact + Medium Likelihood OR High Impact + Medium Likelihood
   - **Medium**: Any Medium Impact OR High Impact + Low Likelihood
   - **Low**: Low Impact (any likelihood)

5. **Map Features to Risk Categories**
   - Create a matrix with features in rows, impact/likelihood/risk in columns
   - Group features by system area (orchestrator, agents, state, file, CLI, etc.)
   - Highlight critical and high-risk items for priority testing

6. **Define Risk-Specific Testing Strategies**
   - **Critical Risk**: 90%+ coverage, integration tests, manual verification, security review
   - **High Risk**: 80%+ coverage, integration tests, regression suite
   - **Medium Risk**: 70%+ coverage, unit tests, spot checks
   - **Low Risk**: 60%+ coverage, unit tests, automated checks

7. **Identify Risk Mitigation Measures**
   - **Technical Mitigations**: Input validation, error handling, rollback mechanisms, backup strategies
   - **Process Mitigations**: Code review, pair programming, manual testing, staged rollouts
   - **Monitoring**: Health checks, error logging, user feedback, metrics

8. **Prioritize Testing Effort**
   - **Priority 1 (Critical Risk)**: Test first, most thorough, block release on failures
   - **Priority 2 (High Risk)**: Test early, comprehensive, block merge on failures
   - **Priority 3 (Medium Risk)**: Test standard, adequate, warn on failures
   - **Priority 4 (Low Risk)**: Test basic, minimal, informational on failures

9. **Map Risk to Quality Gates**
   - Cross-reference risk levels with quality-gates.yaml thresholds
   - Ensure critical/high risk areas have strictest gate enforcement
   - Validate that gate bypass procedures align with risk tolerance

10. **Document Known Risk Acceptances**
    - List risks that are accepted (not mitigated) with justification
    - Document residual risk after mitigation
    - Define monitoring/alerting for accepted risks

11. **Create Risk Evolution Plan**
    - Identify how risks change over project lifecycle (early phase: architecture risks, late phase: regression risks)
    - Plan for risk reassessment triggers (major refactor, new feature, security incident)
    - Schedule periodic risk reviews (monthly, per phase)

12. **Compile Risk Matrix Document**
    - Structure by system area with risk levels
    - Include mitigation strategies and testing priorities
    - Map to coverage targets and quality gates
    - Add risk acceptance records

## Decision Points

- **Risk Tolerance Calibration**: If stakeholders have different risk tolerances (e.g., startup vs enterprise), adjust impact/likelihood thresholds. Document the calibration in risk-matrix.yaml.

- **Testing Budget Trade-offs**: If timeline or resources are constrained, prioritize critical/high-risk testing. Document deferred medium/low-risk testing and residual risk acceptance.

- **Third-Party Risk**: For external dependencies (MCPs, npm packages), decide whether to include in risk matrix. Recommend: include integration points, exclude internal dependency logic (tested upstream).

## Error Handling

**Incomplete Feature List**
- If architecture or task documents don't cover all features, use best judgment from codebase exploration
- Flag incomplete areas for architect/pm review
- Assign medium risk by default to unknown features

**Ambiguous Impact Assessment**
- If impact is unclear, err on the side of higher risk classification
- Document assumption and flag for stakeholder input
- Provide range (e.g., "Medium to High impact depending on user workflow")

**Conflicting Risk Assessments**
- If coverage-plan.yaml and risk assessment disagree on priority, resolve based on risk matrix (risk-driven approach)
- Escalate to orchestrator if significant discrepancy
- Document resolution in risk-matrix.yaml

## Output Format

```yaml
# risk-matrix.yaml
version: 1.0.0
created: YYYY-MM-DD
agent: qa-planning

risk_scoring:
  impact:
    critical: Data loss, corruption, system unusable
    high: Major functionality broken, difficult workaround
    medium: Minor functionality impaired, workaround available
    low: Cosmetic issues, inconvenience only

  likelihood:
    high: Complex logic, external dependencies, frequent changes
    medium: Moderate complexity, some dependencies, stable
    low: Simple logic, no dependencies, well-tested patterns

  calculation: "Critical = (Critical Impact + High Likelihood) OR (High Impact + High Likelihood)"

features:
  # ORCHESTRATOR
  - feature: Mode transition validation
    area: orchestrator
    impact: critical
    likelihood: high
    risk_level: critical
    rationale: Invalid mode transitions can corrupt workflow state
    mitigation:
      - Strict validation in mode-governance.js
      - Audit trail in session.yaml mode_transitions
      - Rollback mechanism for failed transitions
    testing_priority: 1
    coverage_target: 95%
    test_types: [unit, integration, e2e]
    gate_enforcement: blocker

  - feature: Agent routing logic
    area: orchestrator
    impact: high
    likelihood: medium
    risk_level: high
    rationale: Incorrect routing can skip critical agents
    mitigation:
      - Decision tree validation
      - Agent completion tracking
      - Manual override with confirmation
    testing_priority: 2
    coverage_target: 85%
    test_types: [unit, integration]
    gate_enforcement: critical

  - feature: Deviation protocol handling
    area: orchestrator
    impact: high
    likelihood: medium
    risk_level: high
    rationale: Overrides can bypass quality gates
    mitigation:
      - User confirmation required
      - Audit logging
      - Temporal limits on overrides
    testing_priority: 2
    coverage_target: 80%
    test_types: [unit, integration]
    gate_enforcement: critical

  # STATE MANAGEMENT
  - feature: session.yaml write operations
    area: state_management
    impact: critical
    likelihood: high
    risk_level: critical
    rationale: File corruption can lose all project state
    mitigation:
      - Atomic writes (write to temp, rename)
      - Backup before write
      - Schema validation on read
      - Corruption detection
    testing_priority: 1
    coverage_target: 95%
    test_types: [unit, integration, error_injection]
    gate_enforcement: blocker

  - feature: Concurrent state access
    area: state_management
    impact: critical
    likelihood: medium
    risk_level: critical
    rationale: Race conditions can cause state inconsistency
    mitigation:
      - File locking mechanism
      - Optimistic concurrency detection
      - Conflict resolution strategy
    testing_priority: 1
    coverage_target: 90%
    test_types: [unit, integration, concurrency]
    gate_enforcement: blocker

  - feature: State consistency validation
    area: state_management
    impact: high
    likelihood: medium
    risk_level: high
    rationale: Invalid state can cause cascading failures
    mitigation:
      - Schema validation on every read
      - Consistency checks on write
      - Auto-repair for known issues
    testing_priority: 2
    coverage_target: 90%
    test_types: [unit, integration]
    gate_enforcement: critical

  # FILE OPERATIONS
  - feature: File write with permissions
    area: file_operations
    impact: high
    likelihood: high
    risk_level: critical
    rationale: Permission errors common, can block workflow
    mitigation:
      - Pre-flight permission check
      - Graceful degradation
      - Clear error messages
    testing_priority: 1
    coverage_target: 85%
    test_types: [unit, integration, error_injection]
    gate_enforcement: critical

  - feature: Path traversal prevention
    area: file_operations
    impact: critical
    likelihood: low
    risk_level: high
    rationale: Security risk if user input in file paths
    mitigation:
      - Path normalization and validation
      - Whitelist allowed directories
      - Reject absolute paths from user input
    testing_priority: 2
    coverage_target: 90%
    test_types: [unit, security]
    gate_enforcement: critical

  - feature: File read error handling
    area: file_operations
    impact: medium
    likelihood: medium
    risk_level: medium
    rationale: Missing files are expected in some workflows
    mitigation:
      - Distinguish file not found vs read error
      - Provide default for missing optional files
      - Clear error for required files
    testing_priority: 3
    coverage_target: 75%
    test_types: [unit, integration]
    gate_enforcement: major

  # AGENTS
  - feature: Task definition loading
    area: agents
    impact: high
    likelihood: medium
    risk_level: high
    rationale: Malformed task files can break agent execution
    mitigation:
      - Schema validation for frontmatter
      - Markdown parsing error handling
      - Fallback to safe defaults
    testing_priority: 2
    coverage_target: 85%
    test_types: [unit, integration]
    gate_enforcement: critical

  - feature: Agent handoff validation
    area: agents
    impact: high
    likelihood: medium
    risk_level: high
    rationale: Invalid handoffs can skip agents or create loops
    mitigation:
      - Validate handoff_to references
      - Detect circular dependencies
      - Enforce phase constraints
    testing_priority: 2
    coverage_target: 80%
    test_types: [unit, integration]
    gate_enforcement: critical

  - feature: Agent self-validation
    area: agents
    impact: medium
    likelihood: medium
    risk_level: medium
    rationale: Weak validation can pass incomplete work
    mitigation:
      - Criteria checklists per task
      - Output validation
      - Manual review option
    testing_priority: 3
    coverage_target: 75%
    test_types: [unit]
    gate_enforcement: major

  # CLI
  - feature: Command argument parsing
    area: cli
    impact: medium
    likelihood: high
    risk_level: medium
    rationale: User input is unpredictable
    mitigation:
      - Argument validation with helpful errors
      - Default values for optional args
      - Help text for all commands
    testing_priority: 3
    coverage_target: 70%
    test_types: [unit, integration]
    gate_enforcement: major

  - feature: IDE detection
    area: cli
    impact: low
    likelihood: medium
    risk_level: low
    rationale: Fallback to generic mode works
    mitigation:
      - Heuristic-based detection
      - Manual override flag
      - Graceful degradation
    testing_priority: 4
    coverage_target: 60%
    test_types: [unit]
    gate_enforcement: minor

  # CONFIGURATION
  - feature: config.yaml parsing
    area: configuration
    impact: high
    likelihood: medium
    risk_level: high
    rationale: Invalid config can break initialization
    mitigation:
      - Schema validation with JSON Schema
      - Default config fallback
      - Detailed parse error messages
    testing_priority: 2
    coverage_target: 85%
    test_types: [unit, integration]
    gate_enforcement: critical

  - feature: Config merging (defaults + user)
    area: configuration
    impact: medium
    likelihood: low
    risk_level: medium
    rationale: Merge conflicts are rare but confusing
    mitigation:
      - Deep merge with explicit precedence
      - Validation after merge
      - Log merge decisions
    testing_priority: 3
    coverage_target: 75%
    test_types: [unit]
    gate_enforcement: major

  # I18N
  - feature: Translation file loading
    area: i18n
    impact: medium
    likelihood: low
    risk_level: medium
    rationale: Missing translations degrade UX but don't block
    mitigation:
      - Fallback to English
      - Log missing translation keys
      - Validate translation files in CI
    testing_priority: 3
    coverage_target: 70%
    test_types: [unit, integration]
    gate_enforcement: major

  - feature: Locale detection
    area: i18n
    impact: low
    likelihood: low
    risk_level: low
    rationale: Default to English is acceptable
    mitigation:
      - Check LANG env var
      - Manual override via config
      - Clear language in CLI output
    testing_priority: 4
    coverage_target: 60%
    test_types: [unit]
    gate_enforcement: minor

  # UPGRADE SYSTEM
  - feature: Version migration execution
    area: upgrade
    impact: critical
    likelihood: medium
    risk_level: critical
    rationale: Failed migration can corrupt project
    mitigation:
      - Backup before migration
      - Atomic migration (all or nothing)
      - Rollback on failure
      - Dry-run mode
    testing_priority: 1
    coverage_target: 90%
    test_types: [unit, integration, e2e]
    gate_enforcement: blocker

  - feature: Backup and restore
    area: upgrade
    impact: critical
    likelihood: low
    risk_level: high
    rationale: Backup failures discovered during restore
    mitigation:
      - Verify backup integrity after creation
      - Test restore in CI
      - Multiple backup slots
    testing_priority: 2
    coverage_target: 85%
    test_types: [unit, integration]
    gate_enforcement: critical

  - feature: Version compatibility check
    area: upgrade
    impact: medium
    likelihood: medium
    risk_level: medium
    rationale: Incompatible versions can cause errors
    mitigation:
      - Semantic version parsing
      - Clear compatibility messages
      - Graceful degradation
    testing_priority: 3
    coverage_target: 75%
    test_types: [unit]
    gate_enforcement: major

  # ERROR HANDLING
  - feature: Error recovery strategies
    area: error_handling
    impact: high
    likelihood: medium
    risk_level: high
    rationale: Poor recovery can cascade failures
    mitigation:
      - Structured error types
      - Recovery suggestions in error messages
      - Graceful degradation
    testing_priority: 2
    coverage_target: 80%
    test_types: [unit, integration]
    gate_enforcement: critical

  - feature: Error message clarity
    area: error_handling
    impact: medium
    likelihood: high
    risk_level: medium
    rationale: Unclear errors increase support burden
    mitigation:
      - Error message templates
      - Include context and suggestions
      - i18n for all error messages
    testing_priority: 3
    coverage_target: 70%
    test_types: [unit, manual]
    gate_enforcement: major

mitigation_strategies:
  technical:
    - Input validation and sanitization
    - Schema validation (JSON Schema, YAML)
    - Error handling with recovery
    - Atomic operations (state writes)
    - Rollback mechanisms (mode transitions, migrations)
    - Backup strategies (pre-upgrade, pre-migration)
    - Security measures (path validation, permission checks)

  process:
    - Code review (all critical/high risk changes)
    - Pair programming (complex logic)
    - Manual testing (critical workflows)
    - Staged rollouts (canary releases)
    - Beta testing (early adopters)

  monitoring:
    - Health checks (npx chati-dev health)
    - Error logging (structured logs)
    - User feedback (issue templates)
    - Metrics (usage analytics, error rates)

testing_priorities:
  priority_1_critical:
    risk_levels: [critical]
    coverage_target: "90-95%"
    test_types: [unit, integration, e2e, security, error_injection]
    gate_enforcement: blocker
    features:
      - Mode transition validation
      - session.yaml write operations
      - Concurrent state access
      - File write with permissions
      - Version migration execution

  priority_2_high:
    risk_levels: [high]
    coverage_target: "80-85%"
    test_types: [unit, integration, regression]
    gate_enforcement: critical
    features:
      - Agent routing logic
      - Deviation protocol handling
      - State consistency validation
      - Path traversal prevention
      - Task definition loading
      - Agent handoff validation
      - config.yaml parsing
      - Backup and restore
      - Error recovery strategies

  priority_3_medium:
    risk_levels: [medium]
    coverage_target: "70-75%"
    test_types: [unit, integration, spot_checks]
    gate_enforcement: major
    features:
      - File read error handling
      - Agent self-validation
      - Command argument parsing
      - Config merging
      - Translation file loading
      - Version compatibility check
      - Error message clarity

  priority_4_low:
    risk_levels: [low]
    coverage_target: "60%"
    test_types: [unit, automated]
    gate_enforcement: minor
    features:
      - IDE detection
      - Locale detection

risk_acceptances:
  - risk: Third-party MCP tool failures
    justification: External dependencies, cannot control reliability
    residual_risk: Medium
    mitigation: Graceful error handling, retry logic, clear error messages
    monitoring: Log MCP errors, track failure rates
    review_date: quarterly

  - risk: IDE-specific behavior variations
    justification: 7 IDEs with different implementations
    residual_risk: Low
    mitigation: Test CLI contract, manual verification matrix
    monitoring: User-reported IDE issues
    review_date: per release

  - risk: Internationalization display edge cases
    justification: Terminal rendering varies by OS/terminal emulator
    residual_risk: Low
    mitigation: Manual testing on common terminals
    monitoring: User feedback
    review_date: per release

risk_evolution:
  early_phase:
    focus: [architecture risks, integration risks, state management]
    reassessment: after each major milestone

  mid_phase:
    focus: [regression risks, performance risks, error handling]
    reassessment: per sprint

  late_phase:
    focus: [upgrade risks, compatibility risks, edge cases]
    reassessment: before each release

  triggers:
    - Major refactor or architecture change
    - New external dependency added
    - Security incident or vulnerability
    - Significant user-reported issues

review_schedule:
  frequency: monthly
  participants: [qa-planning, architect, dev, devops]
  outputs: [updated risk-matrix.yaml, new test cases, updated coverage targets]

next_steps:
  - Consolidate all QA planning documents
  - Calculate overall QA plan score
  - Validate autonomous transition readiness (95% threshold)
```
