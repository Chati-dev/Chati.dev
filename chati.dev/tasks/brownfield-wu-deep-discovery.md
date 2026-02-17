---
id: brownfield-wu-deep-discovery
agent: brownfield-wu
trigger: orchestrator
phase: discover
requires_input: false
parallelizable: false
outputs: [discovery.yaml]
handoff_to: brownfield-wu-dependency-scan
autonomous_gate: true
criteria:
  - Complete file tree analyzed (depth, breadth, patterns)
  - Code organization patterns identified
  - Development history assessed via git
  - Confidence >= 85%
---
# Deep Discovery of Existing Codebase

## Purpose
Perform comprehensive analysis of an existing codebase to understand structure, patterns, conventions, and development history.

## Prerequisites
- Project directory exists and is accessible
- Read permissions for all project files
- Git repository initialized (optional but recommended)

## Steps

### 1. Scan File System Structure
- Generate complete file tree with depth and file counts
- Calculate statistics:
  - Total files and directories
  - Maximum directory depth
  - Average files per directory
  - Largest files (top 10)
  - File extension distribution
- Identify standard directories:
  - Source: `src/`, `lib/`, `app/`, `packages/`
  - Tests: `test/`, `tests/`, `__tests__/`, `*.test.*`, `*.spec.*`
  - Documentation: `docs/`, `documentation/`, `*.md`
  - Configuration: `config/`, `.config/`, root-level config files
  - Build output: `dist/`, `build/`, `out/`, `.next/`
  - Dependencies: `node_modules/`, `vendor/`, `venv/`

### 2. Analyze Code Organization Patterns
- **Architecture Pattern Detection**:
  - MVC: `models/`, `views/`, `controllers/`
  - Layered: `presentation/`, `business/`, `data/`
  - Feature-based: `features/`, `modules/` with co-located concerns
  - Domain-driven: `domain/`, `application/`, `infrastructure/`
  - Monorepo: `packages/`, `apps/`, `libs/`
- **Naming Conventions**:
  - File naming: kebab-case, camelCase, PascalCase, snake_case
  - Component naming patterns
  - Test file patterns
  - Consistency score (0-100)
- **Code Organization Style**:
  - Co-location: Tests next to source vs. separate directory
  - Barrel exports: Presence of `index.js` re-exports
  - Module boundaries: Clear separation or tight coupling

### 3. Detect Frameworks and Libraries
- **Frontend Frameworks**:
  - React: `react` dependency, JSX/TSX files, `useState`, `useEffect` patterns
  - Vue: `vue` dependency, `.vue` files
  - Angular: `@angular/*` dependencies, `*.component.ts`
  - Svelte: `svelte` dependency, `.svelte` files
- **Backend Frameworks**:
  - Express: `express` dependency, `app.listen()`
  - Fastify: `fastify` dependency
  - NestJS: `@nestjs/*` dependencies, decorators
  - Django: `django` dependency, `manage.py`
  - Rails: `rails` dependency, `config/routes.rb`
- **Testing Frameworks**:
  - Jest, Vitest, Mocha, Jasmine, PyTest, RSpec
- **Build Tools**:
  - webpack, Vite, Rollup, Parcel, Turbopack
- **UI Libraries**:
  - Material-UI, Ant Design, Bootstrap, Tailwind

### 4. Identify Language and TypeScript Usage
- Count files by extension (`.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.rb`, etc.)
- Check for TypeScript configuration (`tsconfig.json`)
- Calculate TypeScript adoption:
  - Pure TypeScript: >90% of JS files are TS
  - Mixed: 10-90% TS
  - JavaScript-only: <10% TS or no TS
- Check for type coverage if TS (presence of `any`, type assertions)

### 5. Analyze Development History
If git repository exists:
- **Commit Activity**:
  - Total commits: `git rev-list --count HEAD`
  - First commit date: `git log --reverse --format=%aI | head -1`
  - Last commit date: `git log -1 --format=%aI`
  - Project age in days
  - Average commits per month
- **Contributor Analysis**:
  - Total contributors: `git shortlog -sn | wc -l`
  - Top 5 contributors by commit count
  - Active contributors (committed in last 3 months)
- **Branch Strategy**:
  - List all branches
  - Identify main branch (main, master, develop)
  - Count feature branches, stale branches
- **Commit Patterns**:
  - Conventional commits usage (feat:, fix:, etc.)
  - Average commit message length
  - Commit frequency (daily, weekly, sporadic)

### 6. Assess Code Quality Indicators
- **Linting Setup**:
  - ESLint, Pylint, RuboCop, etc.
  - Config files present
  - Pre-commit hooks configured
- **Formatting Setup**:
  - Prettier, Black, Gofmt
  - Config files and consistency
- **Type Checking**:
  - TypeScript, mypy, sorbet
  - Strictness settings
- **Testing**:
  - Test files count vs. source files count (test coverage proxy)
  - Test framework configuration
  - CI test integration
- **Documentation**:
  - README quality (length, sections, examples)
  - API documentation (JSDoc, Sphinx, RDoc)
  - Architecture diagrams or docs
  - CONTRIBUTING.md, CODE_OF_CONDUCT.md

### 7. Identify Technical Debt Indicators
- **Anti-patterns**:
  - Deeply nested directories (>7 levels)
  - God files (>1000 lines)
  - Circular dependencies (if detectable)
  - TODO/FIXME/HACK comments (count and examples)
- **Deprecation Warnings**:
  - Deprecated dependencies usage
  - Deprecated API calls in code
- **Unused Code**:
  - Commented-out code blocks
  - Unused imports (if lint config checks)
- **Inconsistencies**:
  - Multiple ways of doing same thing
  - Mixed styling approaches

### 8. Map Entry Points
- Identify application entry points:
  - Main files: `index.js`, `main.py`, `app.js`, `server.js`
  - Package.json scripts: `start`, `dev`, `build`
  - Docker entrypoints
  - CLI entrypoints
- Document startup sequence

### 9. Assess Documentation Quality
- **README.md**:
  - Present: yes/no
  - Length: lines of content
  - Sections: installation, usage, contributing, license
  - Code examples present
  - Quality score (0-100)
- **Other Docs**:
  - API documentation
  - Architecture decision records (ADRs)
  - Inline code comments ratio
  - Changelog

### 10. Calculate Discovery Confidence
- High confidence (90-100): Complete git history, clear patterns, well-documented
- Medium confidence (70-89): Some gaps, inconsistent patterns, sparse docs
- Low confidence (<70): Missing history, unclear patterns, no documentation

## Decision Points
- **Monorepo Detected**: Ask user which package is the focus for analysis
- **Multiple Frameworks**: If multiple frontend/backend frameworks detected, ask which is primary
- **Large Codebase (>10k files)**: Ask if analysis should be limited to specific directories

## Error Handling
- **Permission Denied**: Log inaccessible directories, continue with accessible areas
- **Git Not Available**: Skip git analysis, document as limitation
- **Binary Files**: Skip analysis of binary files (images, videos, compiled code)
- **Extremely Large Files (>10MB)**: Log but don't attempt to analyze content
- **Non-UTF8 Files**: Log encoding issues, skip content analysis

## Output Format
```yaml
# discovery.yaml
project_path: /Users/user/projects/legacy-app
timestamp: 2026-02-13T11:00:00Z
filesystem:
  total_files: 2847
  total_directories: 412
  max_depth: 9
  file_extensions:
    .js: 1243
    .ts: 876
    .json: 234
    .css: 156
    .md: 89
  largest_files:
    - path: src/utils/helpers.js
      size_kb: 245
    - path: src/components/Dashboard.tsx
      size_kb: 189
  standard_directories:
    source: [src]
    tests: [src/__tests__, tests]
    docs: [docs]
    config: [config]
    build_output: [dist, .next]

organization:
  architecture_pattern: feature-based
  naming_convention: camelCase
  consistency_score: 78
  module_boundaries: moderate_coupling
  test_colocation: false

frameworks:
  frontend:
    - name: React
      version: "17.0.2"
    - name: Next.js
      version: "12.3.1"
  backend:
    - name: Express
      version: "4.18.0"
  testing:
    - Jest
  build_tools:
    - webpack
  ui_libraries:
    - Material-UI

languages:
  primary: typescript
  adoption: mixed
  typescript_files: 876
  javascript_files: 1243
  typescript_percentage: 41

git_history:
  total_commits: 1847
  first_commit: 2021-03-15T10:23:00Z
  last_commit: 2026-02-10T16:45:00Z
  project_age_days: 1793
  avg_commits_per_month: 37
  total_contributors: 12
  top_contributors:
    - name: John Doe
      commits: 743
    - name: Jane Smith
      commits: 512
  active_contributors_3mo: 4
  main_branch: main
  feature_branches: 8
  stale_branches: 15
  conventional_commits: true

quality_indicators:
  linting:
    configured: true
    tool: ESLint
  formatting:
    configured: true
    tool: Prettier
  type_checking:
    configured: true
    strictness: moderate
  testing:
    test_files: 234
    source_files: 2119
    test_ratio: 0.11
  documentation:
    readme_present: true
    readme_quality: 75
    inline_comments: moderate

technical_debt:
  god_files: 12
  deep_nesting_dirs: 3
  todo_count: 156
  fixme_count: 43
  deprecated_dependencies: 8
  commented_code_blocks: 89

entry_points:
  - file: src/pages/_app.tsx
    type: next_js_app
  - file: server/index.js
    type: express_server
  - file: package.json
    scripts:
      dev: "next dev"
      build: "next build"
      start: "next start"

confidence: 87
confidence_reasoning: |
  High confidence due to complete git history, clear Next.js + Express architecture,
  and good documentation. Slight reduction due to mixed TypeScript adoption and
  moderate technical debt.

recommendations:
  - Complete TypeScript migration for consistency
  - Address 12 god files (>1000 lines)
  - Increase test coverage from 11% to at least 60%
  - Update 8 deprecated dependencies
  - Clean up 89 commented code blocks
  - Archive 15 stale git branches
```
