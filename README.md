# chati.dev: AI-Powered Multi-Agent Development Framework

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Agents](https://img.shields.io/badge/agents-13-purple.svg)](#architecture)
[![IDEs](https://img.shields.io/badge/IDEs-6-orange.svg)](#supported-ides)
[![Languages](https://img.shields.io/badge/i18n-EN%20%7C%20PT%20%7C%20ES%20%7C%20FR-informational.svg)](#internationalization)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-Contributor%20Covenant-blue.svg)](CODE_OF_CONDUCT.md)

A structured, agent-driven development framework that orchestrates 13 specialized AI agents across the full software development lifecycle — from requirements gathering to deployment. No vibe coding. Every decision is traceable, every artifact is validated.

## Overview

### The Problem

AI-assisted development today suffers from two critical issues:

1. **Context Loss** — AI forgets decisions across sessions, leading to inconsistent implementations
2. **Planning Gaps** — Jumping straight to code without structured requirements leads to rework

### The Solution

chati.dev introduces **Agent-Driven Development**: a pipeline of 13 specialized agents where each agent owns a specific phase, produces validated artifacts, and hands off context to the next agent. Nothing is lost. Nothing is skipped.

```
CLARITY (planning)  →  Quality Gate  →  BUILD  →  Quality Gate  →  DEPLOY
  8 agents               QA-Planning     Dev        QA-Impl        DevOps
```

### Key Innovations

**1. Structured Agent Pipeline** — Each agent has a defined mission, required inputs, validated outputs, and handoff protocols. The orchestrator routes work to the right agent at the right time.

**2. Self-Validating Agents** — Every agent runs self-validation against binary pass/fail criteria before producing output. Quality gates (QA-Planning, QA-Implementation) provide cross-agent validation.

**3. Persistent Context** — Session state persists across IDE restarts. Every decision, artifact, and score is tracked in `.chati/session.yaml`. No context is ever lost.

**4. IDE-Agnostic** — Works with 6 IDEs through a thin router pattern. The framework lives in `chati.dev/`, not in IDE-specific config.

## Quick Start

### Installation

```bash
npx chati-dev init
```

The installer wizard will guide you through:

1. **Language** — Choose EN, PT, ES, or FR
2. **Project type** — Greenfield (new) or Brownfield (existing codebase)
3. **IDE selection** — Pick from 6 supported IDEs
4. **MCP configuration** — Set up required integrations
5. **Confirmation** — Review and install

### First Run

After installation, activate the orchestrator:

```
/chati start my-project
```

The orchestrator will guide you through the pipeline — starting with Work Understanding, then Brief, PRD, Architecture, UX, Phases, Tasks, and into Build.

### Dashboard

Check project status anytime:

```bash
npx chati-dev status          # One-time snapshot
npx chati-dev status --watch  # Auto-refresh every 5s
```

## Architecture

### 13 Agents, 4 Categories

| Category | Agents | Purpose |
|----------|--------|---------|
| **CLARITY** | Greenfield WU, Brownfield WU, Brief, Detail (PRD), Architect, UX, Phases, Tasks | Planning & Requirements |
| **Quality** | QA-Planning, QA-Implementation | Validation & Gates |
| **BUILD** | Dev | Implementation |
| **DEPLOY** | DevOps | Shipping |

### Pipeline Flow

```
User Request
    │
    ▼
┌─────────────────────────────────────────────────┐
│  ORCHESTRATOR (/chati)                          │
│  Routes to correct agent, manages session       │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────── CLARITY ─────────────────────┐
│                                                  │
│  WU → Brief → Detail(PRD) → Architect → UX      │
│       → Phases → Tasks                           │
│                                                  │
└──────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────── QUALITY ─────────────────────┐
│  QA-Planning (traceability validation, ≥95%)     │
└──────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────── BUILD ───────────────────────┐
│  Dev (implementation + self-validation)           │
└──────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────── QUALITY ─────────────────────┐
│  QA-Implementation (tests + SAST + code review)  │
└──────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────── DEPLOY ──────────────────────┐
│  DevOps (git + deploy + docs)                    │
└──────────────────────────────────────────────────┘
```

### Universal Protocols

Every agent follows 8 universal protocols:

| Protocol | Purpose |
|----------|---------|
| 5.1 Dynamic Self-Validation | Binary pass/fail criteria per agent |
| 5.2 Loop Until Done | Iterate until quality threshold met |
| 5.3 Guided Options | Always present 1, 2, 3 choices |
| 5.4 Persistence | Session state survives restarts |
| 5.5 Two-Layer Handoff | Structured context transfer between agents |
| 5.6 Language Protocol | Interaction in user lang, artifacts in English |
| 5.7 Deviation Protocol | Handle scope changes mid-pipeline |
| 5.8 Interaction Model | Agent-driven with power user escape hatch |

## Supported IDEs

| IDE | Status |
|-----|--------|
| Claude Code | Full support |
| VS Code | Full support |
| AntiGravity | Full support |
| Cursor | Full support |
| Gemini CLI | Full support |
| GitHub Copilot | Full support |

## Project Structure

```
your-project/
├── .chati/
│   └── session.yaml          # Session state (auto-managed)
├── .claude/
│   └── commands/
│       └── chati.md          # Thin router → orchestrator
├── CLAUDE.md                 # IDE entry point (generated)
├── chati.dev/
│   ├── orchestrator/         # Main orchestrator
│   ├── agents/               # 13 agent definitions
│   │   ├── clarity/          # 8 planning agents
│   │   ├── quality/          # 2 quality gate agents
│   │   ├── build/            # Dev agent
│   │   └── deploy/           # DevOps agent
│   ├── workflows/            # 5 workflow blueprints
│   ├── templates/            # 5 artifact templates
│   ├── schemas/              # JSON schemas for validation
│   ├── intelligence/         # Gotchas, patterns, confidence
│   ├── frameworks/           # Decision heuristics, quality dims
│   ├── quality-gates/        # Planning & implementation gates
│   ├── patterns/             # Elicitation patterns
│   ├── i18n/                 # EN, PT, ES, FR translations
│   ├── migrations/           # Version migration scripts
│   ├── constitution.md       # 10 Articles + Preamble
│   └── config.yaml           # Framework configuration
├── chati.dev/artifacts/      # Generated during pipeline
│   ├── 0-WU/
│   ├── 1-Brief/
│   ├── 2-PRD/
│   ├── 3-Architecture/
│   ├── 4-UX/
│   ├── 5-Phases/
│   ├── 6-Tasks/
│   ├── 7-QA-Planning/
│   ├── 8-Validation/
│   └── handoffs/
└── packages/
    └── chati-dev/            # CLI installer (npx chati-dev)
```

## Internationalization

The installer and agent interactions support 4 languages:

- **English** (default)
- **Portugues**
- **Espanol**
- **Francais**

Artifacts are always generated in English for consistency.

## Upgrade System

```bash
npx chati-dev check-update    # Check for updates
npx chati-dev upgrade          # Upgrade to latest
npx chati-dev upgrade --version 1.2.0  # Specific version
```

Upgrades include automatic backup, migrations, and config merging.

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx chati-dev init` | Initialize new project |
| `npx chati-dev install` | Install into existing project |
| `npx chati-dev status` | Show dashboard |
| `npx chati-dev status --watch` | Auto-refresh dashboard |
| `npx chati-dev check-update` | Check for updates |
| `npx chati-dev upgrade` | Upgrade to latest |
| `npx chati-dev changelog` | View changelog |
| `npx chati-dev --reconfigure` | Reconfigure installation |

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- A supported IDE with AI assistant capabilities

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

For security concerns, please see our [Security Policy](SECURITY.md).

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

chati.dev builds on ideas from structured development methodologies and multi-agent orchestration patterns. Special thanks to the AI development community for pushing the boundaries of what's possible with agent-driven workflows.
