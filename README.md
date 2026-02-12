<div align="center">
<br>
<img src="packages/chati-dev/assets/logo.svg" alt="chati.dev" width="380">
<br><br>
<strong>AI-Powered Multi-Agent Orchestration System</strong><br>
<em>13 agents. 16 articles. 6 IDEs. 4 languages. Structured vibe coding.</em>
</div>

<p align="center">
  <a href="https://www.npmjs.com/package/chati-dev"><img src="https://img.shields.io/npm/v/chati-dev?color=blue&label=npm" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node.js"></a>
  <a href="#architecture"><img src="https://img.shields.io/badge/agents-13-purple.svg" alt="Agents"></a>
  <a href="#supported-ides"><img src="https://img.shields.io/badge/IDEs-6-orange.svg" alt="IDEs"></a>
  <a href="#internationalization"><img src="https://img.shields.io/badge/i18n-EN%20%7C%20PT%20%7C%20ES%20%7C%20FR-informational.svg" alt="i18n"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/contributions-welcome-brightgreen.svg" alt="Contributions Welcome"></a>
</p>

---

A structured, agent-driven orchestration system that coordinates **13 specialized AI agents** across the full software development lifecycle — from requirements gathering to deployment. Every decision is traceable, every artifact is validated, every session persists.

## Why chati.dev?

### The Problem

AI-assisted development today suffers from three critical issues:

1. **Context Loss** — AI forgets decisions across sessions, leading to inconsistent implementations
2. **Planning Gaps** — Jumping straight to code without structured requirements leads to rework
3. **System Leakage** — Users accidentally "fall out" of agent systems into generic AI mode

### The Solution

chati.dev introduces **Agent-Driven Development**: a pipeline of 13 specialized agents where each agent owns a specific phase, produces validated artifacts, and hands off context to the next agent. An Intelligence Layer ensures context is never lost, knowledge persists across sessions, and the user never accidentally leaves the system.

```
CLARITY (planning)  →  Quality Gate  →  BUILD  →  Quality Gate  →  DEPLOY
  8 agents               QA-Planning     Dev        QA-Impl        DevOps
```

### Key Innovations

| Innovation | Description |
|------------|-------------|
| **Structured Agent Pipeline** | 13 agents with defined missions, validated outputs, and handoff protocols |
| **Self-Validating Agents** | Binary pass/fail criteria per agent. Quality gates at planning and implementation |
| **Context Engine** | 4 context brackets (FRESH → CRITICAL) with 5 injection layers. Autonomous recovery |
| **Memory Layer** | 4 cognitive sectors. Persistent knowledge across sessions with attention scoring |
| **Framework Registry** | Entity catalog with decision engine (REUSE/ADAPT/CREATE) for brownfield analysis |
| **Session Lock** | Once activated, user stays in system until explicit exit. Zero accidental leakage |
| **IDE-Agnostic** | Works with 6 IDEs through a thin router pattern |

---

## Quick Start

### Install

```bash
npx chati-dev init
```

The wizard guides you through language, project type, IDE selection, and MCP configuration.

### Activate

```
/chati
```

The orchestrator loads your session, detects where you left off, and routes you to the right agent. You stay inside the system until you explicitly exit.

### Monitor

```bash
npx chati-dev status          # One-time snapshot
npx chati-dev status --watch  # Auto-refresh every 5s
```

### Exit & Resume

```
/chati exit     # Save session and exit
/chati          # Resume exactly where you left off
```

---

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
│  Session Lock: user stays in system             │
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

### Intelligence Layer (V7.1)

The Intelligence Layer operates transparently behind the pipeline:

| System | What it does |
|--------|-------------|
| **Context Engine** | Detects context depletion across 4 brackets. Reduces injection layers as context fills. Autonomous recovery via Smart Continuation or Session Spawn. |
| **Memory Layer** | Captures decisions, patterns, and lessons learned. Persists across sessions. 4 cognitive sectors (Episodic, Semantic, Procedural, Reflective). Attention scoring with natural decay. |
| **Framework Registry** | Catalogs all 48 system artifacts. Decision engine for brownfield analysis: REUSE existing artifacts, ADAPT with modifications, or CREATE new. |
| **Session Lock** | Locks the session on `/chati` activation. All messages routed through orchestrator. Exit only via `/chati exit`. Prevents accidental context leakage. |

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

### Constitution

The system is governed by a **16-article Constitution** that enforces agent behavior, quality standards, security, and system integrity. Key articles:

| Article | Governance |
|---------|-----------|
| I-IV | Agent governance, quality standards, memory & context, security |
| V-VII | Communication protocol, design system, English-only documentation |
| VIII-X | Two-layer handoff, agent-driven interaction, dynamic self-validation |
| XI | Mode governance (clarity/build/deploy) with autonomous transitions |
| XII-XIV | Context bracket governance, memory governance, framework registry |
| XV | Session lock governance — mandatory lock, explicit exit only |
| XVI | Model governance — opus/sonnet/haiku per agent, no downgrade rule |

---

## Supported IDEs

| IDE | Router Pattern |
|-----|---------------|
| **Claude Code** | `.claude/commands/chati.md` → orchestrator |
| **VS Code** | `.vscode/chati.md` → orchestrator |
| **AntiGravity** | Platform agent config → orchestrator |
| **Cursor** | `.cursor/rules/chati.md` → orchestrator |
| **Gemini CLI** | `.gemini/agents/chati.md` → orchestrator |
| **GitHub Copilot** | `.github/copilot/chati.md` → orchestrator |

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx chati-dev init` | Initialize new project with wizard |
| `npx chati-dev install` | Install into existing project |
| `npx chati-dev status` | Show project dashboard |
| `npx chati-dev status --watch` | Auto-refresh dashboard every 5s |
| `npx chati-dev check-update` | Check for system updates |
| `npx chati-dev upgrade` | Upgrade to latest version |
| `npx chati-dev upgrade --version X.Y.Z` | Upgrade to specific version |
| `npx chati-dev memory stats` | Show memory statistics (total, by agent/sector/tier) |
| `npx chati-dev memory list` | List memories (--agent, --sector, --tier filters) |
| `npx chati-dev memory search <query>` | Search memories by tags or content |
| `npx chati-dev memory clean` | Clean expired/session memories (--dry-run) |
| `npx chati-dev context` | Show context bracket advisory |
| `npx chati-dev registry stats` | Show entity registry statistics |
| `npx chati-dev registry check` | Validate entity registry against filesystem |
| `npx chati-dev health` | Comprehensive system health check (5 checks) |
| `npx chati-dev changelog` | View changelog |
| `npx chati-dev --reconfigure` | Reconfigure installation |

### Orchestrator Commands (inside active session)

| Command | Description |
|---------|-------------|
| `/chati` | Start or resume session |
| `/chati status` | Show pipeline status |
| `/chati help` | Show available commands |
| `/chati resume` | Resume from continuation file |
| `/chati exit` | Save session and exit |

---

## Project Structure

```
your-project/
├── .chati/
│   ├── session.yaml              # Session state (auto-managed)
│   ├── memories/                 # Memory Layer storage (gitignored)
│   └── continuation/             # Context recovery files
├── .claude/
│   └── commands/
│       └── chati.md              # Thin router → orchestrator
├── CLAUDE.md                     # IDE entry point (auto-updated)
├── chati.dev/
│   ├── orchestrator/             # Main orchestrator
│   ├── agents/                   # 13 agent definitions
│   │   ├── clarity/              # 8 planning agents
│   │   ├── quality/              # 2 quality gate agents
│   │   ├── build/                # Dev agent
│   │   └── deploy/               # DevOps agent
│   ├── workflows/                # 5 workflow blueprints
│   ├── templates/                # 5 artifact templates
│   ├── schemas/                  # JSON schemas for validation
│   ├── intelligence/             # Context Engine, Memory Layer, Decision Engine
│   ├── frameworks/               # Decision heuristics, quality dims
│   ├── quality-gates/            # Planning & implementation gates
│   ├── patterns/                 # Elicitation patterns
│   ├── data/                     # Entity registry
│   ├── i18n/                     # EN, PT, ES, FR translations
│   ├── migrations/               # Version migration scripts
│   ├── constitution.md           # 16 Articles + Preamble
│   └── config.yaml               # System configuration
├── chati.dev/artifacts/          # Generated during pipeline
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
    └── chati-dev/                # CLI installer (npx chati-dev)
```

---

## Internationalization

The installer and agent interactions support 4 languages:

| Language | Code | Status |
|----------|------|--------|
| **English** | `en` | Default |
| **Portugues** | `pt` | Full support |
| **Espanol** | `es` | Full support |
| **Francais** | `fr` | Full support |

Artifacts are always generated in English for portability and team collaboration.

---

## Upgrade System

```bash
npx chati-dev check-update                # Check for updates
npx chati-dev upgrade                      # Upgrade to latest
npx chati-dev upgrade --version 1.2.1      # Specific version
```

Upgrades include automatic backup, migrations, validation, and config merging. Rollback on failure.

---

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- A supported IDE with AI assistant capabilities

---

## Contributing

We welcome contributions from agents, templates, workflows, intelligence data, translations, and CLI improvements. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

For security concerns, please see our [Security Policy](SECURITY.md).

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with structure, validated by agents, governed by constitution.</sub><br>
  <sub>chati.dev &copy; 2026</sub>
</p>
