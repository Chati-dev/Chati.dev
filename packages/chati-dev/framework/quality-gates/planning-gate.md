# Planning Quality Gate

## Purpose
Validates traceability and consistency across all PLAN artifacts before allowing transition to BUILD phase.

## When
After Tasks agent completes, before Dev agent starts.

## Agent
QA-Planning

## Checks

### Traceability Chain
1. **Brief -> PRD**: Every Brief problem has a PRD requirement
2. **PRD -> Phases**: Every PRD requirement appears in a phase
3. **Phases -> Tasks**: Every phase has at least one task
4. **Tasks -> Criteria**: Every task has Given-When-Then acceptance criteria
5. **Cross-check**: No PRD requirements without Brief origin (scope creep detection)

### Quality Checks
6. **Placeholder scan**: No [TODO], [TBD], [PLACEHOLDER] in any artifact
7. **Criteria quality**: Each agent defined binary, specific, non-trivial criteria
8. **Score verification**: All agents scored >= 95% on self-validation

### Penalty System
| Issue | Penalty |
|-------|---------|
| Requirement without task | -10 |
| Task without acceptance criteria | -5 |
| Brief-PRD inconsistency | -15 |
| Critical gap | -20 |
| Placeholder found | -5 each |
| Agent defined weak criteria | -10 |

## Decision
- **Score >= 95**: APPROVED -> proceed to BUILD
- **Score < 95**: Silent correction loop (max 3 per agent)
- **Still < 95 after loops**: ESCALATE to user

## Silent Loop Protocol
1. Identify failing agent
2. Show brief status to user ("Refining artifacts for consistency...")
3. Send correction instructions to agent
4. Agent corrects
5. Re-validate
6. Repeat if needed (max 3 times)

## Escalation Options
1. Manually address the gaps
2. Override and proceed to BUILD (documented risk)
3. Return to a specific agent for rework
