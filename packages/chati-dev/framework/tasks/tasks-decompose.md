---
id: tasks-decompose
agent: tasks
trigger: phases
phase: plan
requires_input: false
parallelizable: false
outputs: [tasks-list.yaml]
handoff_to: tasks-estimate
autonomous_gate: true
criteria:
  - All features decomposed into atomic tasks
  - Each task is independently deliverable
  - Task granularity appropriate (1-5 days each)
---
# Decompose Features into Atomic Tasks

## Purpose
Break down each feature into small, independently deliverable development tasks.

## Prerequisites
- `mvp-scope.yaml` with MVP features
- `architecture-final.yaml` for technical structure

## Steps

### 1. For Each MVP Feature, Create Tasks
Example: FR-001 (User registration) becomes:
- Design database schema for users table
- Implement registration API endpoint
- Add password hashing with bcrypt
- Create registration form UI
- Add client-side validation
- Add server-side validation
- Write unit tests for registration logic
- Write integration tests for API
- Write E2E test for registration flow

### 2. Ensure Tasks are Atomic
Each task should:
- Be completable in 1-5 days
- Have clear definition of done
- Be independently testable
- Not require other incomplete tasks (except explicit dependencies)

### 3. Organize by Module
Group tasks by technical module (auth, posts, search, ui, etc.)

### 4. Add Task Dependencies
Task B depends on Task A if it cannot start until A is complete.

## Output Format
```yaml
# tasks-list.yaml
tasks:
  - id: TASK-001
    title: Design users table schema
    module: database
    description: Create database schema for users table with id, email, password_hash, timestamps
    feature: FR-001
    priority: P0
    dependencies: []
    estimated_days: 1
  - id: TASK-002
    title: Implement user registration API endpoint
    module: auth
    description: Create POST /api/auth/register endpoint with validation
    feature: FR-001
    priority: P0
    dependencies: [TASK-001]
    estimated_days: 2
  - id: TASK-003
    title: Create registration form UI
    module: frontend
    description: Build registration page with form, validation, error handling
    feature: FR-001
    priority: P0
    dependencies: [TASK-002]
    estimated_days: 3
```
