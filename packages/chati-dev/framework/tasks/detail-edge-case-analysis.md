---
id: detail-edge-case-analysis
agent: detail
trigger: detail-nfr-extraction
phase: plan
requires_input: false
parallelizable: true
outputs: [edge-cases.yaml]
handoff_to: detail-acceptance-criteria
autonomous_gate: true
criteria:
  - Edge cases identified for all critical features
  - Error scenarios documented
  - Boundary conditions defined
---
# Analyze Edge Cases and Error Scenarios

## Purpose
Identify edge cases, error scenarios, and boundary conditions that must be handled for robust implementation.

## Prerequisites
- `prd-draft.yaml` with functional requirements

## Steps

### 1. Analyze Each Functional Requirement
For each FR, identify potential edge cases.

### 2. Identify Input Boundary Conditions
- Empty input (empty string, null, undefined)
- Max length exceeded
- Invalid format (malformed email, weak password)
- Special characters (SQL, XSS, Unicode)
- Very large input (10MB text, huge arrays)

### 3. Identify State Edge Cases
- User not logged in attempts protected action
- User tries to edit others' posts
- Concurrent edits to same post
- Deleted resource accessed
- Expired JWT token

### 4. Identify Timing Edge Cases
- Rapid successive requests (double submit)
- Long-running operations timeout
- Race conditions in parallel operations
- Token expires mid-operation

### 5. Identify Network Edge Cases
- API request fails mid-flight
- Slow network (3G, offline)
- Partial response received
- WebSocket disconnection

### 6. Identify Data Edge Cases
- Foreign key constraints violated
- Unique constraint violations
- Database connection pool exhausted
- Transaction deadlock
- Cascading deletes

### 7. Document Error Scenarios
For each edge case:
- Scenario description
- Expected behavior
- Error message
- User impact
- Recovery strategy

### 8. Define Boundary Conditions
For numerical/string limits:
- Minimum and maximum values
- What happens at boundaries
- What happens beyond boundaries

### 9. Identify Security Edge Cases
- Injection attempts (SQL, XSS, command injection)
- Authorization bypass attempts
- Token manipulation
- Brute force attacks
- Mass assignment vulnerabilities

### 10. Create Edge Case Catalog
Comprehensive list with test scenarios.

## Decision Points
None - systematic analysis of all features.

## Error Handling
- **Too Many Edge Cases**: Prioritize by severity and likelihood

## Output Format
```yaml
# edge-cases.yaml
timestamp: 2026-02-13T15:15:00Z

authentication_edge_cases:
  - scenario: User submits empty email
    input: {email: "", password: "Valid123"}
    expected_behavior: Validation error, form not submitted
    error_message: "Email is required"
    http_status: 400
  - scenario: User submits malformed email
    input: {email: "not-an-email", password: "Valid123"}
    expected_behavior: Validation error
    error_message: "Invalid email format"
    http_status: 400
  - scenario: Password with only lowercase
    input: {email: "test@example.com", password: "alllowercase123"}
    expected_behavior: Validation error
    error_message: "Password must contain at least one uppercase letter"
    http_status: 400
  - scenario: Extremely long password (>1000 chars)
    input: {email: "test@example.com", password: "A1" + "x"*1000}
    expected_behavior: Accept but truncate or reject with max length
    error_message: "Password exceeds maximum length (256 characters)"
    http_status: 400
  - scenario: SQL injection attempt in email
    input: {email: "admin'--", password: "Valid123"}
    expected_behavior: Parameterized query prevents injection, email validation fails
    error_message: "Invalid email format"
    http_status: 400
  - scenario: Concurrent registration with same email
    input: Two users submit same email simultaneously
    expected_behavior: First succeeds, second fails with duplicate email error
    error_message: "Email already registered"
    http_status: 409
  - scenario: JWT token expired
    input: Request with expired token
    expected_behavior: 401 error, redirect to login, clear token
    error_message: "Session expired, please log in again"
    http_status: 401

post_management_edge_cases:
  - scenario: Create post with empty title
    input: {title: "", content: "Content"}
    expected_behavior: Validation error
    error_message: "Title is required"
    http_status: 400
  - scenario: Title exceeds 200 characters
    input: {title: "x"*201, content: "Content"}
    expected_behavior: Validation error
    error_message: "Title must be 200 characters or less"
    http_status: 400
  - scenario: Create post with XSS attempt in content
    input: {title: "Test", content: "<script>alert('xss')</script>"}
    expected_behavior: Content sanitized before storage and display
    error_message: None (sanitized silently)
  - scenario: Upload image >5MB
    input: Image file of 6MB
    expected_behavior: Upload rejected
    error_message: "Image must be smaller than 5MB"
    http_status: 413
  - scenario: Upload non-image file
    input: .exe file
    expected_behavior: Upload rejected
    error_message: "Only JPG and PNG images are allowed"
    http_status: 400
  - scenario: User tries to edit another user's post
    input: PUT /api/posts/:id where post.user_id != current_user.id
    expected_behavior: 403 Forbidden
    error_message: "You don't have permission to edit this post"
    http_status: 403
  - scenario: User tries to delete non-existent post
    input: DELETE /api/posts/invalid-uuid
    expected_behavior: 404 Not Found
    error_message: "Post not found"
    http_status: 404
  - scenario: Concurrent edits to same post
    input: Two users edit same post simultaneously
    expected_behavior: Last write wins (simple approach) or optimistic locking (advanced)
    mitigation: Show warning if post was modified since user loaded it
  - scenario: Create post with 1000 tags
    input: {title: "Test", content: "Content", tags: ["tag1", "tag2", ..., "tag1000"]}
    expected_behavior: Accept but limit to first 20 tags
    error_message: "Maximum 20 tags allowed"
    http_status: 400

search_edge_cases:
  - scenario: Search with empty query
    input: GET /api/search?q=
    expected_behavior: Return all posts (paginated) or require non-empty query
    response: All posts or 400 error
  - scenario: Search with special characters
    input: GET /api/search?q=%#@!
    expected_behavior: Escape special characters, perform search
    response: Empty results or posts matching literal characters
  - scenario: Search with extremely long query (>1000 chars)
    input: GET /api/search?q=x*1000
    expected_behavior: Truncate to reasonable length (256 chars) or reject
    error_message: "Search query too long"
    http_status: 400
  - scenario: Search returns 10,000 results
    input: GET /api/search?q=common-word
    expected_behavior: Paginate results, return first page
    response: 20 results + pagination metadata
  - scenario: Search with SQL injection attempt
    input: GET /api/search?q=' OR '1'='1
    expected_behavior: Parameterized query or full-text search prevents injection
    response: Empty results or posts matching literal string

network_edge_cases:
  - scenario: API request timeout (>30s)
    expected_behavior: Client shows timeout error, allows retry
    user_impact: Temporary inability to complete action
    recovery: Retry button, exponential backoff
  - scenario: Request fails mid-flight
    expected_behavior: Client detects network error, offers retry
    user_impact: Action not completed
    recovery: Auto-retry up to 3 times, then manual retry
  - scenario: User goes offline mid-form
    expected_behavior: Form data preserved in localStorage
    user_impact: Work not lost
    recovery: Auto-submit when online again (with user confirmation)
  - scenario: Partial response received
    expected_behavior: Detect incomplete JSON, treat as error
    recovery: Retry request

database_edge_cases:
  - scenario: Database connection pool exhausted
    expected_behavior: New requests wait or fail with 503
    error_message: "Service temporarily unavailable, please try again"
    http_status: 503
    mitigation: Connection pooling with reasonable limits, monitoring
  - scenario: Unique constraint violation (duplicate email race condition)
    expected_behavior: Database rejects insert, return 409
    error_message: "Email already registered"
    http_status: 409
  - scenario: Foreign key constraint violation (delete user with posts)
    expected_behavior: Cascade delete posts or prevent user deletion
    implementation: CASCADE on foreign key or check before delete
  - scenario: Transaction deadlock
    expected_behavior: Database rolls back one transaction, retry
    mitigation: Keep transactions short, retry with exponential backoff

security_edge_cases:
  - scenario: Mass assignment attempt
    input: POST /api/users with {email, password, is_admin: true}
    expected_behavior: is_admin field ignored
    implementation: Explicitly whitelist allowed fields
  - scenario: Brute force password attempts
    expected_behavior: Rate limit to 5 attempts per 15 minutes
    error_message: "Too many login attempts, please try again in 15 minutes"
    http_status: 429
  - scenario: JWT token tampered with
    expected_behavior: Signature verification fails, 401 error
    error_message: "Invalid authentication token"
    http_status: 401
  - scenario: User changes email in token to impersonate another
    expected_behavior: Signature verification fails
    security_control: JWT signature validation

boundary_conditions:
  - field: title
    type: string
    min_length: 1
    max_length: 200
    at_min: Accepted (1 char title)
    at_max: Accepted (200 char title)
    below_min: Rejected (empty string)
    above_max: Rejected (201+ chars)
  - field: password
    type: string
    min_length: 8
    max_length: 256
    pattern: At least 1 uppercase, 1 lowercase, 1 number
    at_min: Accepted if meets pattern
    at_max: Accepted
    below_min: Rejected (<8 chars)
    above_max: Rejected (>256 chars)
  - field: image_size
    type: file
    max_size: 5242880 (5MB)
    at_max: Accepted (exactly 5MB)
    above_max: Rejected (>5MB)
  - field: pagination_limit
    type: integer
    min: 1
    max: 100
    default: 20
    at_min: Return 1 result
    at_max: Return 100 results
    below_min: Use default (20)
    above_max: Use max (100)
  - field: concurrent_users
    type: system_load
    target: 10000
    at_target: System performs normally
    above_target: Graceful degradation, may slow down but not crash

testing_scenarios:
  - Create post with boundary title lengths (0, 1, 200, 201 chars)
  - Register with various invalid emails
  - Upload files of various types and sizes
  - Attempt unauthorized actions (edit others' posts)
  - Simulate network failures and timeouts
  - Test concurrent operations (double submit, parallel edits)
  - Inject SQL, XSS, command injection attempts
  - Stress test with 10k+ concurrent users
```
