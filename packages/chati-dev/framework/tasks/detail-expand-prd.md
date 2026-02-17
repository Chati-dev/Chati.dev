---
id: detail-expand-prd
agent: detail
trigger: brief
phase: plan
requires_input: false
parallelizable: false
outputs: [prd-draft.yaml]
handoff_to: detail-nfr-extraction
autonomous_gate: true
criteria:
  - All functional requirements expanded with details
  - Requirements written in Given-When-Then format
  - Data models identified
  - API endpoints outlined
---
# Expand Brief into Formal PRD

## Purpose
Transform the approved brief into a comprehensive Product Requirements Document with technical details.

## Prerequisites
- `brief.yaml` approved by user

## Steps

### 1. Load Approved Brief
Read brief.yaml and extract all requirements and context.

### 2. Expand Each Functional Requirement
For each FR, add:
- **Description**: Detailed explanation of what it does
- **Requirement**: As a [persona], I want [action] so that [benefit]
- **Acceptance Criteria**: Given-When-Then scenarios
- **Priority**: P0 (must-have), P1 (should-have), P2 (nice-to-have)
- **Estimated Complexity**: Small (1-3 days), Medium (4-7 days), Large (8+ days)
- **Dependencies**: Other FRs that must be completed first

### 3. Define Data Models
Identify entities and their relationships:
- User (id, email, password_hash, created_at, updated_at)
- Post (id, user_id, title, content, tags, images, created_at, updated_at, published_at)
- Tag (id, name)
- PostTag (post_id, tag_id) - many-to-many relationship

Document:
- Entity name
- Attributes with types
- Relationships (one-to-one, one-to-many, many-to-many)
- Constraints (unique, required, foreign keys)

### 4. Outline API Endpoints
For each FR, define required endpoints:
- **Method**: GET, POST, PUT, DELETE
- **Path**: /api/users, /api/posts/:id
- **Request**: Body, query params, path params
- **Response**: Success (200, 201) and error codes (400, 401, 404, 500)
- **Authentication**: Required or public

### 5. Define UI Screens
For each user-facing FR:
- Screen name
- Purpose
- Key elements (forms, buttons, lists)
- Navigation flow
- Responsive breakpoints

### 6. Document Business Rules
Extract business logic:
- Validation rules (email format, password strength, max image size)
- Authorization rules (users can only edit own posts)
- Data constraints (post title max 200 chars)
- Workflow rules (post must have title to publish)

### 7. Identify Integration Points
For external systems:
- WordPress API: Read posts and metadata
- Email service: Registration confirmation (if needed)
- File storage: Image uploads (Supabase storage)

### 8. Define Error Handling
- Input validation errors
- Authentication/authorization failures
- Network failures
- Database errors
- External API failures

### 9. Document State Management
- Authentication state (logged in/out)
- Form state (draft, submitting, submitted)
- Data loading state (loading, success, error)
- Cache invalidation strategy

### 10. Create Initial PRD Draft
Structured document with all sections populated.

## Decision Points
- **Missing Technical Details**: Make reasonable assumptions based on best practices
- **Ambiguous Requirements**: Note for NFR extraction or edge case analysis

## Error Handling
- **Incomplete Brief**: Request brief completion before proceeding
- **Contradictory Requirements**: Flag and request clarification

## Output Format
```yaml
# prd-draft.yaml
timestamp: 2026-02-13T14:30:00Z

functional_requirements_detailed:
  - id: FR-001
    title: User Registration
    description: |
      New users can create an account by providing email and password.
      Email must be unique and valid format. Password must meet strength requirements.
      Upon successful registration, user is automatically logged in.
    user_story: |
      As a content creator, I want to register for an account with my email and
      password so that I can start publishing blog posts.
    acceptance_criteria:
      - scenario: Successful registration
        given: User is on registration page and not logged in
        when: User submits valid email and password
        then: |
          - Account is created in database
          - User receives JWT token
          - User is redirected to dashboard
          - Confirmation email is sent (future phase)
      - scenario: Duplicate email
        given: Email already exists in database
        when: User submits registration form with existing email
        then: |
          - Registration fails with 409 error
          - User sees "Email already registered" message
          - Form remains populated (password cleared)
      - scenario: Invalid password
        given: User is on registration page
        when: User submits password that doesn't meet requirements
        then: |
          - Registration fails with 400 error
          - User sees specific validation errors
          - Form shows password requirements
    priority: P0
    complexity: medium (5 days)
    dependencies: []
    api_endpoints:
      - method: POST
        path: /api/auth/register
        request:
          body:
            email: string (required, valid email)
            password: string (required, min 8 chars, 1 uppercase, 1 number)
        response:
          success: 201 Created
            body:
              user: {id, email, created_at}
              token: string (JWT)
          errors:
            400: Invalid input (validation errors)
            409: Email already registered
    ui_screens:
      - name: Registration Page
        route: /register
        elements:
          - Email input field
          - Password input field
          - Password strength indicator
          - Submit button
          - Link to login page
        validation:
          - Real-time email format validation
          - Real-time password strength check
          - Disable submit until valid
    data_model:
      entity: User
      attributes:
        id: uuid (primary key)
        email: string (unique, required)
        password_hash: string (required)
        created_at: timestamp
        updated_at: timestamp
    business_rules:
      - Email must be unique across all users
      - Password must be at least 8 characters
      - Password must contain 1 uppercase, 1 lowercase, 1 number
      - Email must be valid format (regex validation)
      - Password must be hashed with bcrypt before storage

  - id: FR-002
    title: User Login
    description: |
      Registered users can log in with email and password to access protected features.
    user_story: |
      As a registered user, I want to log in with my credentials so that I can
      access my dashboard and manage my posts.
    acceptance_criteria:
      - scenario: Successful login
        given: User has valid account
        when: User submits correct email and password
        then: |
          - User receives JWT token
          - User is redirected to dashboard
          - Token is stored in localStorage
      - scenario: Invalid credentials
        given: User is on login page
        when: User submits incorrect email or password
        then: |
          - Login fails with 401 error
          - User sees "Invalid credentials" message
          - Form is cleared for security
    priority: P0
    complexity: medium (4 days)
    dependencies: [FR-001]
    api_endpoints:
      - method: POST
        path: /api/auth/login
        request:
          body:
            email: string (required)
            password: string (required)
        response:
          success: 200 OK
            body:
              user: {id, email}
              token: string (JWT)
          errors:
            401: Invalid credentials
    ui_screens:
      - name: Login Page
        route: /login
        elements:
          - Email input
          - Password input
          - Submit button
          - Link to registration
          - "Forgot password" link (future)

data_models:
  - name: User
    attributes:
      - name: id
        type: uuid
        constraints: [primary_key]
      - name: email
        type: string
        constraints: [unique, required]
      - name: password_hash
        type: string
        constraints: [required]
      - name: created_at
        type: timestamp
        constraints: [required, default_now]
      - name: updated_at
        type: timestamp
        constraints: [required, default_now, update_on_change]
  - name: Post
    attributes:
      - name: id
        type: uuid
        constraints: [primary_key]
      - name: user_id
        type: uuid
        constraints: [required, foreign_key(User.id)]
      - name: title
        type: string
        constraints: [required, max_length(200)]
      - name: content
        type: text
        constraints: [required]
      - name: tags
        type: array(string)
        constraints: []
      - name: image_urls
        type: array(string)
        constraints: []
      - name: published_at
        type: timestamp
        constraints: [nullable]
      - name: created_at
        type: timestamp
        constraints: [required, default_now]
      - name: updated_at
        type: timestamp
        constraints: [required, default_now, update_on_change]
    relationships:
      - type: many_to_one
        entity: User
        description: Each post belongs to one user

api_endpoints_summary:
  authentication:
    - POST /api/auth/register
    - POST /api/auth/login
    - GET /api/auth/me (get current user)
    - POST /api/auth/logout
  posts:
    - GET /api/posts (list all, with pagination)
    - GET /api/posts/:id (get single post)
    - POST /api/posts (create new post, auth required)
    - PUT /api/posts/:id (update post, auth required, owner only)
    - DELETE /api/posts/:id (delete post, auth required, owner only)
  search:
    - GET /api/search?q=keyword&tag=tagname
  wordpress:
    - GET /api/wordpress/posts (fetch from WordPress API)

ui_screens_summary:
  public:
    - / (home page with post list)
    - /posts/:id (post detail page)
    - /register (registration page)
    - /login (login page)
    - /search (search results page)
  authenticated:
    - /dashboard (user dashboard)
    - /posts/new (create post page)
    - /posts/:id/edit (edit post page)
    - /profile (user profile, future)

business_rules:
  authentication:
    - Password must be 8+ chars with 1 uppercase, 1 number
    - JWT token expires after 7 days
    - Email must be unique
  posts:
    - Title required, max 200 characters
    - Content required, no max length
    - Users can only edit/delete their own posts
    - Published posts visible to all, drafts only to owner
    - Tags are optional, stored as array
    - Images must be <5MB, JPG/PNG only
  search:
    - Search is case-insensitive
    - Matches in title, content, and tags
    - Results paginated (20 per page)

integration_points:
  - name: WordPress API
    purpose: Fetch existing blog posts
    endpoint: https://existing-blog.com/wp-json/wp/v2/posts
    authentication: API key in header
    data_format: JSON
    error_handling: Cache results, show stale data if API down
  - name: Supabase
    services: [auth, database, storage]
    purpose: Backend infrastructure
  - name: Image Storage
    service: Supabase Storage
    purpose: Store uploaded images
    constraints: 5MB max per file, JPG/PNG only

error_handling_strategy:
  input_validation:
    - Client-side validation for immediate feedback
    - Server-side validation for security
    - Return specific error messages (not generic "invalid input")
  authentication:
    - 401 for missing/invalid token
    - Redirect to login page
    - Clear token from localStorage
  authorization:
    - 403 for insufficient permissions
    - User-friendly error message
  network_errors:
    - Retry up to 3 times with exponential backoff
    - Show user-friendly error message
    - Provide offline capability where possible
  database_errors:
    - Log error details server-side
    - Return generic 500 error to client
    - Do not expose database structure

state_management:
  authentication_state:
    - Stored in React Context
    - Persisted in localStorage (JWT)
    - Checked on app initialization
    - Cleared on logout
  data_cache:
    - Use TanStack Query for server state
    - 5-minute stale time
    - Background refetch on window focus
  form_state:
    - React Hook Form for form management
    - Validation on blur and submit
    - Autosave drafts every 30 seconds (future)

next_step: nfr_extraction
```
