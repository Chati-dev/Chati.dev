---
id: brownfield-wu-report
agent: brownfield-wu
trigger: brownfield-wu-migration-plan
phase: discover
requires_input: false
parallelizable: false
outputs: [wu-report.yaml]
handoff_to: brief
autonomous_gate: true
criteria:
  - All brownfield analysis artifacts consolidated
  - Executive summary provides clear overview
  - Critical issues highlighted
  - Migration roadmap included
---
# Compile Brownfield WU Report

## Purpose
Consolidate all brownfield analysis findings into a comprehensive Work Understanding report with actionable recommendations and migration roadmap.

## Prerequisites
- `discovery.yaml` exists with codebase analysis
- `dependencies.yaml` exists with dependency assessment
- `architecture-map.yaml` exists with architecture documentation
- `risk-assessment.yaml` exists with risk analysis
- `migration-plan.yaml` exists with migration strategy

## Steps

### 1. Load All Analysis Artifacts
- Read all prerequisite YAML files
- Verify completeness and validity
- Extract key findings from each

### 2. Create Executive Summary
Write 5-8 sentence summary covering:
- Project scale and maturity
- Current tech stack
- Critical issues identified (security, performance, debt)
- Overall risk level
- Recommended migration strategy
- Timeline and effort estimates

### 3. Consolidate Codebase Overview
From `discovery.yaml` and `dependencies.yaml`:
- Project statistics (files, LOC, age)
- Tech stack summary
- Framework versions
- Test coverage
- Code quality score

### 4. Summarize Architecture
From `architecture-map.yaml`:
- Architectural pattern
- Key layers and modules
- Design patterns in use
- Identified issues (circular dependencies, god modules, etc.)

### 5. Highlight Critical Issues
From `risk-assessment.yaml`:
- Critical and high-priority risks
- Security vulnerabilities requiring immediate attention
- Performance bottlenecks
- Technical debt quantification

### 6. Present Migration Roadmap
From `migration-plan.yaml`:
- Chosen strategy with justification
- Phase breakdown with timelines
- Success metrics
- Total effort estimates

### 7. Calculate Overall Health Score
Aggregate health metrics (0-100 scale):
- **Security (25%)**: Vulnerability severity and count
- **Performance (20%)**: Bottlenecks and efficiency
- **Maintainability (25%)**: Code quality, coupling, test coverage
- **Modernity (15%)**: Dependency currency, tech stack age
- **Documentation (15%)**: Documentation completeness and quality
Weighted average = overall health score

### 8. Define Immediate Actions
List top 5-10 actions to take before development:
- Fix critical security issues
- Set up monitoring
- Increase test coverage for critical paths
- Update vulnerable dependencies
- Resolve blocking architectural issues

### 9. Provide Recommendations
Categorized by timeframe:
- **Immediate** (this week): Critical fixes
- **Short-term** (this month): High-priority risks
- **Medium-term** (this quarter): Technical debt reduction
- **Long-term** (this year): Complete modernization

### 10. Generate Final Report
Combine all sections into comprehensive YAML with clear structure and actionable content.

## Decision Points
- **Low Health Score (<40)**: Ask user if rewrite should be considered instead of incremental migration
- **High Risk Count (>50)**: Recommend staged approach, addressing highest risks first
- **Long Timeline (>12 months)**: Confirm user commitment and resource availability

## Error Handling
- **Missing Artifacts**: If any prerequisite missing, halt and request completion
- **Conflicting Data**: If artifacts have conflicting information, flag and request clarification
- **Invalid Metrics**: If calculated scores are unrealistic, document assumptions and limitations

## Output Format
```yaml
# wu-report.yaml
report_type: brownfield
timestamp: 2026-02-13T12:15:00Z
project_path: /Users/user/projects/legacy-app

executive_summary: |
  Analyzed mature 1793-day-old Next.js + Express application with 30k LOC and 87 dependencies.
  Identified 3 critical security issues requiring immediate attention (CVE + exposed secrets).
  Architecture is feature-based with moderate coupling and 11% test coverage. 47 risks
  catalogued totaling 287 hours of technical debt. Recommended incremental Strangler Fig
  migration over 6 months to modernize React 17→18, increase test coverage to 80%, and
  reduce debt by 60%. Overall health score: 58/100.

project_overview:
  age_days: 1793
  age_years: 4.9
  total_files: 2847
  total_lines_of_code: 31187
  total_commits: 1847
  contributors: 12
  active_contributors_3mo: 4
  test_coverage: 11%
  maturity: mature

tech_stack:
  frontend:
    framework: Next.js 12.3.1
    ui_framework: React 17.0.2
    ui_library: Material-UI
    state_management: Redux
    build_tool: webpack
  backend:
    runtime: Node.js 18.x
    framework: Express 4.18.0
    orm: Prisma
  database:
    primary: PostgreSQL 14
    cache: None (Redis recommended)
  infrastructure:
    hosting: Heroku
    ci_cd: None (GitHub Actions recommended)

architecture:
  pattern: feature_based_architecture
  layers: [presentation, application, domain, data, infrastructure]
  key_issues:
    - Circular dependencies between api-routes, services, models
    - God module (utils) with 34 dependents
    - Low cohesion in utilities
    - Anemic domain models
  design_patterns: [factory, singleton, adapter, decorator, observer, middleware]

health_score: 58
health_breakdown:
  security: 35 (critical vulnerabilities + exposed secrets)
  performance: 55 (N+1 queries, no caching)
  maintainability: 52 (low test coverage, high coupling)
  modernity: 68 (some outdated dependencies)
  documentation: 75 (README good, but missing API docs)

critical_issues:
  security:
    - CVE in lodash (score: 90, fix: 0.5 hours)
    - Exposed API key in source (score: 90, fix: 2 hours)
    - Missing auth on admin endpoints (score: 80, fix: 1 hour)
  performance:
    - N+1 queries in dashboard (score: 70, fix: 2 hours)
    - No caching layer (score: 36, fix: 12 hours)
  technical_debt:
    - Test coverage 11% (target 80%, fix: 120 hours)
    - God module utils (score: 60, fix: 16 hours)
    - 28 outdated dependencies (fix: 23.5 hours)
  maintainability:
    - Circular dependencies (score: 56, fix: 8 hours)
    - Mixed TS/JS (41% TS, fix: 40 hours)

risk_summary:
  total_risks: 47
  critical: 3
  high: 12
  medium: 21
  low: 11
  total_remediation_hours: 165.5

technical_debt:
  total_hours: 287
  breakdown:
    code_debt: 48 hours
    test_debt: 120 hours
    documentation_debt: 24 hours
    dependency_debt: 23.5 hours
    architecture_debt: 24 hours (circular deps, god modules)

migration_strategy:
  approach: incremental_strangler_fig
  justification: |
    Large codebase with active development. Cannot afford extended downtime.
    Need to deliver features during migration. Strangler Fig allows incremental
    replacement while maintaining working system.
  phases: 6
  total_duration_months: 6
  total_effort_hours: 606.6 (with 20% buffer)
  team_size: 3 developers
  velocity: 50% (other 50% on features)

migration_phases_summary:
  - phase: 0 (Preparation)
    duration: 2 weeks
    focus: Critical security fixes, monitoring setup, test coverage for critical paths
    hours: 51.5
  - phase: 1 (Foundation)
    duration: 4 weeks
    focus: Dependency updates, tooling standardization, CI/CD setup
    hours: 50
  - phase: 2 (Auth Modernization)
    duration: 3 weeks
    focus: Consolidate auth, implement MFA, stateless JWT
    hours: 60
  - phase: 3 (Data Layer)
    duration: 4 weeks
    focus: Fix N+1 queries, add caching, optimize queries
    hours: 68
  - phase: 4 (Code Quality)
    duration: 6 weeks
    focus: Break up god modules, complete TS migration, increase test coverage
    hours: 176
  - phase: 5 (Performance)
    duration: 3 weeks
    focus: Code splitting, bundle optimization, lazy loading
    hours: 48
  - phase: 6 (Cleanup)
    duration: 2 weeks
    focus: Documentation, ADRs, final testing
    hours: 52

success_metrics:
  technical:
    test_coverage: 11% → 80%
    dashboard_load_time: 5.2s → <2s
    critical_vulnerabilities: 3 → 0
    technical_debt_hours: 287 → <100
    typescript_adoption: 41% → 100%
  business:
    deployment_frequency: weekly → daily
    time_to_restore: 4 hours → <15 minutes
    uptime: 99.5% → 99.9%

immediate_actions:
  - action: Fix critical lodash CVE (CVE-2023-45857)
    priority: critical
    estimated_hours: 0.5
    impact: Prevents potential system compromise
  - action: Rotate and secure exposed API key
    priority: critical
    estimated_hours: 2
    impact: Prevents unauthorized API access and billing fraud
  - action: Add authentication to /api/admin/* endpoints
    priority: critical
    estimated_hours: 1
    impact: Prevents unauthorized admin access
  - action: Set up error tracking (Sentry)
    priority: high
    estimated_hours: 4
    impact: Visibility into production issues
  - action: Set up metrics monitoring (Prometheus/Grafana)
    priority: high
    estimated_hours: 8
    impact: Performance and health monitoring

recommendations:
  immediate_this_week:
    - Fix all 3 critical security issues (3.5 hours)
    - Set up monitoring infrastructure (12 hours)
    - Document current system behavior (4 hours)
  short_term_this_month:
    - Fix N+1 queries (2 hours)
    - Add database indexes (4 hours)
    - Implement Redis caching (12 hours)
    - Update vulnerable dependencies (8 hours)
    - Set up GitHub Actions CI/CD (12 hours)
  medium_term_this_quarter:
    - Complete React 17→18 migration (16 hours)
    - Break up god modules (16 hours)
    - Resolve circular dependencies (8 hours)
    - Increase test coverage to 60% (60 hours)
    - Complete TypeScript migration (40 hours)
  long_term_this_year:
    - Achieve 80% test coverage (120 hours)
    - Complete all 6 migration phases (606.6 hours)
    - Implement comprehensive monitoring and alerting
    - Set up database read replicas for scale

artifacts_generated:
  - discovery.yaml
  - dependencies.yaml
  - architecture-map.yaml
  - risk-assessment.yaml
  - migration-plan.yaml
  - wu-report.yaml

next_steps:
  - Review and approve WU report and migration plan
  - Address 3 critical security issues immediately (3.5 hours)
  - Begin phase 0 of migration (2 weeks)
  - Transition to brief agent for additional requirements gathering
  - Schedule migration kickoff meeting with team

handoff_to: brief
handoff_context: |
  Brownfield analysis complete. Critical security issues identified and should be fixed
  immediately. 6-month incremental migration plan approved. Next step is requirements
  gathering to understand new feature needs and ensure migration supports future direction.
```
