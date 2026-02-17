---
id: brownfield-wu-risk-assess
agent: brownfield-wu
trigger: brownfield-wu-architecture-map
phase: discover
requires_input: false
parallelizable: false
outputs: [risk-assessment.yaml]
handoff_to: brownfield-wu-migration-plan
autonomous_gate: true
criteria:
  - All technical risks identified and categorized
  - Technical debt quantified
  - Risk severity and likelihood assessed
  - Mitigation strategies provided
---
# Assess Technical Risks and Debt

## Purpose
Identify and assess technical risks, technical debt, performance bottlenecks, security vulnerabilities, and maintainability issues in the existing codebase.

## Prerequisites
- `discovery.yaml` with code quality indicators
- `dependencies.yaml` with vulnerability assessment
- `architecture-map.yaml` with architectural issues

## Steps

### 1. Load All Analysis Data
- Read `discovery.yaml` for quality indicators and technical debt markers
- Read `dependencies.yaml` for dependency vulnerabilities and outdated packages
- Read `architecture-map.yaml` for architectural issues and circular dependencies

### 2. Identify Security Risks
- **Dependency Vulnerabilities**: From `dependencies.yaml`
  - Critical and high-severity CVEs
  - Exploitable vulnerabilities with known PoCs
  - Unpatched vulnerabilities
- **Code Security Issues**:
  - Hardcoded secrets (API keys, passwords, tokens)
  - SQL injection vectors (raw queries, string concatenation)
  - XSS vulnerabilities (unescaped user input, dangerouslySetInnerHTML)
  - CSRF protection missing
  - Insecure authentication (weak hashing, no MFA)
  - Insecure data transmission (HTTP instead of HTTPS)
  - Missing input validation
  - Insufficient authorization checks
- **Configuration Issues**:
  - Exposed .env files in repository
  - Debug mode enabled in production
  - Overly permissive CORS settings
  - Missing security headers (CSP, HSTS, X-Frame-Options)

### 3. Identify Performance Risks
- **Frontend Performance**:
  - Large bundle sizes (>500KB initial load)
  - No code splitting or lazy loading
  - Inefficient rendering (unnecessary re-renders)
  - Missing performance optimizations (memoization, virtualization)
  - Large images without optimization
  - No CDN usage
- **Backend Performance**:
  - N+1 query problems
  - Missing database indexes
  - Inefficient algorithms (O(n²) or worse)
  - Synchronous blocking operations
  - Memory leaks
  - No caching strategy
- **Database Performance**:
  - Missing indexes on frequently queried columns
  - Inefficient queries (SELECT *, large JOINs)
  - No query optimization
  - Database size growing without archival strategy

### 4. Assess Technical Debt
Quantify technical debt from `discovery.yaml`:
- **Code Debt**:
  - God files (>1000 lines): Count × 4 hours each to refactor
  - High cyclomatic complexity: Count × 2 hours each
  - Code duplication: DRY violations, copy-pasted code
  - Commented-out code: Count lines
  - TODO/FIXME count: Priority by age and context
- **Test Debt**:
  - Low test coverage (<60%): Hours to reach 80% = (lines of code × 0.5 hours per 100 lines)
  - Missing integration tests
  - Missing E2E tests
  - Flaky tests
- **Documentation Debt**:
  - Missing README sections
  - No API documentation
  - No architecture docs
  - Outdated documentation
  - Missing inline comments in complex logic
- **Dependency Debt**:
  - Outdated dependencies: From `dependencies.yaml`
  - Deprecated packages
  - Unused dependencies

### 5. Identify Scalability Risks
- **Architectural Bottlenecks**:
  - Monolithic architecture constraining scale
  - Single points of failure
  - No horizontal scaling capability
  - Stateful services preventing scale-out
- **Data Scalability**:
  - Database without sharding strategy
  - No read replicas
  - Growing tables without partitioning
  - Hot spots in data distribution
- **Traffic Scalability**:
  - No load balancing
  - Missing rate limiting
  - No auto-scaling configuration
  - Synchronous request chains

### 6. Assess Maintainability Risks
- **Code Maintainability**:
  - Low cohesion modules
  - High coupling (from architecture-map.yaml)
  - Circular dependencies
  - Inconsistent coding styles
  - Mixed languages/frameworks without clear boundaries
- **Team Knowledge Risks**:
  - Bus factor (key person dependencies)
  - Undocumented complex logic
  - Legacy code that no one understands
  - Tech stack unfamiliar to current team
- **Process Risks**:
  - No CI/CD pipeline
  - Manual deployment process
  - No code review process
  - Missing automated testing

### 7. Identify Compliance and Legal Risks
- **License Compliance**: From `dependencies.yaml`
  - GPL/AGPL dependencies in proprietary code
  - Unknown licenses
  - License incompatibilities
- **Data Privacy**:
  - GDPR compliance (data retention, right to deletion)
  - PII handling without encryption
  - No privacy policy
  - Missing data protection measures
- **Accessibility**:
  - WCAG compliance issues
  - Missing ARIA labels
  - Keyboard navigation issues

### 8. Calculate Risk Scores
For each identified risk:
- **Severity**: Critical (9-10), High (7-8), Medium (4-6), Low (1-3)
- **Likelihood**: High (7-10), Medium (4-6), Low (1-3)
- **Risk Score**: Severity × Likelihood (1-100)
- **Impact**: What happens if risk materializes
  - Business impact: Revenue loss, legal liability, reputation damage
  - Technical impact: Downtime, data loss, security breach
  - User impact: Poor UX, data privacy violation

### 9. Prioritize Risks
Sort risks by risk score descending:
- **Critical Priority (Score 70-100)**: Address immediately
- **High Priority (Score 40-69)**: Address in next phase
- **Medium Priority (Score 20-39)**: Address within 3 months
- **Low Priority (Score 1-19)**: Monitor, address when convenient

### 10. Estimate Remediation Effort
For each high and critical risk:
- Estimated hours to fix
- Resources required (developers, DevOps, security experts)
- Dependencies (what must be fixed first)
- Complexity (easy, moderate, hard, very hard)
- Provide remediation strategy outline

## Decision Points
- **Critical Security Risk**: If critical vulnerability or exposed secret found, alert immediately and ask if development should pause to fix
- **High Technical Debt**: If debt exceeds estimated project duration, ask if rewrite should be considered instead of maintenance
- **Compliance Issues**: If legal/compliance risks found, flag for legal review before proceeding

## Error Handling
- **Incomplete Data**: If prerequisites are missing data, note limitations and continue with available information
- **False Positives**: If automated security scans show false positives, document and exclude from risk count
- **Unable to Quantify**: If some debt cannot be quantified, provide qualitative assessment

## Output Format
```yaml
# risk-assessment.yaml
timestamp: 2026-02-13T11:45:00Z
project_path: /Users/user/projects/legacy-app

executive_summary: |
  Identified 47 risks across security, performance, technical debt, and maintainability.
  3 critical risks require immediate attention: 1 critical CVE, 1 exposed API key, 1 missing
  authentication on admin endpoint. Total technical debt estimated at 287 hours.
  High coupling and circular dependencies pose significant maintainability risk.

risk_summary:
  total_risks: 47
  by_severity:
    critical: 3
    high: 12
    medium: 21
    low: 11
  by_category:
    security: 8
    performance: 11
    technical_debt: 15
    scalability: 6
    maintainability: 7

critical_risks:
  - id: SEC-001
    category: security
    description: Critical CVE in lodash (prototype pollution)
    severity: 10
    likelihood: 9
    risk_score: 90
    impact: |
      Exploitable vulnerability allowing arbitrary code execution.
      Could lead to full system compromise.
    affected_components: [authentication, user-management, api-routes]
    remediation:
      action: Update lodash 4.17.20 → 4.17.21
      complexity: easy
      estimated_hours: 0.5
      priority: immediate
  - id: SEC-002
    category: security
    description: Exposed API key in src/config/api.ts
    severity: 9
    likelihood: 10
    risk_score: 90
    impact: |
      Hardcoded third-party API key in source code, visible in git history.
      Unauthorized access to paid API service, potential billing fraud.
    affected_components: [payment-integration]
    remediation:
      action: |
        1. Rotate API key immediately
        2. Move to environment variable
        3. Add .env to .gitignore
        4. Use git-filter-branch to remove from history
      complexity: moderate
      estimated_hours: 2
      priority: immediate
  - id: SEC-003
    category: security
    description: Missing authentication on /api/admin/* endpoints
    severity: 10
    likelihood: 8
    risk_score: 80
    impact: |
      Admin endpoints accessible without authentication.
      Unauthorized users can access sensitive data and perform admin operations.
    affected_components: [admin-api]
    remediation:
      action: Add authentication middleware to all /api/admin routes
      complexity: easy
      estimated_hours: 1
      priority: immediate

high_risks:
  - id: PERF-001
    category: performance
    description: N+1 query problem in user dashboard
    severity: 7
    likelihood: 10
    risk_score: 70
    impact: Database overload under load, slow page rendering
    affected_components: [dashboard-service]
    remediation:
      action: Use Prisma include/select to fetch related data in single query
      complexity: easy
      estimated_hours: 2
  - id: DEBT-001
    category: technical_debt
    description: God module src/utils with low cohesion
    severity: 6
    likelihood: 10
    risk_score: 60
    impact: Difficult to maintain, 34 modules depend on it
    affected_components: [utils]
    remediation:
      action: Split into focused modules (date-utils, validation-utils, etc)
      complexity: moderate
      estimated_hours: 16
  - id: MAINT-001
    category: maintainability
    description: Circular dependency between api-routes, services, models
    severity: 7
    likelihood: 8
    risk_score: 56
    impact: Difficult to reason about code flow, hard to refactor
    affected_components: [api-routes, services, models]
    remediation:
      action: Extract shared types to separate module, remove backward imports
      complexity: moderate
      estimated_hours: 8

medium_risks:
  - id: SCALE-001
    category: scalability
    description: No caching layer for expensive database queries
    severity: 6
    likelihood: 6
    risk_score: 36
    impact: Database bottleneck under high traffic
    affected_components: [database-layer]
    remediation:
      action: Implement Redis caching for frequently accessed data
      complexity: moderate
      estimated_hours: 12
  - id: DEBT-002
    category: technical_debt
    description: Test coverage at 11% (target 80%)
    severity: 5
    likelihood: 7
    risk_score: 35
    impact: Difficult to refactor safely, bugs slip through
    affected_components: [all]
    remediation:
      action: Add unit tests for critical paths, integration tests for API
      complexity: hard
      estimated_hours: 120

low_risks:
  - id: DEBT-003
    category: technical_debt
    description: 156 TODO comments in codebase
    severity: 3
    likelihood: 5
    risk_score: 15
    impact: Future work not being tracked, potential forgotten tasks
    affected_components: [various]
    remediation:
      action: Review TODOs, create issues for valid ones, remove stale ones
      complexity: easy
      estimated_hours: 4

technical_debt_breakdown:
  code_debt:
    god_files: 12
    estimated_hours: 48
  test_debt:
    coverage_gap: 69%
    estimated_hours: 120
  documentation_debt:
    missing_sections: [API docs, architecture docs, ADRs]
    estimated_hours: 24
  dependency_debt:
    outdated_packages: 28
    estimated_hours: 23.5
  total_estimated_hours: 287

security_summary:
  vulnerabilities:
    critical: 1
    high: 4
    moderate: 2
    low: 1
  exposed_secrets: 1
  missing_security_controls: 3
  compliance_issues: 1

performance_bottlenecks:
  - N+1 queries in dashboard (SEC-001)
  - Large bundle size (2.8 MB uncompressed)
  - No code splitting
  - Missing database indexes on user_id columns
  - Synchronous image processing blocking requests

scalability_limits:
  - Single PostgreSQL instance (no replicas)
  - Stateful session storage preventing horizontal scale
  - No load balancer configuration
  - Hard-coded limits (max 1000 users per query)

maintainability_issues:
  - High coupling (34 modules depend on utils)
  - Circular dependencies
  - Inconsistent error handling patterns
  - Mixed TypeScript/JavaScript (41% TS adoption)
  - No code style enforcement (Prettier not in pre-commit)

bus_factor: 2
bus_factor_risks:
  - Authentication system only understood by 1 developer
  - Legacy payment integration undocumented
  - Deployment process manual and undocumented

recommendations_by_priority:
  immediate:
    - Fix critical lodash CVE (0.5 hours)
    - Rotate and secure exposed API key (2 hours)
    - Add authentication to admin endpoints (1 hour)
  short_term:
    - Fix N+1 queries (2 hours)
    - Add database indexes (4 hours)
    - Implement caching layer (12 hours)
    - Break up god module (16 hours)
    - Resolve circular dependencies (8 hours)
  medium_term:
    - Increase test coverage to 60% (60 hours)
    - Update all outdated dependencies (23.5 hours)
    - Complete TypeScript migration (40 hours)
    - Add comprehensive documentation (24 hours)
  long_term:
    - Achieve 80% test coverage (120 hours)
    - Implement monitoring and alerting
    - Set up read replicas for database
    - Migrate to stateless sessions for horizontal scale

total_remediation_effort:
  critical: 3.5 hours
  high: 26 hours
  medium: 132 hours
  low: 4 hours
  total: 165.5 hours (not including full test coverage)

next_steps:
  - Address 3 critical security risks immediately
  - Create detailed remediation plan for high priority risks
  - Schedule technical debt reduction phases
  - Set up monitoring to track new risks
```
