# Chati.dev System Rules
# This file configures GitHub Copilot to work with Chati.dev

## System Location
All system content is in the `chati.dev/` directory.

## Session State
Runtime session state is in `.chati/session.yaml` (IDE-agnostic).

## Getting Started
The orchestrator is at `chati.dev/orchestrator/chati.md`.
Read it to understand routing, session management, and agent activation.

## Constitution
Governance rules are in `chati.dev/constitution.md` (19 Articles).

## Pipeline
```
DISCOVER: WU -> Brief
PLAN:     Detail -> Architect -> UX -> Phases -> Tasks -> QA-Planning
BUILD:    Dev -> QA-Implementation
DEPLOY:   DevOps
```

## Agents
- DISCOVER: chati.dev/agents/discover/ (3 agents)
- PLAN: chati.dev/agents/plan/ (5 agents)
- Quality: chati.dev/agents/quality/ (2 agents)
- BUILD: chati.dev/agents/build/ (1 agent)
- DEPLOY: chati.dev/agents/deploy/ (1 agent)
