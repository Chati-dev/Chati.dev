# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-02-12

### Added

- **Context Engine**: Bracket-aware context management with 4 brackets (FRESH, MODERATE, DEPLETED, CRITICAL) and 5 injection layers (Constitution, Mode, Agent, Pipeline, Task)
- **Memory Layer**: Persistent intelligence across sessions — 4 cognitive sectors (Episodic, Semantic, Procedural, Reflective), 3-level progressive retrieval, attention scoring with natural decay
- **Framework Registry**: Central entity catalog (`entity-registry.yaml`) with 48 tracked artifacts and decision engine (REUSE/ADAPT/CREATE) for brownfield analysis
- **Session Lock Protocol**: Once `/chati` is invoked, ALL messages are routed through the orchestrator. Users stay inside the system until explicit exit (`/chati exit`). Prevents context leakage to generic AI mode.
- **Constitution Article XV**: Session Lock Governance — mandatory lock when session active, explicit exit only, resume re-locks
- **Constitution Articles XII-XIV**: Context Bracket Governance, Memory Governance, Framework Registry Governance
- **Orchestrator subcommands**: `/chati exit`, `/chati stop`, `/chati quit`, `/chati help`, `/chati resume`
- **Health Check**: `npx chati-dev health` validates framework integrity
- **Upgrade Spec**: `chati.dev/docs/UPGRADE-V7.1.md` — complete Intelligence Layer specification

### Removed

- **Windsurf IDE**: Removed from supported IDEs (7 -> 6)

## [1.1.0] - 2026-02-08

### Added

- **Mode Governance (Article XI)**: 3 modes (clarity, build, deploy) with autonomous transitions
- **Autonomous transitions**: clarity->build (QA-Planning>=95%), build->validate (dev done), validate->deploy (QA-Impl approved)
- **Backward transitions**: build/validate->clarity when QA finds spec/architecture issues
- **New agent statuses**: skipped, needs_revalidation

## [1.0.0] - 2026-02-07

### Added

- **13 Agents**: Orchestrator + 12 specialized agents (Greenfield WU, Brownfield WU, Brief, Detail, Architect, UX, Phases, Tasks, QA-Planning, QA-Implementation, Dev, DevOps)
- **8 Universal Protocols**: Self-Validation, Loop Until Done, Guided Options, Persistence, Two-Layer Handoff, Language Protocol, Deviation Protocol, Interaction Model
- **5 Workflow Blueprints**: Greenfield Fullstack, Brownfield Discovery, Brownfield Fullstack, Brownfield UI, Brownfield Service
- **5 Templates**: PRD, Brownfield PRD, Fullstack Architecture, Task, QA Gate
- **Constitution**: 10 Articles + Preamble governing agent behavior
- **Intelligence Layer**: Gotchas, patterns, and confidence tracking
- **Schemas**: JSON schemas for session, config, and task validation
- **Frameworks**: Decision heuristics and quality dimensions
- **Quality Gates**: Planning gate (traceability) and implementation gate (tests + SAST)
- **i18n**: English, Portugues, Espanol, Francais
- **CLI Installer**: `npx chati-dev init` with 6-step wizard
- **Dashboard TUI**: `npx chati-dev status` with watch mode
- **Upgrade System**: `npx chati-dev upgrade` with backup, migrations, and config merge
- **6 IDE Support**: Claude Code, VS Code, AntiGravity, Cursor, Gemini CLI, GitHub Copilot
- **Blocker Taxonomy**: C01-C14 (Code) + G01-G08 (General)
- **Thin Router Pattern**: `.claude/commands/chati.md` delegates to orchestrator
