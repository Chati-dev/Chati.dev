---
id: phases-dependency-mapping
agent: phases
trigger: phases-breakdown
phase: plan
requires_input: false
parallelizable: false
outputs: [dependency-map.yaml]
handoff_to: phases-mvp-scoping
autonomous_gate: true
criteria:
  - Dependencies between phases mapped
  - Blockers identified
  - Critical path documented
---
# Map Dependencies Between Phases

## Purpose
Identify dependencies between features and phases to ensure proper sequencing.

## Steps

### 1. Analyze Feature Dependencies
- Comments depend on Posts (can't comment without posts)
- Admin moderation depends on Posts and Users
- Advanced search depends on basic search

### 2. Identify Technical Dependencies
- Database schema must be established before features using it
- Authentication must work before protected features
- API must be complete before frontend can consume it

### 3. Create Dependency Graph
Visual representation of what depends on what.

### 4. Identify Critical Path
Longest sequence of dependent tasks that determines minimum project duration.

### 5. Flag Potential Blockers
External dependencies (WordPress API), third-party services, approvals.

## Output Format
```yaml
# dependency-map.yaml
feature_dependencies:
  - feature: FR-003 (Create posts)
    depends_on: [FR-001 (Register), FR-002 (Login)]
    reason: Must be authenticated to create posts
  - feature: FR-008 (Comments)
    depends_on: [FR-003 (Posts), FR-001 (Users)]
    reason: Comments are on posts, by users
technical_dependencies:
  - component: PostService
    depends_on: [AuthService, Database schema]
  - component: Frontend
    depends_on: [API complete, authentication working]
critical_path:
  - Database schema design
  - Authentication implementation
  - Post CRUD implementation
  - Frontend implementation
  - Testing and deployment
estimated_critical_path_duration: 10 weeks
blockers:
  - WordPress API access (must get API key)
  - Supabase account setup (must provision)
```
