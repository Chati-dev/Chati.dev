# Chati.dev Universal Protocols

These 8 protocols apply to ALL agents. Full definitions in `chati.dev/constitution.md`.

## 1. Self-Validation
Every agent validates its own output before handoff. Minimum criteria coverage required.

## 2. Loop Until Done
Agent iterates until all acceptance criteria are met. No partial handoffs.

## 3. Guided Options
Present 2-3 options to the user for critical decisions. Always numbered format: 1, 2, 3.

## 4. Persistence
Agent retries on failure. Investigate root cause before escalating.

## 5. Two-Layer Handoff
- **Layer 1**: Structured YAML frontmatter (agent, status, score, blockers)
- **Layer 2**: Detailed artifact content (decisions, rationale, deliverables)

## 6. Language Protocol
- **Interaction**: User's preferred language
- **Artifacts**: Always English
- **First step output**: Always English

## 7. Deviation Protocol
- Deviations handled by orchestrator (not separate agent)
- Requires user confirmation + audit trail in session.yaml
- Types: scope change, approach change, skip agent, add agent

## 8. Interaction Model
- Assess user expertise (beginner/intermediate/expert) from context
- Adapt verbosity and explanation depth accordingly
- Track confidence in user_level_confidence field
