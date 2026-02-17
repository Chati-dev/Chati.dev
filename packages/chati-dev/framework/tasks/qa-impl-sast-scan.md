---
id: qa-impl-sast-scan
agent: qa-implementation
trigger: qa-impl-test-execute
phase: build
requires_input: false
parallelizable: false
outputs: [sast-report.yaml]
handoff_to: qa-impl-regression-check
autonomous_gate: false
criteria:
  - SAST scan executed successfully
  - Zero critical vulnerabilities
  - High severity vulnerabilities under threshold
  - Findings categorized and prioritized
---

# Static Analysis Security Testing

## Purpose
Run static analysis security testing (SAST) to identify security vulnerabilities, code quality issues, and potential bugs in the codebase before deployment.

## Prerequisites
- test-results.yaml with PASS status (all tests passing)
- SAST tools configured (eslint-plugin-security, semgrep, or similar)
- Codebase committed to version control (for diff analysis)
- qa-plan.yaml with SAST thresholds

## Steps

1. **Verify SAST Tool Configuration**
   - Check for eslint-plugin-security in package.json or .eslintrc
   - Verify additional SAST tools if configured (semgrep, snyk code)
   - Ensure SAST rules are enabled (not just warnings)
   - Validate rule severity levels (error vs warning vs info)

2. **Run ESLint Security Scan**
   - Execute: `npm run lint -- --plugin security` or `eslint . --ext .js,.ts`
   - Capture all findings with file, line, rule, severity
   - Parse ESLint output (JSON format recommended)
   - Save raw output to sast-results/eslint-output.json

3. **Run Additional SAST Tools (if configured)**
   - **Semgrep**: `semgrep --config auto --json`
   - **npm audit**: `npm audit --json` (dependency vulnerabilities)
   - **Snyk Code**: `snyk code test --json` (if available)
   - Collect findings from each tool
   - Normalize findings to common format

4. **Categorize Findings by Severity**
   - **CRITICAL**: Remote code execution, SQL injection, command injection, hardcoded secrets
   - **HIGH**: Cross-site scripting, path traversal, insecure deserialization, weak crypto
   - **MEDIUM**: Information disclosure, missing input validation, error handling issues
   - **LOW**: Code quality, complexity, deprecated APIs, minor security practices

5. **Categorize Findings by Type**
   - **Security vulnerabilities**: Exploitable flaws
   - **Code quality issues**: Maintainability, readability, best practices
   - **Performance issues**: Inefficient algorithms, memory leaks
   - **Compatibility issues**: Deprecated APIs, version-specific problems

6. **Filter False Positives**
   - Review findings for common false positives:
     - Safe uses of eval() (e.g., in sandboxed contexts)
     - Path operations on validated inputs
     - Non-user-facing information disclosure
   - Mark suspected false positives for manual review
   - Document filtering decisions in sast-report.yaml

7. **Map Findings to Risk Areas**
   - Cross-reference findings with risk-matrix.yaml
   - Flag findings in critical-risk modules (state management, file operations)
   - Prioritize findings in high-risk modules (orchestrator, agents)
   - Note findings in low-risk modules for later review

8. **Check Against Quality Gates**
   - **BLOCKER threshold**: 0 critical vulnerabilities (from quality-gates.yaml)
   - **CRITICAL threshold**: < 3 high severity vulnerabilities
   - **MAJOR threshold**: < 10 medium severity issues
   - Calculate gate status (PASS, FAIL, WARN)

9. **Analyze Trends (if historical data available)**
   - Compare findings with previous scan (if available)
   - Track new vulnerabilities introduced in this phase
   - Track resolved vulnerabilities since last scan
   - Calculate vulnerability velocity (new - resolved per phase)

10. **Generate Remediation Guidance**
    - For each CRITICAL/HIGH finding:
      - Provide fix recommendation (code example if possible)
      - Link to security best practices documentation
      - Estimate fix effort (trivial, minor, major)
      - Suggest alternative approaches if fix is complex

11. **Create Exceptions List**
    - Document accepted vulnerabilities (with justification):
      - Why vulnerability is not exploitable in this context
      - Compensating controls in place
      - Timeline for eventual remediation
    - Require approval for critical/high exceptions

12. **Compile SAST Report**
    - Summarize findings by severity and type
    - List all CRITICAL and HIGH findings with details
    - Provide overall gate status (PASS, FAIL, CONDITIONAL)
    - Include remediation roadmap
    - Update session.yaml with scan results

## Decision Points

- **False Positive Threshold**: If >30% of findings appear to be false positives, consider adjusting SAST rules or adding project-specific exclusions. Document rule adjustments in .eslintrc with comments.

- **High Severity Exceptions**: If high-severity findings are in third-party dependencies (not fixable immediately), decide whether to accept risk or block release. Recommend: Accept with compensating controls + plan to upgrade dependency.

- **Code Quality vs Security**: If scan finds many code quality issues but few security issues, decide whether to report separately or include in SAST report. Recommend: Include summary in SAST report, detail in separate code-quality report.

## Error Handling

**SAST Tool Not Installed**
- If eslint-plugin-security is not installed, attempt: `npm install --save-dev eslint-plugin-security`
- If installation fails, log warning and proceed with basic eslint scan
- Flag missing SAST tool in report
- Recommend: Install proper SAST tooling for future scans

**Scan Timeout or Failure**
- If scan hangs or crashes, check for large files or complex code
- Try scanning in chunks (by directory)
- If still fails, proceed with partial results
- Log error and recommend manual security review

**Unparseable Output**
- If SAST tool output is in unexpected format, save raw output
- Attempt manual parsing for critical findings
- Provide summary based on exit code (non-zero = issues found)
- Recommend: Configure tool for JSON output

**Dependency Vulnerability Scan Failure**
- If npm audit fails (network issue, registry unavailable), log warning
- Proceed with code SAST only
- Flag missing dependency scan in report
- Recommend: Retry later or use alternative (Snyk, GitHub Dependabot)

## Output Format

```yaml
# sast-report.yaml
version: 1.0.0
created: YYYY-MM-DD
agent: qa-implementation
phase: build

summary:
  status: CONDITIONAL # PASS, FAIL, CONDITIONAL
  total_findings: 23
  critical: 0
  high: 2
  medium: 8
  low: 13
  false_positives_suspected: 3

tools:
  eslint:
    version: 8.x
    plugins: [security, node, import]
    exit_code: 1 # non-zero indicates issues
    findings: 18
    output_file: sast-results/eslint-output.json

  npm_audit:
    version: npm 10.x
    findings: 5
    output_file: sast-results/npm-audit.json

  semgrep:
    enabled: false

  snyk_code:
    enabled: false

findings:
  critical: []

  high:
    - id: SAST-001
      severity: HIGH
      type: security
      rule: detect-non-literal-fs-filename
      file: chati.dev/utils/file-ops.js
      line: 78
      message: "Potential path traversal: fs.readFile with non-literal filename"
      code_snippet: |
        const data = fs.readFileSync(userProvidedPath, 'utf8');
      risk_area: file_operations
      risk_level: high
      exploitable: true
      cvss_score: 7.5
      recommendation: |
        Validate and sanitize userProvidedPath before use:
        ```javascript
        const safePath = path.normalize(userProvidedPath).replace(/^(\.\.(\/|\\|$))+/, '');
        if (!safePath.startsWith(ALLOWED_BASE_DIR)) {
          throw new Error('Invalid path');
        }
        const data = fs.readFileSync(safePath, 'utf8');
        ```
      effort: minor
      references:
        - https://owasp.org/www-community/attacks/Path_Traversal

    - id: SAST-002
      severity: HIGH
      type: security
      rule: detect-child-process
      file: chati.dev/cli/commands/upgrade.js
      line: 156
      message: "Command injection risk: exec with user input"
      code_snippet: |
        exec(`npm install ${packageName}@latest`);
      risk_area: upgrade
      risk_level: high
      exploitable: true
      cvss_score: 8.1
      recommendation: |
        Use execFile with array arguments to prevent injection:
        ```javascript
        execFile('npm', ['install', `${packageName}@latest`]);
        ```
      effort: trivial
      references:
        - https://owasp.org/www-community/attacks/Command_Injection

  medium:
    - id: SAST-003
      severity: MEDIUM
      type: security
      rule: detect-no-csrf-before-method-override
      file: chati.dev/orchestrator.js
      line: 234
      message: "Missing input validation on user input"
      risk_area: orchestrator
      risk_level: medium
      exploitable: false
      recommendation: "Add Joi/Yup schema validation for user input"
      effort: minor

  low:
    - id: SAST-004
      severity: LOW
      type: code_quality
      rule: no-console
      file: chati.dev/agents/brief.js
      line: 89
      message: "console.log found in production code"
      risk_area: agents
      risk_level: low
      recommendation: "Replace with proper logging (winston, pino)"
      effort: trivial

false_positives:
  - id: SAST-005
    finding: "eval() usage detected"
    file: chati.dev/parsers/template-renderer.js
    line: 112
    justification: "Template rendering in sandboxed VM context, not user-controllable"
    reviewed_by: qa-implementation
    accepted: true

  - id: SAST-006
    finding: "Regex complexity (ReDoS risk)"
    file: chati.dev/validators/yaml-schema.js
    line: 45
    justification: "Regex operates on trusted YAML schema, not user input"
    reviewed_by: qa-implementation
    accepted: true

dependency_vulnerabilities:
  critical: 0
  high: 0
  medium: 1
  low: 4

  findings:
    - id: DEP-001
      severity: MEDIUM
      package: yaml@2.3.1
      vulnerability: Prototype Pollution
      cvss_score: 5.3
      cwe: CWE-1321
      fixed_in: yaml@2.3.4
      recommendation: "Upgrade to yaml@2.3.4 or later"
      exploitable: false # not user-facing in this context

quality_gates:
  critical_threshold:
    target: 0
    actual: 0
    status: PASS

  high_threshold:
    target: "< 3"
    actual: 2
    status: PASS

  medium_threshold:
    target: "< 10"
    actual: 8
    status: PASS

  overall_status: CONDITIONAL # Due to HIGH findings requiring fixes

risk_mapping:
  critical_risk_areas:
    - area: state_management
      findings: 0

    - area: mode_governance
      findings: 0

    - area: file_operations
      findings: 1 HIGH (SAST-001)

  high_risk_areas:
    - area: orchestrator
      findings: 1 MEDIUM (SAST-003)

    - area: upgrade
      findings: 1 HIGH (SAST-002)

trends:
  previous_scan_date: YYYY-MM-DD (or null if first scan)
  new_vulnerabilities: 2
  resolved_vulnerabilities: 0
  vulnerability_velocity: +2 per phase

remediation_roadmap:
  priority_1_blocking:
    - SAST-001: Path traversal in file-ops.js (HIGH, exploitable)
    - SAST-002: Command injection in upgrade.js (HIGH, exploitable)

  priority_2_pre_release:
    - SAST-003: Missing input validation in orchestrator.js (MEDIUM)
    - DEP-001: Upgrade yaml package (MEDIUM)

  priority_3_post_release:
    - Code quality issues (LOW severity)
    - Replace console.log with proper logging

  estimated_effort:
    priority_1: 2-4 hours
    priority_2: 2-3 hours
    priority_3: 1-2 hours

exceptions:
  - id: SAST-005
    vulnerability: eval() in template renderer
    severity: MEDIUM (if exploitable)
    justification: Sandboxed VM context, template source trusted
    compensating_controls:
      - Templates stored in chati.dev/templates (not user-modifiable)
      - VM sandbox with no access to filesystem or network
    approved_by: Tech Lead
    review_date: quarterly
    residual_risk: LOW

assessment:
  status: CONDITIONAL
  rationale: |
    - 0 CRITICAL vulnerabilities (meets threshold)
    - 2 HIGH vulnerabilities (meets threshold < 3)
    - Both HIGH vulnerabilities are exploitable and require fixes
    - 1 MEDIUM dependency vulnerability (upgrade available)

  blocking_issues:
    - SAST-001: Path traversal in file-ops.js (HIGH, exploitable)
    - SAST-002: Command injection in upgrade.js (HIGH, exploitable)

  conditional_pass_criteria:
    - Fix both HIGH severity exploitable vulnerabilities
    - Upgrade yaml package to 2.3.4+
    - Re-run SAST scan to verify fixes
    - Medium and low findings can be deferred to next phase

  recommendations:
    - Priority 1: Fix SAST-001 with path validation (2 hours)
    - Priority 2: Fix SAST-002 with execFile (1 hour)
    - Priority 3: Upgrade yaml dependency (30 minutes)
    - Schedule code quality fixes for next phase

next_steps:
  - Return to dev agent for HIGH vulnerability remediation
  - Re-run qa-impl-sast-scan after fixes
  - If rerun passes (0 HIGH exploitable), proceed to qa-impl-regression-check
  - Track LOW/MEDIUM findings in backlog for future phases

handoff:
  to: dev
  reason: HIGH severity exploitable vulnerabilities
  priority_fixes:
    - file-ops.js: Add path validation to prevent traversal
    - upgrade.js: Replace exec with execFile for command injection prevention
    - package.json: Upgrade yaml@2.3.1 to yaml@2.3.4
```
