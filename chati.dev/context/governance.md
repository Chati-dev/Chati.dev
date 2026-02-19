# Chati.dev Governance Rules

Extracted from `chati.dev/constitution.md` (19 Articles). Read the full constitution for complete rules.

## Mode Governance (Article XI)
- **3 modes**: planning (read all, write chati.dev/ only), build (full access), deploy (full + infra)
- **Autonomous transitions**: planning->build (QA-Planning >= 95%), build->validate (dev done), validate->deploy (QA-Impl approved)
- **Backward transitions**: build/validate->planning when QA finds spec/architecture issues

## Context Bracket (Article XII)
- 4 brackets: FRESH, MODERATE, DEPLETED, CRITICAL
- CRITICAL = Constitution + Global layers only (no agent/task context)
- Handoff before bracket drops below 15%

## Memory (Article XIII)
- Auto-capture gotchas, never modify user source files
- 3-level progressive retrieval: durable -> daily -> session
- Confidence threshold > 0.9 for promotion

## Registry (Article XIV)
- Entity registry is source of truth for all framework artifacts
- Decision priority: REUSE > ADAPT > CREATE
- Health check validates registry vs filesystem

## Session Lock (Article XV)
- When session is active, ALL messages route through orchestrator
- Only explicit exit commands can deactivate (`/chati exit`)
- Lock state tracked in `CLAUDE.local.md` (not CLAUDE.md)

## Model Governance (Article XVI)
- Per-agent model selection: opus (deep reasoning), sonnet (structured), haiku (lightweight)
- Model recorded in session for cost tracking

## Execution Mode (Article XVII) — WHO decides
- Controls whether human or system makes pipeline decisions
- Autonomous mode requires gate score >= 95% (qa-planning >= 95%, qa-implementation >= 95%)
- Safety net with 5 triggers: stuck loop, quality drop, scope creep, error cascade, user override
- Circuit breaker: CLOSED -> OPEN (3 failures) -> HALF_OPEN (probe)

## Execution Profile Governance (Article XVIII) — HOW actions execute
- 3 profiles: explore (read-only), guided (default), autonomous (gate >= 95%)
- Transition to autonomous requires QA-Planning >= 95% AND QA-Implementation >= 95%
- Safety net: 5 triggers revert to guided (stuck loop, quality drop, scope creep, error cascade, user override)
- Circuit breaker: CLOSED -> OPEN (3 failures) -> HALF_OPEN (probe)

## Multi-CLI Governance (Article XIX)
- 3 providers: Claude, Gemini, Codex
- Provider selected at install time, auto-configures optimal models per agent
- Resolution chain: agent_overrides > agent default > primary provider
- Context files auto-generated for non-Claude providers (GEMINI.md, AGENTS.md)
