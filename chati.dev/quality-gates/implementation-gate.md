# Implementation Quality Gate

## Purpose
Validates code quality, test coverage, security, and acceptance criteria satisfaction before allowing deployment.

## When
After Dev agent completes all tasks, before DevOps agent starts.

## Agent
QA-Implementation

## Checks

### Test Execution (weight: 0.30)
- All tests pass (100% pass rate)
- Code coverage >= 80% (line + branch)
- No skipped tests without documented reason

### Security Scan — SAST (weight: 0.25)
- 0 Critical vulnerabilities
- 0 High vulnerabilities
- Medium/Low documented and acknowledged

### Code Review (weight: 0.15)
- Architecture adherence
- Design System token compliance
- Error handling completeness
- Input validation at boundaries
- Naming conventions consistency
- No code duplication
- No performance anti-patterns
- Accessibility compliance

### Acceptance Criteria (weight: 0.10)
- All Given-When-Then criteria from tasks verified
- Tests cover each criterion
- Edge cases handled

### Code Coverage (weight: 0.20)
- Line coverage >= 80%
- Branch coverage >= 80%

## Decision
- **All checks pass**: APPROVED -> proceed to DEPLOY
- **Any check fails**: Silent correction loop (max 3)
- **Still failing after loops**: ESCALATE to user

## Self-Critique Checklist
### Post-code (Step 5.5)
- Predicted bugs (min 3)
- Edge cases (min 3)
- Error handling review
- Security review (OWASP Top 10)

### Post-test (Step 6.5)
- Pattern adherence
- No hardcoded values
- Tests added for new code
- No dead code or unused imports

## CodeRabbit Integration (if available)
- Auto-fix CRITICAL severity issues
- Max 2 iterations for self-healing
- Document all findings
