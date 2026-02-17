---
id: greenfield-wu-analyze-empty
agent: greenfield-wu
trigger: orchestrator
phase: discover
requires_input: false
parallelizable: false
outputs: [wu-analysis.yaml]
handoff_to: greenfield-wu-scaffold-detection
autonomous_gate: true
criteria:
  - Runtime environment detected (node, python, etc.)
  - Existing configuration files catalogued
  - Git state analyzed (initialized, remote, branches)
  - Project root structure documented
---
# Analyze Empty Project

## Purpose
Perform initial analysis of an empty or minimal project directory to establish baseline environment and detect any existing configuration.

## Prerequisites
- Project directory exists
- User has read permissions
- Path to project root is known

## Steps

### 1. Detect Runtime Environment
- Check for runtime indicators:
  - Node.js: `package.json`, `.nvmrc`, `node_modules/`
  - Python: `requirements.txt`, `pyproject.toml`, `setup.py`, `venv/`, `.python-version`
  - Ruby: `Gemfile`, `.ruby-version`
  - PHP: `composer.json`
  - Go: `go.mod`
  - Rust: `Cargo.toml`
  - Java: `pom.xml`, `build.gradle`
- Record detected runtimes and versions if specified
- Flag multi-runtime projects

### 2. Scan Configuration Files
- Search for common config files:
  - Editor configs: `.editorconfig`, `.vscode/`, `.idea/`
  - Linters: `.eslintrc*`, `.prettierrc*`, `pylint.rc`, `rubocop.yml`
  - Type checkers: `tsconfig.json`, `mypy.ini`
  - Build tools: `webpack.config.js`, `vite.config.ts`, `rollup.config.js`
  - CI/CD: `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`
  - Docker: `Dockerfile`, `docker-compose.yml`
  - Environment: `.env.example`, `.env.template`
- Catalog all found configurations with paths

### 3. Analyze Git State
- Check if git repository is initialized (`git rev-parse --git-dir`)
- If initialized:
  - Get current branch (`git branch --show-current`)
  - List all branches (`git branch -a`)
  - Check for remote (`git remote -v`)
  - Count commits (`git rev-list --count HEAD`)
  - Check for uncommitted changes (`git status --porcelain`)
- If not initialized:
  - Flag as new repository
  - Recommend initialization

### 4. Document Directory Structure
- List top-level directories and files
- Identify standard patterns:
  - `src/`, `lib/`, `app/` = source code
  - `test/`, `tests/`, `__tests__/` = test files
  - `docs/`, `documentation/` = documentation
  - `public/`, `static/` = static assets
  - `scripts/`, `bin/` = utility scripts
  - `config/`, `configs/` = configuration
- Calculate total file count and directory depth

### 5. Detect Existing Frameworks
- Look for framework indicators:
  - React: `react` in dependencies, `src/App.jsx`
  - Next.js: `next.config.js`, `pages/` or `app/`
  - Vue: `vue` in dependencies, `*.vue` files
  - Angular: `angular.json`
  - Express: `express` in dependencies
  - Django: `manage.py`, `settings.py`
  - Rails: `Rakefile`, `config/routes.rb`
- Record framework names and versions

### 6. Assess Project Maturity
- Calculate maturity score based on:
  - Presence of tests (0-25 points)
  - CI/CD configuration (0-25 points)
  - Documentation (0-25 points)
  - Linting/formatting setup (0-25 points)
- Classify as: empty (0-10), minimal (11-40), basic (41-70), mature (71-100)

### 7. Identify Missing Essentials
- Check for critical files:
  - `README.md` - project documentation
  - `LICENSE` - licensing information
  - `.gitignore` - git exclusions
  - `CONTRIBUTING.md` - contribution guidelines (for open source)
- Flag missing files as recommendations

### 8. Compile Analysis Report
- Aggregate all findings into structured YAML
- Include confidence scores for each detection
- Add recommendations for next steps

## Decision Points
- **Multi-Runtime Detected**: Ask user which runtime is primary
- **No Runtime Detected**: Ask user to specify intended runtime
- **Git Remote Mismatch**: If remote exists but doesn't match user's organization, flag for review

## Error Handling
- **Permission Denied**: Request user to check directory permissions or run with appropriate access
- **Invalid Project Path**: Verify path exists and retry, or ask user to provide correct path
- **Git Not Installed**: Flag git operations as skipped, continue with other analysis
- **Corrupted Config Files**: Note files that cannot be parsed, continue analysis

## Output Format
```yaml
# wu-analysis.yaml
project_path: /absolute/path/to/project
analysis_timestamp: 2026-02-13T10:30:00Z
runtime:
  detected: [node, python]
  primary: node
  versions:
    node: "22.22.0"
    npm: "10.5.0"
configuration_files:
  - path: package.json
    type: npm_manifest
    valid: true
  - path: tsconfig.json
    type: typescript_config
    valid: true
git:
  initialized: true
  branch: main
  remote: origin
  remote_url: https://github.com/user/repo.git
  commit_count: 3
  uncommitted_changes: false
structure:
  directories: [src, tests, docs]
  file_count: 12
  max_depth: 3
frameworks:
  - name: react
    version: "18.2.0"
  - name: vite
    version: "5.0.0"
maturity:
  score: 35
  classification: minimal
  breakdown:
    tests: 10
    ci_cd: 0
    docs: 15
    linting: 10
missing_essentials:
  - README.md
  - LICENSE
  - .gitignore
recommendations:
  - Add README.md with project description
  - Initialize .gitignore for Node.js
  - Set up basic testing framework
confidence: 95
```
