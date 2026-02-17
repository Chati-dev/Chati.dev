---
id: phases-breakdown
agent: phases
trigger: architect
phase: plan
requires_input: false
parallelizable: false
outputs: [phases.yaml]
handoff_to: phases-dependency-mapping
autonomous_gate: true
criteria:
  - Project broken into logical development phases
  - Each phase delivers working increment
  - MVP clearly defined as Phase 1
---
# Break Project into Development Phases

## Purpose
Decompose the project into deliverable phases, with MVP as Phase 1.

## Prerequisites
- `prd.yaml`, `architecture-final.yaml`, `ux-final.yaml`

## Steps

### 1. Define Phase Strategy
MVP-first approach: Phase 1 = minimal viable features, subsequent phases add features.

### 2. Group Features by Phase
Phase 1 (MVP):
- User registration & login
- Create/edit/delete posts
- View posts
- Basic search

Phase 2:
- Comments
- Admin moderation
- User profiles

Phase 3 (future):
- Social features
- Advanced analytics
- Email notifications

### 3. For Each Phase, Define
- Objectives
- Features included
- Success criteria
- Estimated duration
- Dependencies on previous phases

### 4. Ensure Each Phase is Independently Deployable
Each phase should produce working software that can be demoed.

## Output Format
```yaml
# phases.yaml
phases:
  - id: phase-1
    name: MVP Launch
    duration_weeks: 12
    objectives:
      - Launch functional blog platform
      - User authentication working
      - Core post management complete
      - Basic search operational
    features:
      - FR-001: User registration
      - FR-002: User login
      - FR-003: Create posts
      - FR-004: Edit/delete posts
      - FR-005: Search posts
      - FR-006: View posts
    success_criteria:
      - All P0 features implemented
      - >80% test coverage
      - Performance targets met
      - Successfully deploys to production
    estimated_effort_hours: 480
  - id: phase-2
    name: Community Features
    duration_weeks: 6
    objectives:
      - Add community interaction
      - Admin moderation tools
    features:
      - FR-008: Comments
      - FR-009: Admin moderation
      - FR-010: User profiles
```
