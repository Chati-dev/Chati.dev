---
id: greenfield-wu-scaffold-detection
agent: greenfield-wu
trigger: greenfield-wu-analyze-empty
phase: discover
requires_input: false
parallelizable: false
outputs: [scaffold-report.yaml]
handoff_to: greenfield-wu-tech-stack-assess
autonomous_gate: true
criteria:
  - All available scaffolding tools identified for detected runtime
  - Tool compatibility assessed
  - Recommendations ranked by suitability
---
# Detect Project Scaffolding Tools

## Purpose
Identify and evaluate available project scaffolding tools that match the detected runtime environment and project requirements.

## Prerequisites
- `wu-analysis.yaml` exists with runtime detection
- Internet connectivity for checking tool availability (optional)
- Knowledge of current project requirements

## Steps

### 1. Load Runtime Context
- Read `wu-analysis.yaml` to get detected runtime(s)
- Extract primary runtime and version
- Note any existing frameworks or build tools

### 2. Map Runtime to Scaffolding Tools
- **Node.js/JavaScript/TypeScript**:
  - `create-react-app` - React applications
  - `vite` - Fast modern build tool (React, Vue, Svelte, Vanilla)
  - `create-next-app` - Next.js applications
  - `create-vue` - Vue.js applications
  - `@angular/cli` - Angular applications
  - `create-remix` - Remix applications
  - `create-t3-app` - Full-stack TypeScript (Next.js + tRPC + Tailwind + Prisma)
  - `create-expo-app` - React Native/Expo mobile apps
  - `express-generator` - Express.js backend
  - `nest-cli` - NestJS backend
- **Python**:
  - `django-admin startproject` - Django web framework
  - `flask` - Flask microframework (manual setup)
  - `fastapi` - FastAPI modern API framework
  - `cookiecutter` - Template-based project generator
  - `poetry new` - Poetry package manager with project scaffolding
- **Ruby**:
  - `rails new` - Ruby on Rails
  - `hanami new` - Hanami framework
  - `sinatra` - Sinatra microframework (manual setup)
- **PHP**:
  - `composer create-project laravel/laravel` - Laravel
  - `symfony new` - Symfony
- **Go**:
  - `go mod init` - Go modules (manual structure)
  - `gonew` - Go project templates
- **Rust**:
  - `cargo new` - Rust binary/library
- **Java**:
  - Spring Initializr - Spring Boot
  - Maven archetypes
  - Gradle init

### 3. Filter by Project Type
- Determine project type from requirements or ask user:
  - Web application (frontend)
  - Web application (fullstack)
  - API/Backend service
  - Mobile application
  - CLI tool
  - Library/Package
- Remove incompatible scaffolding tools

### 4. Assess Tool Compatibility
For each remaining tool, evaluate:
- **Version Compatibility**: Does it support the detected runtime version?
- **Maintenance Status**: Is the tool actively maintained? (check last release date)
- **Community Size**: NPM downloads, GitHub stars, community activity
- **Flexibility**: How much control does it give vs. abstraction?
- **Ejection Support**: Can you customize deeply or "eject"?
- **TypeScript Support**: Native or via plugin?
- **Testing Setup**: Does it include testing framework?
- **Build Performance**: Known for fast/slow builds?

### 5. Check for Existing Scaffolding
- If `wu-analysis.yaml` shows existing framework:
  - Identify the scaffolding tool that was likely used
  - Check if re-scaffolding is needed or if incremental setup is better
  - Flag if existing setup is non-standard

### 6. Rank Recommendations
- Assign score (0-100) to each tool based on:
  - Match to project requirements (40 points)
  - Community support (20 points)
  - Maintenance status (15 points)
  - TypeScript support if needed (10 points)
  - Build performance (10 points)
  - Developer experience (5 points)
- Sort by score descending
- Select top 3 recommendations

### 7. Document Trade-offs
For each recommended tool, document:
- **Pros**: What it does well
- **Cons**: Known limitations or issues
- **Use Case**: When to choose this tool
- **Learning Curve**: Beginner-friendly vs. advanced
- **Vendor Lock-in**: How easy to migrate away

### 8. Generate Scaffold Commands
For each recommendation, provide:
- Exact command to run
- Required prerequisites (global installs, etc.)
- Expected output
- Post-scaffold next steps

## Decision Points
- **Multiple Runtimes**: If project uses multiple runtimes (e.g., Node + Python), ask user which runtime should be primary for scaffolding
- **Existing Framework Conflict**: If analysis detected existing framework but user wants to scaffold fresh, confirm they want to overwrite
- **Opinionated vs. Flexible**: If requirements are unclear, ask user preference for opinionated (batteries-included) vs. flexible (minimal) setup

## Error Handling
- **Unknown Runtime**: If runtime not recognized, skip scaffold detection and document manual setup requirement
- **No Tools Available**: If no scaffolding tools exist for the runtime, provide manual project structure recommendations
- **Version Mismatch**: If detected runtime version is too old for modern scaffolding tools, warn user and suggest upgrade path
- **Conflicting Requirements**: If requirements suggest incompatible tools (e.g., React + Vue), flag conflict and request clarification

## Output Format
```yaml
# scaffold-report.yaml
runtime: node
runtime_version: "22.22.0"
project_type: web_application_frontend
existing_scaffold: null
available_tools:
  - name: vite
    score: 95
    command: npm create vite@latest my-app -- --template react-ts
    prerequisites: [npm >= 7.0.0]
    pros:
      - Extremely fast HMR and build times
      - Modern ESM-based architecture
      - First-class TypeScript support
      - Framework-agnostic (React, Vue, Svelte, etc.)
    cons:
      - Less opinionated than CRA
      - Smaller ecosystem of plugins vs. webpack
    use_case: Modern React/Vue/Svelte apps prioritizing build speed
    learning_curve: easy
    vendor_lockin: low
    compatibility:
      node: ">= 18.0.0"
      typescript: true
      testing: vitest
    maintenance:
      last_release: 2026-01-15
      status: active
      community_size: high
  - name: create-next-app
    score: 88
    command: npx create-next-app@latest my-app --typescript --tailwind --app
    prerequisites: []
    pros:
      - Full-stack framework (SSR, API routes, file-based routing)
      - Excellent developer experience
      - Strong community and Vercel backing
    cons:
      - More complex than pure React
      - Some vendor lock-in to Next.js patterns
    use_case: Full-stack React apps with SSR/SSG needs
    learning_curve: moderate
    vendor_lockin: medium
  - name: create-react-app
    score: 72
    command: npx create-react-app my-app --template typescript
    prerequisites: []
    pros:
      - Zero config setup
      - Battle-tested and stable
      - Large ecosystem
    cons:
      - Slow build times
      - Maintenance has slowed
      - Difficult to customize without ejecting
    use_case: Traditional React SPAs, learning projects
    learning_curve: easy
    vendor_lockin: low
recommended: vite
reasoning: |
  Vite offers the best balance of performance, flexibility, and modern architecture
  for a new React TypeScript project. Its HMR is significantly faster than alternatives,
  and it provides a minimal but extensible starting point.
next_steps:
  - Run scaffold command
  - Install additional dependencies if needed
  - Configure linting and formatting
  - Set up testing framework (Vitest recommended)
timestamp: 2026-02-13T10:35:00Z
```
