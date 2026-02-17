---
id: qa-planning-coverage-plan
agent: qa-planning
trigger: qa-planning-gate-define
phase: plan
requires_input: false
parallelizable: false
outputs: [coverage-plan.yaml]
handoff_to: qa-planning-risk-matrix
autonomous_gate: false
criteria:
  - Coverage targets set for all modules
  - Target justifications documented
  - Measurement approach defined
---

# Test Coverage Planning

## Purpose
Create a detailed test coverage plan with specific targets for each module, component, and layer of the chati.dev system, aligned with risk levels and quality gates.

## Prerequisites
- test-strategy.yaml defining overall testing approach
- quality-gates.yaml with coverage thresholds
- Architecture document showing system structure
- Task breakdown identifying all components

## Steps

1. **Map System Architecture to Testable Units**
   - Identify all modules: orchestrator, agents (13), state management, file operations, CLI, validators, parsers
   - List core utilities: YAML handlers, i18n, error handling, logging
   - Note external interfaces: MCP tools, IDE integration, package managers
   - Document data structures: session.yaml schema, config.yaml, task definitions

2. **Categorize Components by Testability**
   - **High Testability**: Pure functions (validators, parsers, formatters, calculators)
   - **Medium Testability**: Stateful components (agent task execution, state management)
   - **Low Testability**: External dependencies (MCP calls, file system operations, IDE interactions)
   - **Manual Only**: UI/UX (TUI dashboard, color rendering, i18n display)

3. **Define Coverage Targets by Layer**
   - **Core Logic Layer**: 80-90% (business rules, validation, state transitions)
   - **Service Layer**: 70-80% (agent orchestration, task execution, file operations)
   - **Integration Layer**: 60-70% (MCP interfaces, CLI commands, external tools)
   - **Presentation Layer**: 40-50% (formatting, rendering, i18n output)

4. **Set Module-Specific Targets**
   - **Orchestrator**: 85% (critical routing and mode governance logic)
   - **State Management**: 90% (session.yaml read/write, consistency checks)
   - **Agent Task Execution**: 75% (task loading, validation, execution)
   - **File Operations**: 80% (read/write/create, permission handling, error recovery)
   - **Validators**: 90% (schema validation, input sanitization)
   - **Parsers**: 85% (YAML parsing, frontmatter extraction, template rendering)
   - **CLI**: 70% (argument parsing, command routing, help generation)
   - **i18n**: 60% (translation loading, locale handling; manual testing for display)
   - **Error Handling**: 75% (error construction, formatting, recovery)

5. **Identify Coverage Measurement Approach**
   - **Line Coverage**: Primary metric, tracks executed lines
   - **Branch Coverage**: Secondary metric for conditional logic
   - **Function Coverage**: Ensures all exported functions tested
   - **Statement Coverage**: Granular metric for complex expressions
   - **Tool**: c8 (Istanbul-based coverage for Node.js)

6. **Plan for Hard-to-Test Areas**
   - **File System Operations**: Use temporary directories and mock fs module
   - **MCP Tool Calls**: Mock tool responses with fixture data
   - **IDE Integration**: Test CLI contract, manual verification of IDE behavior
   - **Process Exit/Signals**: Mock process object, test exit code logic
   - **Async Operations**: Use async/await test patterns, avoid timing dependencies

7. **Define Uncovered Areas (Explicitly Excluded)**
   - **Third-Party Dependencies**: Coverage tracked in dependencies' own tests
   - **Generated Code**: Auto-generated files excluded from coverage
   - **Prototype/Experimental**: Features flagged as experimental excluded until stable
   - **Deprecated Code**: Legacy code marked for removal excluded

8. **Establish Coverage Baselines**
   - **Initial Baseline**: Measure current coverage (if brownfield) or set 0% (if greenfield)
   - **Phase Targets**: Define incremental improvement goals (e.g., +5% per phase)
   - **Release Targets**: Set minimum coverage for each release milestone
   - **Maintenance Target**: Steady-state coverage after initial development (e.g., 75%)

9. **Plan Coverage Enforcement**
   - **Pre-Commit**: Prevent commits that reduce coverage below threshold
   - **CI Pipeline**: Fail build if coverage drops below gate threshold
   - **PR Checks**: Require new code to meet higher coverage bar (80%)
   - **Reporting**: Generate coverage reports in CI, publish to artifact storage

10. **Define Coverage Exceptions Process**
    - **Justification Required**: Why coverage target cannot be met
    - **Alternative Validation**: How quality is ensured without coverage (e.g., manual testing)
    - **Approval**: Who approves exception (tech lead, QA lead)
    - **Review Cadence**: When exception is revisited (quarterly)

11. **Create Coverage Improvement Roadmap**
    - **Phase 1 (Installer)**: 70% target (focus on CLI and validation logic)
    - **Phase 2-4 (Core Agents)**: 75% target (add agent task execution tests)
    - **Phase 5-6 (Quality/Build)**: 80% target (comprehensive integration tests)
    - **Phase 7-8 (Deploy/Validate)**: 85% target (full pipeline coverage)

12. **Compile Coverage Plan Document**
    - List all modules with specific targets
    - Document measurement approach and tooling
    - Include exceptions and justifications
    - Map to quality gates and risk levels

## Decision Points

- **Target Adjustment for Legacy Code**: If brownfield project has existing low coverage, set realistic incremental targets rather than immediate 80% requirement. Example: 40% current → 50% Phase 1 → 60% Phase 2 → 70% Phase 3.

- **Integration Test Coverage**: For external dependencies (MCPs, file system), decide between mocking (higher coverage, less realistic) vs real integration (lower coverage, more realistic). Recommend hybrid: unit tests with mocks, separate integration tests with real dependencies.

- **Coverage vs Quality Trade-off**: High coverage doesn't guarantee quality. If team debates target strictness, emphasize meaningful tests over coverage percentage. Document agreement in coverage-plan.yaml.

## Error Handling

**Missing Architecture Details**
- If architecture document lacks module boundaries, use best judgment based on file structure
- Document assumptions and flag for architect review
- Propose default targets (75% for unclear modules)

**Conflicting Quality Gate Thresholds**
- If quality-gates.yaml specifies 70% global but risk areas need 90%, document per-module targets
- Ensure weighted average meets global threshold
- Escalate if unresolvable conflict

**Tool Limitations**
- If coverage tool cannot measure certain code patterns (e.g., dynamic imports), document limitation
- Propose alternative validation (manual code review, runtime monitoring)
- Exclude unmeasurable code from coverage calculation with justification

## Output Format

```yaml
# coverage-plan.yaml
version: 1.0.0
created: YYYY-MM-DD
agent: qa-planning

global_targets:
  overall: 75%
  new_code: 80%
  core_logic: 85%
  baseline: 0% # greenfield project

measurement:
  tool: c8
  metrics:
    primary: line_coverage
    secondary: [branch_coverage, function_coverage]
  enforcement:
    pre_commit: true
    ci_pipeline: true
    pr_check: true
  reporting:
    format: [html, json, lcov]
    artifact_storage: .coverage/

modules:
  orchestrator:
    target: 85%
    justification: Critical routing and mode governance logic
    risk_level: critical
    files:
      - chati.dev/orchestrator.js
      - chati.dev/mode-governance.js
      - chati.dev/orchestrator/chati.md
    hard_to_test:
      - IDE detection: mock process.env and fs
      - User prompts: mock readline interface

  state_management:
    target: 90%
    justification: State corruption is critical risk
    risk_level: critical
    files:
      - chati.dev/state/session-manager.js
      - chati.dev/state/validators.js
      - chati.dev/state/consistency-checker.js
    hard_to_test:
      - File system race conditions: use temporary directories
      - Concurrent access: test with multiple async operations

  agents:
    target: 75%
    justification: Task execution logic with external dependencies
    risk_level: high
    files:
      - chati.dev/agents/*.js
      - chati.dev/tasks/*.md (loaded dynamically)
    hard_to_test:
      - MCP tool calls: mock tool responses
      - File writes: use temporary directories
      - User input: mock readline

  file_operations:
    target: 80%
    justification: File I/O errors are high risk
    risk_level: high
    files:
      - chati.dev/utils/file-ops.js
      - chati.dev/utils/yaml-handler.js
    hard_to_test:
      - Permission errors: mock fs with error injection
      - Path traversal: test with malicious paths

  validators:
    target: 90%
    justification: Pure functions, highly testable
    risk_level: high
    files:
      - chati.dev/validators/*.js
    hard_to_test: []

  parsers:
    target: 85%
    justification: Parsing errors can corrupt workflow
    risk_level: high
    files:
      - chati.dev/parsers/yaml-parser.js
      - chati.dev/parsers/frontmatter.js
      - chati.dev/parsers/template-renderer.js
    hard_to_test:
      - Malformed YAML: test with edge cases

  cli:
    target: 70%
    justification: Argument parsing with many edge cases
    risk_level: medium
    files:
      - chati.dev/cli/index.js
      - chati.dev/cli/commands/*.js
    hard_to_test:
      - Process exit: mock process.exit
      - Signal handling: mock process signals

  i18n:
    target: 60%
    justification: Translation loading testable, display manual
    risk_level: medium
    files:
      - chati.dev/i18n/loader.js
      - chati.dev/i18n/translations/*.json
    hard_to_test:
      - Terminal rendering: manual verification
      - Locale detection: mock process.env.LANG

  error_handling:
    target: 75%
    justification: Error construction and formatting logic
    risk_level: medium
    files:
      - chati.dev/errors/*.js
    hard_to_test:
      - Stack trace formatting: test with real errors

  utilities:
    target: 80%
    justification: Shared utilities with broad usage
    risk_level: medium
    files:
      - chati.dev/utils/*.js (excluding file-ops.js)
    hard_to_test: []

excluded:
  - "node_modules/**"
  - "**/*.test.js"
  - "**/*.spec.js"
  - "**/fixtures/**"
  - "**/mocks/**"
  - "build/**"
  - "dist/**"

exceptions:
  - module: IDE integration
    reason: Requires live IDE environment
    alternative: Manual testing with 7 IDE compatibility matrix
    approved_by: QA Lead
    review_date: quarterly

  - module: TUI dashboard
    reason: Visual rendering difficult to test
    alternative: Snapshot tests for text output, manual visual verification
    approved_by: Tech Lead
    review_date: quarterly

baselines:
  phase_1: 70%
  phase_2: 75%
  phase_3: 80%
  release_1.0: 75%
  maintenance: 75%

improvement_roadmap:
  phase_0_installer:
    target: 70%
    focus: [cli, validators, file_operations]

  phase_1_3_agents:
    target: 75%
    focus: [orchestrator, agents, state_management]

  phase_4_5_quality:
    target: 80%
    focus: [integration tests, error_handling]

  phase_6_7_deploy:
    target: 85%
    focus: [full pipeline coverage, edge cases]

hard_to_test_strategies:
  file_system:
    approach: Temporary directories + mock fs
    example: "Use tmp package for isolated test directories"

  mcp_tools:
    approach: Mock tool responses with fixtures
    example: "Create fixtures/mcp-responses/*.json for each tool"

  ide_integration:
    approach: Test CLI contract, manual IDE verification
    example: "Test npx chati-dev command output, verify in 7 IDEs"

  async_operations:
    approach: async/await test patterns
    example: "Use async test functions, avoid setTimeout"

  process_lifecycle:
    approach: Mock process object
    example: "Mock process.exit, process.on('SIGINT')"

next_steps:
  - Build risk matrix mapping features to coverage targets
  - Validate coverage targets against timeline
  - Begin test implementation in high-risk modules
```
