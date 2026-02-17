---
id: greenfield-wu-report
agent: greenfield-wu
trigger: greenfield-wu-tech-stack-assess
phase: discover
requires_input: false
parallelizable: false
outputs: [wu-report.yaml]
handoff_to: brief
autonomous_gate: true
criteria:
  - All analysis artifacts consolidated
  - Clear recommendations provided
  - Risk assessment included
  - Next steps documented
---
# Compile Greenfield WU Report

## Purpose
Consolidate all greenfield analysis findings into a comprehensive Work Understanding report that provides clear recommendations and next steps.

## Prerequisites
- `wu-analysis.yaml` exists
- `scaffold-report.yaml` exists
- `tech-stack.yaml` exists

## Steps

### 1. Load All Analysis Artifacts
- Read `wu-analysis.yaml` for environment and maturity assessment
- Read `scaffold-report.yaml` for scaffolding recommendations
- Read `tech-stack.yaml` for complete stack recommendations
- Verify all files are valid YAML and contain expected keys

### 2. Create Executive Summary
Write a 3-5 sentence summary covering:
- Current project state (empty, minimal, or basic)
- Detected runtime and existing setup (if any)
- Recommended scaffolding tool
- Recommended tech stack highlights
- Estimated time to initial scaffold

### 3. Consolidate Environment Analysis
Summarize from `wu-analysis.yaml`:
- **Project Path**: Absolute path to project
- **Current State**: Empty, minimal, or basic with maturity score
- **Runtime Environment**: Detected runtimes and versions
- **Git Status**: Initialized, branch, remote status
- **Existing Configuration**: List of found config files
- **Missing Essentials**: Critical files not present

### 4. Consolidate Scaffolding Recommendations
Summarize from `scaffold-report.yaml`:
- **Recommended Tool**: Top choice with score
- **Command to Run**: Exact scaffolding command
- **Alternatives**: Brief mention of alternatives considered
- **Justification**: Why this tool was chosen

### 5. Consolidate Tech Stack
Summarize from `tech-stack.yaml`:
- **Frontend**: Framework, UI library, build tool
- **Backend**: Runtime, framework, API style
- **Database**: Primary database and cache
- **Infrastructure**: Hosting and CI/CD
- **Key Justifications**: Major reasoning for choices

### 6. Aggregate Risk Assessment
Compile all risks mentioned across artifacts:
- Runtime/version compatibility risks
- Tool maintenance risks
- Team expertise gaps
- Vendor lock-in concerns
- Performance bottlenecks
- Security considerations
For each risk:
- Severity: Low, Medium, High, Critical
- Likelihood: Low, Medium, High
- Impact: What happens if risk materializes
- Mitigation: How to address or reduce risk

### 7. Calculate Confidence Score
Determine overall confidence (0-100) based on:
- Environment detection confidence (from wu-analysis.yaml)
- Availability of clear requirements (if ambiguous, reduce confidence)
- Maturity of recommended tools (bleeding edge = lower confidence)
- Team expertise match (unknown team = lower confidence)
- Compatibility verification (verified = higher confidence)

### 8. Define Next Steps
Provide ordered list of immediate actions:
1. **Review and Approve**: User reviews this report and tech stack
2. **Run Scaffold Command**: Execute recommended scaffolding
3. **Install Dependencies**: Any additional packages needed
4. **Configure Tooling**: Set up linters, formatters, type checkers
5. **Initialize Git** (if not already): Commit initial scaffold
6. **Create Brief**: Move to requirements gathering phase

### 9. Add Recommendations
Include actionable recommendations:
- **Immediate**: Actions to take before writing code
- **Short-term**: Set up during Phase 1 (CI/CD, testing)
- **Medium-term**: Add as project matures (monitoring, documentation site)
- **Long-term**: Consider for scale (microservices, caching layers)

### 10. Generate Final Report
Combine all sections into structured YAML with clear hierarchy and human-readable formatting.

## Decision Points
- **Low Confidence (<70%)**: Flag the report for user review and ask if additional analysis is needed before proceeding
- **High Risk Identified**: If any critical risks found, highlight prominently and recommend risk mitigation tasks before development
- **Conflicting Data**: If analysis artifacts have conflicting information (e.g., scaffold-report suggests different runtime than wu-analysis), flag conflict and ask for clarification

## Error Handling
- **Missing Artifact**: If any prerequisite YAML file is missing, halt and request that previous task be completed
- **Invalid YAML**: If any artifact cannot be parsed, log error with file path and line number, attempt to continue with partial data
- **Empty Recommendations**: If tech-stack.yaml has no recommendations, flag as error and request tech-stack-assess be re-run
- **Circular Dependencies**: If next_steps reference tasks that reference back, flag as planning error

## Output Format
```yaml
# wu-report.yaml
report_type: greenfield
timestamp: 2026-02-13T10:45:00Z
executive_summary: |
  Empty Node.js project detected with no existing framework. Recommended scaffolding
  with Vite for React + TypeScript. Full-stack architecture recommended with
  Fastify backend, PostgreSQL database, and deployment on Vercel + Railway.
  Estimated 30 minutes to initial scaffold, 2-4 hours to complete tooling setup.

environment:
  project_path: /Users/user/projects/my-app
  current_state: empty
  maturity_score: 0
  runtime:
    primary: node
    version: "22.22.0"
  git:
    initialized: false
    recommendation: Initialize after scaffold
  existing_config: []
  missing_essentials:
    - README.md
    - .gitignore
    - LICENSE

scaffolding:
  recommended_tool: vite
  command: npm create vite@latest my-app -- --template react-ts
  justification: |
    Fast build times, modern architecture, excellent TypeScript support.
    Minimal but extensible starting point for React applications.
  alternatives:
    - create-next-app: Full-stack needs
    - create-react-app: Traditional setup (slower builds)
  estimated_time: 5 minutes

tech_stack:
  frontend:
    framework: React 18.2
    ui_library: shadcn/ui
    build_tool: Vite
    state: TanStack Query
  backend:
    runtime: Node.js 22.x
    framework: Fastify
    orm: Prisma
  database:
    primary: PostgreSQL 16
    cache: Redis 7
  infrastructure:
    hosting_frontend: Vercel
    hosting_backend: Railway
    ci_cd: GitHub Actions
  justification_summary: |
    Modern React stack prioritizing developer experience and type safety.
    Node.js backend for shared language. PostgreSQL for data integrity.
    Vercel + Railway for simple deployment with good free tiers.

risks:
  - id: R1
    description: Team unfamiliarity with Fastify
    severity: medium
    likelihood: medium
    impact: Slower initial backend development
    mitigation: Provide Fastify learning resources, leverage strong documentation
  - id: R2
    description: Node.js single-threaded performance limits
    severity: low
    likelihood: low
    impact: May need to refactor under extreme load
    mitigation: Use clustering, profile early, consider Go microservices for hot paths
  - id: R3
    description: Rapid JavaScript ecosystem churn
    severity: medium
    likelihood: high
    impact: Frequent breaking changes requiring updates
    mitigation: Pin versions carefully, allocate time for quarterly dependency updates

confidence: 85
confidence_breakdown:
  environment_detection: 95
  requirements_clarity: 70
  tool_maturity: 90
  team_expertise: 75
  compatibility: 95

next_steps:
  - step: 1
    action: Review and approve WU report
    owner: user
    estimated_time: 15 minutes
  - step: 2
    action: Run scaffolding command
    command: npm create vite@latest my-app -- --template react-ts
    owner: greenfield-wu
    estimated_time: 5 minutes
  - step: 3
    action: Install additional dependencies
    commands:
      - cd my-app && npm install
      - npm install -D prettier eslint
    estimated_time: 3 minutes
  - step: 4
    action: Initialize git repository
    commands:
      - git init
      - git add .
      - git commit -m "chore: initial scaffold"
    estimated_time: 2 minutes
  - step: 5
    action: Transition to brief agent for requirements gathering
    owner: orchestrator
    handoff: brief

recommendations:
  immediate:
    - Create .env.example for environment variable documentation
    - Set up .gitignore for Node.js (node_modules, .env, dist)
    - Add README.md with setup instructions
  short_term:
    - Configure GitHub Actions for CI (lint, test, build)
    - Set up Prettier and ESLint with pre-commit hooks
    - Add Vitest and React Testing Library
    - Create basic component structure (components/, pages/, utils/)
  medium_term:
    - Set up Sentry or similar error tracking
    - Add Storybook for component documentation
    - Create API integration layer with TanStack Query
    - Set up database with Prisma schema
  long_term:
    - Consider monorepo structure if multiple apps needed
    - Implement monitoring and alerting
    - Add end-to-end testing with Playwright
    - Evaluate micro-frontend architecture for scale

artifacts_generated:
  - wu-analysis.yaml
  - scaffold-report.yaml
  - tech-stack.yaml
  - wu-report.yaml

handoff_to: brief
handoff_context: |
  Greenfield project setup complete. Recommended stack defined. Next phase
  is requirements gathering to define features and scope before development.
```
