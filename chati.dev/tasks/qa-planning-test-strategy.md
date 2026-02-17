---
id: qa-planning-test-strategy
agent: qa-planning
trigger: orchestrator
phase: plan
requires_input: false
parallelizable: false
outputs: [test-strategy.yaml]
handoff_to: qa-planning-gate-define
autonomous_gate: false
criteria:
  - Test coverage plan defined for all layers
  - Risk areas identified and prioritized
  - Testing pyramid structure established
---

# Test Strategy

## Purpose
Define a comprehensive testing strategy covering unit, integration, end-to-end, and manual testing approaches tailored to the project's architecture and risk profile.

## Prerequisites
- Project brief and detail documents available
- Architecture document defining system components
- Phase plan showing implementation timeline
- Task breakdown with complexity estimates

## Steps

1. **Analyze System Architecture**
   - Review the architecture document to identify all system layers (CLI, agents, orchestrator, state management, file operations)
   - Map component dependencies and interaction points
   - Identify external integrations (MCPs, IDEs, package managers)
   - Document stateful vs stateless components

2. **Establish Testing Pyramid**
   - Define unit test coverage targets (70-80% for core logic)
   - Plan integration test scenarios (agent workflows, file operations, state transitions)
   - Identify end-to-end test cases (full pipeline runs from /chati to handoff)
   - Determine manual testing scope (IDE integration, i18n verification)

3. **Categorize Test Types**
   - **Unit Tests**: Pure functions, validators, parsers, formatters
   - **Integration Tests**: Agent task execution, file I/O, YAML parsing/writing
   - **Contract Tests**: MCP interfaces, CLI command structures
   - **End-to-End Tests**: Complete user workflows (greenfield, brownfield)
   - **Manual Tests**: IDE compatibility, internationalization, accessibility

4. **Identify Risk Areas**
   - State management corruption (session.yaml consistency)
   - File system operations (permissions, race conditions)
   - Agent handoff logic (transition validation)
   - Mode governance enforcement (unauthorized transitions)
   - Multi-language support (i18n edge cases)
   - Upgrade/migration scenarios (data preservation)

5. **Define Testing Tools and Frameworks**
   - Unit/Integration: Specify framework (Jest, Vitest, Mocha)
   - E2E: Define approach (custom scripts, snapshot testing)
   - SAST: Select static analysis tools
   - Performance: Identify benchmarking tools
   - Coverage: Configure threshold enforcement

6. **Plan Test Data Strategy**
   - Create fixture templates for session states
   - Define mock responses for MCP tools
   - Establish test project configurations
   - Document data cleanup procedures

7. **Establish Test Environments**
   - **Local Development**: Developer machines with IDE integration
   - **CI/CD**: Automated pipeline execution environment
   - **Isolation**: Sandboxed file system for destructive tests
   - **Matrix**: Multi-IDE, multi-OS compatibility testing

8. **Define Test Execution Order**
   - Pre-commit: Unit tests + linting
   - Pre-push: Integration tests
   - CI: Full suite + SAST + performance
   - Release: E2E + manual smoke tests

9. **Plan for Non-Functional Testing**
   - Performance: CLI startup time, agent response time
   - Security: Input validation, path traversal prevention
   - Reliability: Error recovery, graceful degradation
   - Usability: Error message clarity, help text accuracy

10. **Document Testing Standards**
    - Code coverage minimums by component type
    - Test naming conventions
    - Assertion best practices
    - Mock/stub usage guidelines

11. **Create Test Strategy Document**
    - Compile all findings into test-strategy.yaml
    - Include rationale for each decision
    - Map test types to risk levels
    - Provide timeline for test implementation

12. **Validate Completeness**
    - Ensure all architecture components have test coverage
    - Verify all risk areas are addressed
    - Confirm testing pyramid is balanced
    - Check alignment with quality gates (preview next task)

## Decision Points

- **Test Framework Selection**: If project dependencies already include a testing framework, align with existing tooling. Otherwise, recommend based on project type (TypeScript → Vitest/Jest).

- **E2E Scope**: For complex multi-agent workflows, determine if full pipeline E2E tests should be snapshot-based or behavior-based.

- **Manual Test Coverage**: Assess whether IDE compatibility requires manual testing or can be automated through headless IDE APIs.

## Error Handling

**Missing Architecture Document**
- Request architecture completion before proceeding
- Cannot define test strategy without system component map
- Escalate to orchestrator for dependency resolution

**Unclear Risk Profile**
- Review brief/detail documents for business-critical features
- Default to high-risk classification for state management, file operations
- Document assumptions and flag for review

**Tool Compatibility Issues**
- If selected test frameworks conflict with project dependencies, provide alternatives
- Document trade-offs in test-strategy.yaml
- Suggest resolution path to orchestrator

## Output Format

```yaml
# test-strategy.yaml
version: 1.0.0
created: YYYY-MM-DD
agent: qa-planning

testing_pyramid:
  unit:
    target_coverage: 75%
    tools: [vitest]
    scope:
      - Pure functions in validators/
      - Parsers and formatters
      - State management utilities

  integration:
    target_coverage: 60%
    tools: [vitest]
    scope:
      - Agent task execution
      - File I/O operations
      - YAML state persistence

  e2e:
    target_coverage: critical_paths
    approach: snapshot-based
    scope:
      - Complete greenfield workflow
      - Complete brownfield workflow
      - Mode transition scenarios

  manual:
    scope:
      - IDE compatibility (7 IDEs)
      - i18n verification (4 languages)
      - Accessibility audit

risk_areas:
  critical:
    - State corruption in session.yaml
    - Mode governance bypass
    - File system race conditions
  high:
    - Agent handoff validation
    - MCP integration failures
    - Upgrade migration errors
  medium:
    - i18n edge cases
    - CLI argument parsing
    - Error message clarity

tools:
  unit_integration: vitest
  sast: eslint-plugin-security
  performance: hyperfine
  coverage: c8

environments:
  local:
    isolation: true
    cleanup: automatic
  ci:
    matrix:
      node: [18, 20, 22]
      os: [ubuntu, macos, windows]

execution_order:
  pre_commit: [unit, lint]
  pre_push: [integration]
  ci: [unit, integration, sast, performance]
  release: [e2e, manual_smoke]

standards:
  coverage_minimum:
    global: 70%
    core_logic: 80%
    utilities: 60%
  naming_convention: describe-it-BDD
  mock_strategy: prefer-test-doubles

next_steps:
  - Define quality gates and thresholds
  - Create detailed coverage plan per module
  - Build risk matrix mapping
```
