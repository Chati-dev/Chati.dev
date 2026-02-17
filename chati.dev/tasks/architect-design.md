---
id: architect-design
agent: architect
trigger: detail
phase: plan
requires_input: false
parallelizable: true
outputs: [architecture.yaml]
handoff_to: architect-stack-selection
autonomous_gate: true
criteria:
  - System architecture defined (layers, components, boundaries)
  - Design patterns selected and justified
  - Component responsibilities documented
---
# Design System Architecture

## Purpose
Design the high-level system architecture including layers, components, patterns, and boundaries.

## Prerequisites
- `prd.yaml` with complete requirements

## Steps

### 1. Choose Architectural Style
Options: Layered, Microservices, Event-Driven, Serverless
For MVP blog platform: **Layered Architecture** (simple, team-appropriate)

### 2. Define Layers
- **Presentation**: React components, pages, routing
- **Application**: Business logic, use cases (post creation, search)
- **Domain**: Core entities (User, Post) with validation rules
- **Data Access**: Repository pattern, Supabase client
- **Infrastructure**: External services (Supabase, WordPress API)

### 3. Define Core Components
- Authentication Service
- Post Service
- Search Service
- WordPress Integration Service
- Image Upload Service

### 4. Apply Design Patterns
- Repository pattern for data access
- Service layer for business logic
- Adapter pattern for WordPress API
- Observer pattern for real-time updates (future)

### 5. Define Module Boundaries
Clear separation between auth, posts, search modules.

### 6. Document Component Interactions
ASCII diagram showing component relationships.

### 7. Define Data Flow
Request → Route → Service → Repository → Database

### 8. Plan for Non-Functional Requirements
- Caching strategy
- Error handling approach
- Logging strategy

### 9. Document Architecture Decisions
ADRs for major decisions.

### 10. Generate Architecture Document

## Output Format
```yaml
# architecture.yaml
architectural_style: layered_architecture
layers:
  - name: presentation
    technologies: [React, React Router, TanStack Query]
  - name: application
    technologies: [Custom services]
  - name: domain
    technologies: [TypeScript classes, Zod validation]
  - name: data
    technologies: [Supabase client]
  - name: infrastructure
    technologies: [Supabase, WordPress API]
components:
  - name: AuthService
    layer: application
    responsibilities: [register, login, logout, validate token]
    dependencies: [SupabaseClient]
patterns:
  - Repository pattern
  - Service layer
  - Adapter pattern
data_flow: |
  User Action → React Component → Service Layer → Supabase Client → PostgreSQL
```
