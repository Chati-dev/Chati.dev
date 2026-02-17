---
id: brownfield-wu-migration-plan
agent: brownfield-wu
trigger: brownfield-wu-risk-assess
phase: discover
requires_input: true
parallelizable: false
outputs: [migration-plan.yaml]
handoff_to: brownfield-wu-report
autonomous_gate: false
criteria:
  - Migration strategy defined (big-bang vs incremental)
  - Migration phases documented with timeline
  - Rollback strategy included
  - Risk mitigation plans defined
---
# Plan Migration Strategy

## Purpose
Create a detailed migration plan for modernizing the brownfield codebase, addressing technical debt, and mitigating identified risks.

## Prerequisites
- `risk-assessment.yaml` with prioritized risks and remediation estimates
- `architecture-map.yaml` with current architecture
- `dependencies.yaml` with update recommendations
- User input on migration preferences and constraints

## Steps

### 1. Determine Migration Scope
Ask user to clarify:
- **Goals**: What are we trying to achieve?
  - Modernize tech stack
  - Reduce technical debt
  - Improve performance
  - Fix security issues
  - Enable new features
- **Constraints**:
  - Timeline: How long can migration take?
  - Budget: Development hours available
  - Team size: How many developers?
  - Downtime tolerance: Can we have maintenance windows?
  - User impact tolerance: Can users experience temporary issues?
- **Priorities**: Rank by importance (security, performance, maintainability, features)

### 2. Choose Migration Strategy
Present options and recommend:
- **Big-Bang Rewrite**:
  - Pros: Clean slate, modern architecture, no legacy baggage
  - Cons: High risk, long timeline, business disruption, feature parity challenges
  - When: Legacy is unmaintainable, new requirements incompatible with current architecture
  - Estimated timeline: 6-24 months depending on size
- **Incremental Strangler Fig Pattern**:
  - Pros: Low risk, continuous delivery, gradual migration, can abort if needed
  - Cons: Longer total timeline, temporary complexity, both systems running
  - When: System is large, can't afford downtime, need to deliver features during migration
  - Estimated timeline: 12-36 months depending on size
- **Targeted Modernization**:
  - Pros: Addresses specific pain points, faster, lower risk than rewrite
  - Cons: Technical debt remains in unchanged areas
  - When: Only specific areas are problematic, rest of codebase is healthy
  - Estimated timeline: 3-12 months
- **Hybrid Approach**:
  - Pros: Flexibility, can adjust as you learn
  - Cons: Requires clear boundaries, potential for confusion
  - When: Different subsystems have different needs

### 3. Define Migration Phases
Break migration into phases (typically 4-8 phases):
- **Phase 1: Preparation**
  - Set up monitoring and observability
  - Increase test coverage for critical paths
  - Document current behavior
  - Fix critical security issues
  - Set up feature flags
- **Phase 2: Foundation**
  - Update dependencies to secure versions
  - Standardize tooling (linting, formatting, testing)
  - Resolve circular dependencies
  - Set up CI/CD if missing
- **Phase 3-N: Incremental Changes**
  - Each phase targets a specific subsystem or concern
  - Maintain working system at end of each phase
  - Deploy and validate before next phase
- **Final Phase: Cleanup**
  - Remove legacy code/patterns
  - Final performance optimization
  - Complete documentation
  - Training and handoff

### 4. Create Detailed Phase Plans
For each phase:
- **Objectives**: What will be achieved
- **Tasks**: Specific work items with estimates
- **Dependencies**: What must be done first
- **Success Criteria**: How to know phase is complete
- **Risks**: What could go wrong
- **Rollback Plan**: How to undo if needed
- **Timeline**: Start date, duration, end date
- **Resources**: Developers needed, skills required

### 5. Define Transition Architecture
If using Strangler Fig or Hybrid:
- **Routing Strategy**: How to route traffic between old and new
  - API Gateway routing by endpoint
  - Feature flags for gradual rollout
  - Proxy layer directing by criteria
- **Data Strategy**: How to handle data during transition
  - Shared database (simple but couples old/new)
  - Database replication (complex but clean separation)
  - Event-driven sync (eventual consistency)
- **Coexistence Pattern**: How old and new systems interact
  - Façade pattern hiding complexity
  - Adapter layer for compatibility
  - Shared contracts/interfaces

### 6. Plan Data Migration
If data schema changes:
- **Migration Scripts**: SQL scripts or ORM migrations
- **Data Transformation**: ETL processes if needed
- **Validation**: How to verify migration success
- **Testing**: Test migrations on production-like data
- **Rollback**: How to reverse migration if needed
- **Downtime**: Estimate required downtime (if any)

### 7. Define Testing Strategy
- **Unit Tests**: Maintain/increase coverage during migration
- **Integration Tests**: Test old and new systems together
- **End-to-End Tests**: Verify critical user flows
- **Performance Tests**: Ensure no regression
- **Smoke Tests**: Quick validation after deployment
- **A/B Testing**: Compare old vs. new in production
- **Canary Releases**: Gradual rollout to subset of users

### 8. Create Rollback Plans
For each phase, document:
- **Rollback Triggers**: What indicates need to rollback
  - Error rate spike
  - Performance degradation
  - Critical bugs
  - User complaints
- **Rollback Procedure**: Step-by-step process
  - Feature flag toggle
  - Deploy previous version
  - Revert database migration
  - Switch traffic routing
- **Rollback Time**: How long to rollback (target <15 minutes)
- **Data Consistency**: How to handle data created in new system during rollback

### 9. Estimate Total Effort and Timeline
- Sum estimated hours from all phases
- Add 20-30% buffer for unknowns
- Calculate calendar time based on:
  - Team size
  - Velocity (estimated hours per phase)
  - Availability (not 100% on migration)
  - Dependencies and waiting time
- Provide optimistic, realistic, and pessimistic timelines

### 10. Define Success Metrics
- **Technical Metrics**:
  - Test coverage: Current → Target (e.g., 11% → 80%)
  - Performance: Response time, throughput
  - Security: Vulnerability count → 0 critical/high
  - Code quality: Cyclomatic complexity, duplication
- **Business Metrics**:
  - Uptime/availability
  - Feature delivery velocity
  - Bug rate
  - Customer satisfaction
- **Process Metrics**:
  - Deployment frequency
  - Lead time for changes
  - Time to restore service

## Decision Points
- **Strategy Selection**: Present 2-3 strategies with pros/cons, ask user to choose
- **Timeline vs. Quality**: If timeline is tight, ask what can be cut or deferred
- **Risk Tolerance**: Ask user's comfort level with different risk levels
- **Feature Freeze**: Ask if new features can be paused during migration or must continue

## Error Handling
- **Unrealistic Timeline**: If user's timeline is too aggressive, explain risks and provide minimum realistic timeline
- **Insufficient Resources**: If team size cannot support chosen strategy, recommend alternatives
- **Conflicting Priorities**: If user wants everything immediately, help prioritize by impact

## Output Format
```yaml
# migration-plan.yaml
timestamp: 2026-02-13T12:00:00Z
project_path: /Users/user/projects/legacy-app

migration_strategy: incremental_strangler_fig
strategy_justification: |
  Strangler Fig pattern chosen due to large codebase (30k LOC), need to continue
  delivering features during migration, and low downtime tolerance. Will incrementally
  replace subsystems while maintaining working system.

goals:
  - Fix critical security vulnerabilities
  - Modernize from React 17 to React 18
  - Increase test coverage from 11% to 80%
  - Reduce technical debt by 60%
  - Improve performance (dashboard load time <2s)

constraints:
  timeline: 12 months
  team_size: 3 developers
  downtime_tolerance: <1 hour per quarter
  feature_development: must continue at 50% velocity

phases:
  - phase: 0
    name: Preparation
    duration_weeks: 2
    objectives:
      - Fix critical security issues (3 CVEs)
      - Set up monitoring and error tracking
      - Increase test coverage for critical paths (auth, payments)
      - Set up feature flag system
    tasks:
      - task: Update lodash to fix CVE
        estimated_hours: 0.5
      - task: Rotate exposed API key
        estimated_hours: 2
      - task: Add authentication to admin endpoints
        estimated_hours: 1
      - task: Set up Sentry for error tracking
        estimated_hours: 4
      - task: Set up Prometheus + Grafana for metrics
        estimated_hours: 8
      - task: Add tests for authentication module
        estimated_hours: 16
      - task: Add tests for payment module
        estimated_hours: 12
      - task: Implement feature flag service
        estimated_hours: 8
    total_hours: 51.5
    success_criteria:
      - All critical CVEs resolved
      - Error tracking operational
      - Metrics dashboard showing key indicators
      - Auth and payment test coverage >70%
      - Feature flags deployable
    risks:
      - API key rotation may break third-party integrations
      - Monitoring setup may require infrastructure changes
    rollback_plan: Keep old lodash pinned temporarily if update breaks functionality

  - phase: 1
    name: Foundation Modernization
    duration_weeks: 4
    objectives:
      - Update all dependencies to current versions
      - Standardize tooling (ESLint, Prettier, pre-commit hooks)
      - Resolve circular dependencies
      - Set up automated CI/CD
    tasks:
      - task: Update React 17 → 18
        estimated_hours: 16
        breaking_changes: true
      - task: Update other dependencies
        estimated_hours: 8
      - task: Configure ESLint + Prettier
        estimated_hours: 4
      - task: Set up Husky pre-commit hooks
        estimated_hours: 2
      - task: Resolve circular dependencies
        estimated_hours: 8
      - task: Set up GitHub Actions CI/CD
        estimated_hours: 12
    total_hours: 50
    success_criteria:
      - No outdated dependencies with vulnerabilities
      - Code style consistent across codebase
      - No circular dependencies
      - CI/CD running all tests and linting
    dependencies: [phase-0]
    risks:
      - React 18 upgrade may break components using legacy patterns
      - Dependency updates may introduce breaking changes
    rollback_plan: Pin dependencies to previous versions if breaking issues found

  - phase: 2
    name: Authentication Modernization
    duration_weeks: 3
    objectives:
      - Consolidate authentication to single approach
      - Implement MFA support
      - Migrate sessions to stateless JWT
    tasks:
      - task: Consolidate JWT + Passport to single auth flow
        estimated_hours: 16
      - task: Implement MFA with TOTP
        estimated_hours: 20
      - task: Migrate sessions to stateless JWT
        estimated_hours: 12
      - task: Add comprehensive auth tests
        estimated_hours: 12
    total_hours: 60
    success_criteria:
      - Single auth approach used throughout
      - MFA enabled for all users
      - No database session storage
      - Auth test coverage >90%
    dependencies: [phase-1]
    risks:
      - Stateless JWT migration may log out all users
      - MFA rollout may cause user confusion
    rollback_plan: Feature flag to switch back to old auth, keep old code for 1 month

  - phase: 3
    name: Data Layer Modernization
    duration_weeks: 4
    objectives:
      - Fix N+1 queries
      - Add database indexes
      - Implement Redis caching layer
      - Optimize slow queries
    tasks:
      - task: Fix all N+1 queries
        estimated_hours: 12
      - task: Add indexes on frequently queried columns
        estimated_hours: 8
      - task: Set up Redis caching
        estimated_hours: 16
      - task: Implement cache-aside pattern for dashboard
        estimated_hours: 20
      - task: Query optimization and profiling
        estimated_hours: 12
    total_hours: 68
    success_criteria:
      - Dashboard load time <2 seconds
      - No N+1 queries in critical paths
      - Cache hit rate >80%
      - Database query time reduced 50%
    dependencies: [phase-1]
    risks:
      - Cache invalidation bugs may show stale data
      - Redis dependency adds operational complexity
    rollback_plan: Feature flag to disable caching, keep Redis optional

  - phase: 4
    name: Code Quality Improvement
    duration_weeks: 6
    objectives:
      - Break up god modules
      - Complete TypeScript migration
      - Increase test coverage to 60%
    tasks:
      - task: Split utils into focused modules
        estimated_hours: 16
      - task: Migrate JavaScript files to TypeScript
        estimated_hours: 40
      - task: Add unit tests across all modules
        estimated_hours: 80
      - task: Add integration tests for API
        estimated_hours: 40
    total_hours: 176
    success_criteria:
      - No modules with >500 lines
      - 100% TypeScript adoption
      - Test coverage ≥60%
      - All tests passing in CI
    dependencies: [phase-1, phase-2, phase-3]
    risks:
      - TypeScript migration may reveal type errors requiring fixes
      - High time investment may delay features
    rollback_plan: N/A (code quality improvements don't require rollback)

  - phase: 5
    name: Performance Optimization
    duration_weeks: 3
    objectives:
      - Implement code splitting
      - Optimize bundle size
      - Add lazy loading for routes
    tasks:
      - task: Set up code splitting with React.lazy
        estimated_hours: 12
      - task: Replace moment with date-fns
        estimated_hours: 8
      - task: Optimize images and assets
        estimated_hours: 8
      - task: Implement lazy loading for routes
        estimated_hours: 8
      - task: Bundle analysis and optimization
        estimated_hours: 12
    total_hours: 48
    success_criteria:
      - Initial bundle <200 KB
      - Lighthouse performance score >90
      - First contentful paint <1.5s
    dependencies: [phase-1, phase-4]
    risks:
      - Code splitting may introduce loading states that affect UX
    rollback_plan: Can revert to non-split bundles if issues arise

  - phase: 6
    name: Cleanup and Documentation
    duration_weeks: 2
    objectives:
      - Complete API documentation
      - Write architecture decision records
      - Remove legacy code
      - Final testing and validation
    tasks:
      - task: Generate OpenAPI documentation
        estimated_hours: 16
      - task: Write ADRs for major decisions
        estimated_hours: 8
      - task: Remove commented code and TODOs
        estimated_hours: 4
      - task: Final E2E testing
        estimated_hours: 16
      - task: Performance benchmarking
        estimated_hours: 8
    total_hours: 52
    success_criteria:
      - Complete API documentation published
      - All ADRs documented
      - Zero commented code blocks
      - All E2E tests passing
    dependencies: [all previous phases]
    risks:
      - Documentation may become outdated quickly
    rollback_plan: N/A

transition_architecture:
  routing_strategy: feature_flags
  feature_flag_service: LaunchDarkly
  rollout_pattern: percentage-based canary
  coexistence_duration: 2 weeks per phase

data_migration:
  strategy: in_place_migration
  downtime_required: false
  migration_tool: Prisma Migrate
  rollback_mechanism: Prisma migration rollback

testing_strategy:
  unit_tests: Vitest, maintain >80% coverage
  integration_tests: Supertest for API, React Testing Library for components
  e2e_tests: Playwright for critical user flows
  performance_tests: k6 for load testing
  canary_testing: 5% → 25% → 100% rollout

rollback_strategy:
  trigger_conditions:
    - Error rate increase >50%
    - Performance degradation >20%
    - Critical bug in production
  rollback_time_target: <15 minutes
  rollback_mechanism: Feature flag toggle
  data_rollback: Database migration rollback via Prisma

timeline:
  total_duration_weeks: 24
  total_duration_months: 6
  estimated_hours: 505.5
  with_buffer_20%: 606.6 hours
  calendar_time_realistic: 6 months (3 developers, 50% allocation)
  calendar_time_optimistic: 4.5 months
  calendar_time_pessimistic: 9 months

success_metrics:
  technical:
    test_coverage: 11% → 80%
    dashboard_load_time: 5.2s → <2s
    critical_vulnerabilities: 3 → 0
    technical_debt_hours: 287 → <100
  business:
    deployment_frequency: weekly → daily
    time_to_restore: 4 hours → <15 minutes
    feature_velocity: maintain 50% during migration

next_steps:
  - User approval of migration plan
  - Schedule phase 0 kickoff
  - Set up monitoring infrastructure
  - Create detailed task breakdown for phase 0
  - Communicate plan to stakeholders
```
