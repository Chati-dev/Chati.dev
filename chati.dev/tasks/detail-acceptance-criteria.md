---
id: detail-acceptance-criteria
agent: detail
trigger: detail-edge-case-analysis
phase: plan
requires_input: false
parallelizable: false
outputs: [acceptance-criteria.yaml]
handoff_to: detail-consolidate
autonomous_gate: true
criteria:
  - All functional requirements have Given-When-Then criteria
  - Edge cases incorporated into criteria
  - Testable acceptance scenarios defined
---
# Write Acceptance Criteria for All Requirements

## Purpose
Create comprehensive, testable Given-When-Then acceptance criteria for every functional requirement and edge case.

## Prerequisites
- `prd-draft.yaml` with FRs
- `edge-cases.yaml` with scenarios

## Steps

### 1. Load FRs and Edge Cases
Combine functional requirements with identified edge cases.

### 2. For Each Functional Requirement, Write Main Scenarios
Use Given-When-Then format:
- **Given**: Initial state/context
- **When**: User action or system event
- **Then**: Expected outcome

### 3. Add Happy Path Scenarios
Normal, expected user flow without errors.

### 4. Add Error Path Scenarios
From edge-cases.yaml, include failure scenarios.

### 5. Add Boundary Condition Scenarios
Test at min, max, below-min, above-max values.

### 6. Ensure Testability
Each criterion must be:
- Unambiguous (one clear interpretation)
- Testable (can verify pass/fail)
- Specific (not vague)
- Independent (not dependent on order)

### 7. Add Non-Functional Acceptance Criteria
Performance, security, usability criteria in testable format.

### 8. Link to UI Mockups
Reference screen names and elements.

### 9. Priority Tag Each Criterion
P0 (must-have), P1 (should-have), P2 (nice-to-have).

### 10. Generate Complete Acceptance Criteria Document
Comprehensive, ready for development and QA.

## Decision Points
None - systematic translation of requirements.

## Error Handling
- **Ambiguous FR**: Note ambiguity and provide best interpretation

## Output Format
```yaml
# acceptance-criteria.yaml
timestamp: 2026-02-13T15:30:00Z

FR-001-user-registration:
  happy_path:
    - scenario: Successful registration with valid inputs
      priority: P0
      given: |
        - User is on /register page
        - User is not authenticated
        - Email "newuser@example.com" does not exist in database
      when: |
        User fills in:
        - Email: newuser@example.com
        - Password: ValidPass123
        And clicks "Register" button
      then: |
        - HTTP 201 Created response received
        - User account created in database with hashed password
        - JWT token returned in response
        - Token stored in localStorage
        - User redirected to /dashboard
        - Success message displayed: "Welcome! Your account has been created."
      test_type: [integration, e2e]

  error_paths:
    - scenario: Registration with existing email
      priority: P0
      given: |
        - User is on /register page
        - Email "existing@example.com" already exists in database
      when: |
        User submits form with:
        - Email: existing@example.com
        - Password: ValidPass123
      then: |
        - HTTP 409 Conflict response
        - Error message displayed: "Email already registered"
        - Form remains filled (password cleared for security)
        - User remains on /register page
        - No account created
      test_type: [integration, e2e]

    - scenario: Registration with weak password
      priority: P0
      given: User is on /register page
      when: |
        User submits form with:
        - Email: newuser@example.com
        - Password: weak (no uppercase, no number)
      then: |
        - HTTP 400 Bad Request response
        - Error message: "Password must contain at least 1 uppercase letter and 1 number"
        - Password requirements shown
        - Form not submitted
      test_type: [unit, integration]

    - scenario: Registration with invalid email format
      priority: P0
      given: User is on /register page
      when: |
        User submits form with:
        - Email: not-an-email
        - Password: ValidPass123
      then: |
        - HTTP 400 Bad Request response
        - Error message: "Invalid email format"
        - Form not submitted
      test_type: [unit, integration]

  boundary_conditions:
    - scenario: Registration with minimum valid password (8 chars)
      priority: P1
      given: User is on /register page
      when: |
        User submits:
        - Email: test@example.com
        - Password: Abcd123! (exactly 8 chars)
      then: |
        - Registration succeeds
        - Account created
      test_type: [unit]

    - scenario: Registration with password below minimum (7 chars)
      priority: P1
      given: User is on /register page
      when: |
        User submits password with 7 characters
      then: |
        - HTTP 400 error
        - Error: "Password must be at least 8 characters"
      test_type: [unit]

    - scenario: Registration with maximum password length (256 chars)
      priority: P2
      given: User is on /register page
      when: User submits 256-character password
      then: Registration succeeds
      test_type: [unit]

    - scenario: Registration with excessive password length (300 chars)
      priority: P2
      given: User is on /register page
      when: User submits 300-character password
      then: |
        - HTTP 400 error
        - Error: "Password exceeds maximum length (256 characters)"
      test_type: [unit]

  security:
    - scenario: SQL injection attempt in email field
      priority: P0
      given: User is on /register page
      when: |
        User submits:
        - Email: admin'--
        - Password: ValidPass123
      then: |
        - Parameterized query prevents injection
        - Email validation rejects format
        - HTTP 400 error
        - No database compromise
      test_type: [security]

    - scenario: Password is hashed before storage
      priority: P0
      given: User registers successfully
      when: Account created in database
      then: |
        - Password stored as bcrypt hash
        - Original password not in database
        - Hash starts with "$2b$12$" (bcrypt signature)
      test_type: [integration]

  ui_behavior:
    - scenario: Real-time password strength indicator
      priority: P1
      given: User is on /register page
      when: User types password in password field
      then: |
        - Password strength indicator updates in real-time
        - Shows "Weak", "Medium", or "Strong"
        - Displays which requirements are met/unmet
      test_type: [e2e]

    - scenario: Form validation on blur
      priority: P1
      given: User is on /register page
      when: User enters invalid email and moves to password field (blur)
      then: |
        - Email validation error shown immediately
        - Error visible before form submission
      test_type: [e2e]

FR-003-create-post:
  happy_path:
    - scenario: Create post with title, content, and tags
      priority: P0
      given: |
        - User is authenticated
        - User is on /posts/new page
      when: |
        User fills in:
        - Title: "My First Post"
        - Content: "This is the content..."
        - Tags: ["technology", "tutorial"]
        And clicks "Publish"
      then: |
        - HTTP 201 Created
        - Post created in database with:
          - user_id = current user
          - published_at = current timestamp
        - User redirected to /posts/:new_post_id
        - Success message: "Post published successfully"
      test_type: [integration, e2e]

  error_paths:
    - scenario: Create post without title
      priority: P0
      given: User is on /posts/new
      when: |
        User submits:
        - Title: "" (empty)
        - Content: "Content here"
      then: |
        - HTTP 400 error
        - Error: "Title is required"
        - Post not created
      test_type: [integration]

    - scenario: Unauthenticated user tries to create post
      priority: P0
      given: User is not authenticated
      when: User sends POST /api/posts
      then: |
        - HTTP 401 Unauthorized
        - Error: "Authentication required"
        - Post not created
      test_type: [integration]

    - scenario: Upload image exceeding 5MB
      priority: P0
      given: User is creating post
      when: User uploads 6MB image
      then: |
        - HTTP 413 Payload Too Large
        - Error: "Image must be smaller than 5MB"
        - Image not uploaded
      test_type: [integration]

  boundary_conditions:
    - scenario: Title at maximum length (200 chars)
      priority: P1
      given: User is creating post
      when: User submits 200-character title
      then: Post created successfully
      test_type: [integration]

    - scenario: Title exceeding maximum (201 chars)
      priority: P1
      given: User is creating post
      when: User submits 201-character title
      then: |
        - HTTP 400 error
        - Error: "Title must be 200 characters or less"
      test_type: [integration]

NFR-PERF-001-api-response-time:
  acceptance_criteria:
    - scenario: API response time under normal load
      priority: P0
      given: System under normal load (<1000 concurrent users)
      when: API endpoint is called (GET /api/posts)
      then: |
        - p50 response time < 200ms
        - p95 response time < 500ms
        - p99 response time < 1000ms
      test_type: [performance]
      measurement: Load testing with k6 or JMeter

    - scenario: API response time under high load
      priority: P1
      given: System under high load (5000-10000 concurrent users)
      when: API endpoint is called
      then: |
        - p50 response time < 300ms
        - p95 response time < 1000ms
        - No 5xx errors
      test_type: [performance]

NFR-SEC-001-https:
  acceptance_criteria:
    - scenario: All HTTP requests redirected to HTTPS
      priority: P0
      given: Server is running
      when: Client makes HTTP request to http://example.com/any-path
      then: |
        - HTTP 301 Moved Permanently response
        - Location header points to https://example.com/any-path
        - Client automatically redirected
      test_type: [integration]

    - scenario: HSTS header present
      priority: P1
      given: Server is running
      when: Client makes HTTPS request
      then: |
        - Strict-Transport-Security header present
        - max-age=31536000 (1 year)
      test_type: [integration]

test_coverage_requirements:
  unit_tests:
    - All validation functions (email, password, title, etc.)
    - Business logic (post creation, user registration)
    - Utility functions (password hashing, JWT generation)
    target_coverage: 90%
  integration_tests:
    - All API endpoints (success and error paths)
    - Database operations (CRUD, constraints)
    - Authentication middleware
    target_coverage: 80%
  e2e_tests:
    - Critical user flows (register → login → create post → view post)
    - Search functionality
    - Error handling (network errors, validation)
    target_coverage: Key user journeys

definition_of_done:
  - All P0 acceptance criteria passing
  - All P1 acceptance criteria passing or explicitly deferred
  - Code reviewed and approved
  - Unit test coverage >90%
  - Integration tests passing
  - E2E tests for critical paths passing
  - Security tests passing (no SQL injection, XSS)
  - Performance tests meeting NFRs
  - Documentation updated (API docs, README)
  - Deployed to staging and validated
  - Product Owner sign-off
```
