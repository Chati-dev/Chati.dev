# Chati.dev System Context

## Framework
- **Version**: 3.0.0
- **Agents**: 13 (12 specialized + orchestrator)
- **Constitution**: 19 Articles + Preamble
- **Quality**: 5 pipeline gates + 3-tier verdicts (APPROVED / NEEDS_REVISION / BLOCKED)

## Key References
- **Session State**: `.chati/session.yaml` (runtime — not committed)
- **Constitution**: `chati.dev/constitution.md` (governance)
- **Orchestrator**: `chati.dev/orchestrator/chati.md` (entry point)
- **Config**: `chati.dev/config.yaml` (version info)
- **Runtime State**: `CLAUDE.local.md` (session lock, current agent)

## Pipeline
```
DISCOVER: WU -> Brief
PLAN:     Detail -> Architect -> UX -> Phases -> Tasks -> QA-Planning
BUILD:    Dev -> QA-Implementation
DEPLOY:   DevOps
```

## How to Use
Type `/chati` to activate the orchestrator. It reads session.yaml, CLAUDE.local.md, and the latest handoff to determine where you left off and what comes next.
