<div align="center">
<br>
<img src="packages/chati-dev/assets/logo.svg" alt="Chati.dev" width="380">
<br><br>
<strong>AI-Powered Multi-Agent Orchestration System</strong><br>
<em>Structured vibe coding for Full Stack Development.</em>
</div>

<p align="center">
  <a href="https://www.npmjs.com/package/chati-dev"><img src="https://img.shields.io/npm/v/chati-dev?color=blue&label=npm" alt="npm"></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/License-BSL_1.1-blue.svg" alt="License: BSL 1.1"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg" alt="Node.js"></a>
  <a href="#internationalization"><img src="https://img.shields.io/badge/i18n-EN%20%7C%20PT%20%7C%20ES%20%7C%20FR-informational.svg" alt="i18n"></a>
  <a href=".github/CONTRIBUTING.md"><img src="https://img.shields.io/badge/contributions-welcome-brightgreen.svg" alt="Contributions Welcome"></a>
</p>

---

A structured, agent-driven orchestration system that coordinates **13 specialized AI agents** across the full software development lifecycle — from requirements gathering to deployment. Every decision is traceable, every artifact is validated, every session persists.

## Why Chati.dev?

### The Problem

AI-assisted development today suffers from three critical issues:

1. **Context Loss** — AI forgets decisions across sessions, leading to inconsistent implementations
2. **Planning Gaps** — Jumping straight to code without structured requirements leads to rework
3. **System Leakage** — Users accidentally "fall out" of agent systems into generic AI mode

### The Solution

Chati.dev introduces **Agent-Driven Development**: a pipeline of 13 specialized agents where each agent owns a specific phase, produces validated artifacts, and hands off context to the next agent. An Intelligence Layer ensures context is never lost, knowledge persists across sessions, and the user never accidentally leaves the system.

```
PLANNING (planning)  →  Quality Gate  →  BUILD  →  Quality Gate  →  DEPLOY
  8 agents               QA-Planning     Dev        QA-Impl        DevOps
```

### Key Innovations

| Innovation | Description |
|------------|-------------|
| **Structured Agent Pipeline** | 13 agents with defined missions, validated outputs, and handoff protocols |
| **Self-Validating Agents** | Binary pass/fail criteria per agent. 5 quality gates with circuit breaker |
| **Context Engine PRISM** | 5-layer injection pipeline with bracket tracking (FRESH → CRITICAL). Autonomous recovery |
| **Memory System RECALL** | 4 cognitive sectors. Persistent knowledge across sessions with attention scoring and natural decay |
| **Decision Engine COMPASS** | Entity catalog with Jaccard similarity for REUSE/ADAPT/CREATE decisions. Self-healing registry |
| **Session Lock** | Once activated, user stays in system until explicit exit. Zero accidental leakage |
| **Hooks System** | 6 Claude Code hooks — constitution guard, mode governance, model governance, read protection, context injection, session digest |
| **Supply Chain Security** | Ed25519 manifest signing. Package integrity verification on install. Semantic linter for cross-reference validation |
| **Execution Modes** | Autonomous and human-in-the-loop modes with safety net (5 triggers) and circuit breaker |
| **Multi-Terminal** | Autonomous agents spawn in separate `claude -p` terminals with dedicated models. Parallel groups (Detail + Architect + UX) with write-scope isolation |
| **IDE-Agnostic** | Works with 6 IDEs through a thin router pattern |

---

## Prerequisites

- **Node.js** >= 20.0.0 ([download](https://nodejs.org/))
- **Claude Code** — the CLI for Claude ([install guide](https://docs.anthropic.com/en/docs/claude-code/overview))

Other supported IDEs: VS Code, Cursor, Gemini CLI, GitHub Copilot, AntiGravity (see [Supported IDEs](#supported-ides)).

---

## Quick Start

### 1. Install in your project

Open a terminal in your project directory:

```bash
npx chati-dev init
```

The wizard asks your language and project type, then auto-configures Claude Code with the required MCPs.

### 2. Start Claude Code and activate

Open Claude Code in the same project directory, then type:

```
/chati
```

The orchestrator loads your session, detects where you left off, and routes you to the right agent. You stay inside the system until you explicitly exit.

### 3. Build

From here, the agents take over. You'll go through Planning (requirements, architecture, phases, tasks), Quality Gates, Build, and Deploy — all orchestrated automatically.

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
| **PLANNING** | Greenfield WU, Brownfield WU, Brief, Detail (PRD), Architect, UX, Phases, Tasks | Planning & Requirements |
| **Quality** | QA-Planning, QA-Implementation | Validation & Gates |
| **BUILD** | Dev | Implementation |
| **DEPLOY** | DevOps | Shipping |

### Pipeline Flow

```
User Request
    │
    ▼
┌─────────────────────────────────────────────────┐
│  ORCHESTRATOR (/chati) — Main Terminal           │
│  Routes to correct agent, manages session        │
│  Session Lock: user stays in system              │
└─────────────────────────────────────────────────┘
    │
    ├── In-conversation ──┐
    │                     ▼
    │   ┌─── PLANNING (interactive) ───┐
    │   │  WU → Brief                 │
    │   └─────────────────────────────┘
    │
    ├── Spawns terminals ──────────────────────────┐
    │                                               ▼
    │   ┌─── PLANNING (autonomous) ─── Parallel ───┐
    │   │  Detail (opus) ──┐                       │
    │   │  Architect (opus)├── run simultaneously  │
    │   │  UX (sonnet) ────┘                       │
    │   │  → Phases → Tasks                        │
    │   └──────────────────────────────────────────┘
    │
    ├── Spawns terminal ──┐
    │                     ▼
    │   ┌─── QUALITY ─────────────────────────────┐
    │   │  QA-Planning (opus) — ≥95% threshold     │
    │   └──────────────────────────────────────────┘
    │
    ├── Spawns terminal(s) ┐
    │                      ▼
    │   ┌─── BUILD ───────────────────────────────┐
    │   │  Dev (opus) — parallel for independent   │
    │   └──────────────────────────────────────────┘
    │
    ├── Spawns terminal ──┐
    │                     ▼
    │   ┌─── QUALITY ─────────────────────────────┐
    │   │  QA-Implementation (opus) — tests + SAST │
    │   └──────────────────────────────────────────┘
    │
    └── Spawns terminal ──┐
                          ▼
        ┌─── DEPLOY ──────────────────────────────┐
        │  DevOps (sonnet) — git + deploy + docs   │
        └──────────────────────────────────────────┘
```

Each spawned terminal runs as a separate `claude -p --model <model>` process with its own context window, write-scope isolation, and structured handoff output.

### Intelligence Layer

The Intelligence Layer operates transparently behind the pipeline:

| System | What it does |
|--------|-------------|
| **Context Engine PRISM** | 5-layer injection pipeline (Constitution → Global → Agent → Workflow → Task). 4 brackets (FRESH/MODERATE/DEPLETED/CRITICAL). Domain loading with graceful degradation. |
| **Memory System RECALL** | Gotchas auto-capture with 3x/24h promotion. Per-agent memory CRUD. Session digests. Unified search across 4 cognitive sectors (Episodic, Semantic, Procedural, Reflective). |
| **Decision Engine COMPASS** | Jaccard similarity for REUSE/ADAPT/CREATE decisions. BFS dependency analysis. Entity registry auto-update. 6 self-healing rules. |
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

The system is governed by a **17-article Constitution** that enforces agent behavior, quality standards, security, and system integrity. Key articles:

| Article | Governance |
|---------|-----------|
| I-IV | Agent governance, quality standards, memory & context, security |
| V-VII | Communication protocol, design system, English-only documentation |
| VIII-X | Two-layer handoff, agent-driven interaction, dynamic self-validation |
| XI | Mode governance (planning/build/deploy) with autonomous transitions |
| XII-XIV | Context bracket governance, memory governance, framework registry |
| XV | Session lock governance — mandatory lock, explicit exit only |
| XVI | Model governance — opus/sonnet/haiku per agent, no downgrade rule |
| XVII | Execution mode governance — autonomous vs human-in-the-loop, safety net triggers |

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
│   ├── session.yaml              # Session state (auto-managed, gitignored)
│   └── memories/                 # Memory Layer storage (gitignored)
├── .claude/
│   ├── commands/
│   │   └── chati.md              # Thin router → orchestrator
│   └── rules/
│       └── chati/                # Framework context (auto-loaded by Claude Code)
│           ├── root.md           # System overview + key references
│           ├── governance.md     # Constitution key rules
│           ├── protocols.md      # 8 universal protocols
│           └── quality.md        # Quality standards
├── CLAUDE.md                     # Minimal project context (auto-generated)
├── CLAUDE.local.md               # Runtime state — session lock, current agent (gitignored)
├── docs/
│   └── CHANGELOG.md              # Version history
├── chati.dev/
│   ├── orchestrator/             # Main orchestrator
│   ├── agents/                   # 13 agent definitions
│   │   ├── planning/              # 8 planning agents
│   │   ├── quality/              # 2 quality gate agents
│   │   ├── build/                # Dev agent
│   │   └── deploy/               # DevOps agent
│   ├── tasks/                    # 72 task definitions (YAML frontmatter)
│   ├── workflows/                # 5 workflow blueprints
│   ├── templates/                # 5 artifact templates
│   ├── schemas/                  # 5 JSON schemas for validation
│   ├── intelligence/             # Context Engine, Memory Layer, Decision Engine
│   ├── domains/                  # Domain loading configs (per-agent, per-workflow)
│   ├── hooks/                    # 6 Claude Code hooks (enforcement)
│   ├── context/                  # Context source files (deployed to .claude/rules/)
│   ├── frameworks/               # Decision heuristics, quality dims
│   ├── quality-gates/            # Planning & implementation gates
│   ├── patterns/                 # Elicitation patterns
│   ├── data/                     # Entity registry (48 artifacts)
│   ├── i18n/                     # EN, PT, ES, FR translations
│   ├── migrations/               # Version migration scripts
│   ├── constitution.md           # 17 Articles + Preamble
│   ├── config.yaml               # System configuration
│   └── artifacts/                # Generated during pipeline
│       ├── 0-WU/
│       ├── 1-Brief/
│       ├── 2-PRD/
│       ├── 3-Architecture/
│       ├── 4-UX/
│       ├── 5-Phases/
│       ├── 6-Tasks/
│       ├── 7-QA-Planning/
│       ├── 8-Validation/
│       └── handoffs/
└── packages/
    └── chati-dev/                # CLI + runtime engine (npx chati-dev)
        └── src/terminal/         # Multi-terminal spawner, monitor, collector
```

---

## Internationalization

The installer and agent interactions support 4 languages:

| Language | Code | Status |
|----------|------|--------|
| **English** | `en` | Default |
| **Português** | `pt` | Full support |
| **Español** | `es` | Full support |
| **Français** | `fr` | Full support |

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

## Contributing

We welcome contributions from agents, templates, workflows, intelligence data, translations, and CLI improvements. Please see [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines.

## Security

For security concerns, please see our [Security Policy](.github/SECURITY.md).

## License

This project is licensed under the Business Source License 1.1 — see [LICENSE](../../LICENSE) for details. Free for personal, educational, and evaluation use. Converts to Apache 2.0 on 2030-02-16.

---

<p align="center">
  <sub>Built with structure, validated by agents, governed by constitution.</sub><br>
  <sub>Chati.dev &copy; 2026</sub>
</p>
