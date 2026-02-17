---
id: tasks-acceptance-write
agent: tasks
trigger: tasks-estimate
phase: plan
requires_input: false
parallelizable: false
outputs: [task-criteria.yaml]
handoff_to: tasks-consolidate
autonomous_gate: true
criteria:
  - Each task has clear acceptance criteria
  - Definition of done specified
  - Test requirements defined
---
# Write Acceptance Criteria for Tasks

## Purpose
Define specific, testable acceptance criteria for each development task.

## Steps

### 1. For Each Task, Define
- What must be implemented
- How to verify completion
- What tests are required
- Definition of done

### 2. Make Criteria Specific
Not: "Registration works"
But: "User can submit valid email and password, account is created in database, JWT returned, user redirected to dashboard"

### 3. Include Test Requirements
- Unit tests: What functions/methods need coverage
- Integration tests: What API endpoints need testing
- E2E tests: What user flows need automation

### 4. Define Definition of Done
Standard checklist for all tasks:
- Code written and reviewed
- Tests written and passing
- Documentation updated
- No linting errors
- Deployed to dev environment

## Output Format
```yaml
# task-criteria.yaml
task_criteria:
  - task_id: TASK-002
    acceptance_criteria:
      - POST /api/auth/register endpoint created
      - Accepts email and password in request body
      - Validates email format and password strength
      - Returns 400 if validation fails with specific errors
      - Returns 409 if email already exists
      - Returns 201 with user object and JWT on success
      - Password is hashed with bcrypt before storage
    test_requirements:
      unit_tests:
        - Test email validation function
        - Test password validation function
        - Test password hashing
      integration_tests:
        - Test successful registration
        - Test duplicate email rejection
        - Test invalid input validation
    definition_of_done:
      - Code written
      - Unit tests passing (>90% coverage)
      - Integration tests passing
      - Code reviewed and approved
      - API documented in OpenAPI spec
      - Merged to main branch
```
