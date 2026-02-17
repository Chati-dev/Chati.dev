---
id: brownfield-wu-dependency-scan
agent: brownfield-wu
trigger: brownfield-wu-deep-discovery
phase: discover
requires_input: false
parallelizable: true
outputs: [dependencies.yaml]
handoff_to: brownfield-wu-architecture-map
autonomous_gate: true
criteria:
  - All dependency manifests parsed
  - Security vulnerabilities identified
  - Update status assessed for all dependencies
---
# Scan Project Dependencies

## Purpose
Analyze all project dependencies for versions, vulnerabilities, update status, license compliance, and bundle size impact.

## Prerequisites
- `discovery.yaml` exists with detected frameworks
- Dependency manifest files exist (package.json, requirements.txt, Gemfile, etc.)
- Internet connectivity for vulnerability databases (optional but recommended)

## Steps

### 1. Identify Dependency Manifests
Based on detected runtime from `discovery.yaml`:
- **Node.js**: `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- **Python**: `requirements.txt`, `Pipfile`, `poetry.lock`, `pyproject.toml`
- **Ruby**: `Gemfile`, `Gemfile.lock`
- **PHP**: `composer.json`, `composer.lock`
- **Go**: `go.mod`, `go.sum`
- **Rust**: `Cargo.toml`, `Cargo.lock`
- **Java**: `pom.xml`, `build.gradle`

### 2. Parse Direct Dependencies
For each manifest file:
- Extract all direct dependencies (not dev dependencies separately)
- Record current versions
- Identify version constraints (^, ~, >=, exact)
- Count total dependencies
- Categorize:
  - **Production**: Required at runtime
  - **Development**: Build, test, lint tools
  - **Peer**: Expected to be provided by consumer

### 3. Analyze Dependency Tree
- Build complete dependency tree including transitive dependencies
- Calculate tree statistics:
  - Total unique packages (including transitives)
  - Maximum depth
  - Most depended-upon packages
  - Duplicate dependencies (same package, different versions)
- Identify potential issues:
  - Circular dependencies
  - Version conflicts
  - Missing peer dependencies

### 4. Check for Vulnerabilities
- **Node.js**: Run `npm audit` or `yarn audit` or `pnpm audit`
- **Python**: Run `pip-audit` or check against PyPI advisory database
- **Ruby**: Run `bundle audit`
- **Other languages**: Use appropriate security scanners
- For each vulnerability:
  - CVE ID or advisory ID
  - Severity (critical, high, moderate, low)
  - Affected package and version range
  - Fixed version (if available)
  - Exploitability (proof of concept exists?)
  - CVSS score
- Aggregate by severity:
  - Critical: Immediate attention required
  - High: Should fix soon
  - Moderate: Fix when convenient
  - Low: Monitor but not urgent

### 5. Assess Update Status
For each direct dependency:
- Current version: e.g., "4.18.0"
- Latest version: Query package registry (npm, PyPI, RubyGems, etc.)
- Latest compatible version: Respecting semver constraints
- Version lag:
  - Current: 0-3 months behind
  - Stale: 3-12 months behind
  - Outdated: >12 months behind
  - Abandoned: No updates in >24 months
- Breaking changes: Major version behind
- Check deprecation status:
  - Deprecated: Package marked as deprecated
  - Unmaintained: No commits in >18 months
  - Archived: Repository archived

### 6. Analyze License Compliance
For each dependency:
- Extract license type (MIT, Apache-2.0, GPL, proprietary, etc.)
- Check license compatibility with project license
- Flag concerning licenses:
  - Copyleft (GPL, AGPL) if project is proprietary
  - Proprietary/commercial licenses
  - Unknown or missing licenses
- Generate license summary:
  - Count by license type
  - Identify incompatibilities
  - List packages requiring attribution

### 7. Estimate Bundle Size Impact (Frontend)
For frontend dependencies:
- Check package size on npm (unpacked size)
- Identify heaviest dependencies (top 10)
- Estimate total bundle size contribution
- Flag unnecessarily large dependencies:
  - Full libraries when only small part used (e.g., lodash vs. lodash-es)
  - Multiple similar libraries (moment + date-fns)
  - Unused dependencies (imported but never used)

### 8. Identify Duplicate and Redundant Packages
- **Duplicates**: Same functionality, different packages
  - Example: axios + node-fetch + got (all HTTP clients)
  - Example: moment + date-fns + dayjs (all date libraries)
- **Overlapping**: Packages with overlapping functionality
  - Example: lodash + underscore
  - Example: Express + Koa (both loaded)
- **Unused**: Packages in manifest but not imported in code
  - Scan for import statements
  - Cross-reference with installed packages
  - Flag as removal candidates

### 9. Check for Malicious Packages
- Check package names against known typosquatting patterns
- Verify package publishers (established vs. new accounts)
- Check for sudden maintainer changes
- Flag suspicious patterns:
  - Obfuscated code in dependencies
  - Unexpected network requests
  - Unusual postinstall scripts

### 10. Generate Update Recommendations
Prioritize updates:
- **Priority 1 (Urgent)**: Critical vulnerabilities, deprecated packages
- **Priority 2 (High)**: High-severity vulnerabilities, major versions behind
- **Priority 3 (Medium)**: Moderate vulnerabilities, stale packages
- **Priority 4 (Low)**: Minor updates, no security impact
For each recommendation:
- Package name and current version
- Target version
- Migration complexity (easy, moderate, hard)
- Breaking changes summary (if major version)
- Estimated effort (hours)

## Decision Points
- **Critical Vulnerabilities Found**: Ask user if they want to pause analysis and fix vulnerabilities immediately
- **Major Version Behind**: If many dependencies are multiple major versions behind, ask if user wants to plan migration before continuing
- **License Incompatibilities**: If GPL dependencies found in proprietary project, flag immediately and ask for review

## Error Handling
- **Network Unavailable**: Skip vulnerability and update checks, document as limitation
- **Registry Rate Limit**: Back off and retry, or continue with cached data if available
- **Corrupt Lock File**: Attempt to regenerate from manifest, or flag for manual fix
- **Parsing Errors**: Log specific manifest parsing errors, attempt to continue with partial data

## Output Format
```yaml
# dependencies.yaml
timestamp: 2026-02-13T11:15:00Z
project_path: /Users/user/projects/legacy-app
runtime: node

manifests:
  - file: package.json
    type: npm
    valid: true
  - file: package-lock.json
    type: npm_lock
    valid: true

summary:
  total_direct: 87
  total_transitive: 1243
  production: 62
  development: 25
  total_unique: 1330
  tree_depth: 8

direct_dependencies:
  production:
    - name: react
      current_version: "17.0.2"
      latest_version: "18.2.0"
      latest_compatible: "17.0.2"
      status: outdated
      months_behind: 24
      breaking_changes: true
      vulnerabilities: 0
      license: MIT
    - name: express
      current_version: "4.18.0"
      latest_version: "4.18.2"
      latest_compatible: "4.18.2"
      status: stale
      months_behind: 8
      breaking_changes: false
      vulnerabilities: 1
      license: MIT
    - name: lodash
      current_version: "4.17.20"
      latest_version: "4.17.21"
      latest_compatible: "4.17.21"
      status: outdated
      months_behind: 18
      breaking_changes: false
      vulnerabilities: 3
      license: MIT
  development:
    - name: webpack
      current_version: "5.75.0"
      latest_version: "5.90.0"
      latest_compatible: "5.90.0"
      status: stale
      months_behind: 6
      breaking_changes: false
      vulnerabilities: 0
      license: MIT

vulnerabilities:
  critical: 1
  high: 4
  moderate: 12
  low: 8
  total: 25
  details:
    - id: CVE-2023-45857
      package: lodash
      severity: critical
      cvss_score: 9.8
      affected_versions: "<=4.17.20"
      fixed_version: "4.17.21"
      description: Prototype pollution vulnerability
      exploitable: true
      patch_available: true
    - id: GHSA-xxx-yyy-zzz
      package: express
      severity: moderate
      cvss_score: 5.3
      affected_versions: "4.0.0 - 4.18.1"
      fixed_version: "4.18.2"
      description: Open redirect vulnerability
      exploitable: false
      patch_available: true

update_status:
  current: 23
  stale: 31
  outdated: 28
  abandoned: 5

deprecated_packages:
  - name: request
    current_version: "2.88.2"
    deprecated_since: 2020-02-11
    replacement: axios, node-fetch, or got
    usage_count: 3

licenses:
  summary:
    MIT: 1156
    Apache-2.0: 87
    BSD-3-Clause: 45
    ISC: 32
    GPL-3.0: 2
    Unknown: 8
  incompatibilities:
    - package: some-gpl-package
      license: GPL-3.0
      issue: Copyleft license incompatible with proprietary project
      recommendation: Find MIT/Apache alternative or obtain commercial license

bundle_size:
  total_estimated_kb: 2847
  heaviest_packages:
    - name: moment
      size_kb: 523
      recommendation: Replace with date-fns (tree-shakeable) or dayjs (smaller)
    - name: lodash
      size_kb: 456
      recommendation: Use lodash-es for tree-shaking or individual imports
    - name: material-ui
      size_kb: 1234
      recommendation: Already optimized, ensure tree-shaking configured

duplicates_and_redundancy:
  duplicate_functionality:
    - packages: [axios, node-fetch]
      type: http_client
      recommendation: Standardize on axios (already primary)
      potential_savings_kb: 89
    - packages: [moment, date-fns]
      type: date_library
      recommendation: Migrate to date-fns (smaller, tree-shakeable)
      potential_savings_kb: 523
  unused_packages:
    - name: uuid
      last_used: never
      recommendation: Remove
    - name: color
      last_used: never
      recommendation: Remove

update_recommendations:
  priority_1_urgent:
    - package: lodash
      action: update 4.17.20 → 4.17.21
      reason: Critical vulnerability CVE-2023-45857
      complexity: easy
      breaking_changes: false
      estimated_hours: 0.5
  priority_2_high:
    - package: react
      action: update 17.0.2 → 18.2.0
      reason: 2 major versions behind, new features, better performance
      complexity: hard
      breaking_changes: true
      breaking_changes_summary: |
        - ReactDOM.render → ReactDOM.createRoot
        - Automatic batching of state updates
        - Concurrent features require opt-in
        - Some legacy APIs deprecated
      estimated_hours: 16
  priority_3_medium:
    - package: express
      action: update 4.18.0 → 4.18.2
      reason: Moderate vulnerability, minor version behind
      complexity: easy
      breaking_changes: false
      estimated_hours: 1
  priority_4_low:
    - package: webpack
      action: update 5.75.0 → 5.90.0
      reason: 6 months behind, performance improvements
      complexity: moderate
      breaking_changes: false
      estimated_hours: 2

estimated_total_update_effort:
  priority_1: 0.5 hours
  priority_2: 16 hours
  priority_3: 3 hours
  priority_4: 4 hours
  total: 23.5 hours

recommendations:
  - Fix critical lodash vulnerability immediately
  - Plan React 17→18 migration as dedicated phase (16 hours)
  - Remove unused packages (uuid, color) to reduce bloat
  - Replace moment with date-fns for bundle size reduction (523 KB savings)
  - Standardize on single HTTP client (axios)
  - Address GPL-licensed package incompatibility
```
