# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **7 IDE Support**: Claude Code, VS Code, AntiGravity, Cursor, Windsurf, Gemini CLI, GitHub Copilot
- **Blocker Taxonomy**: C01-C14 (Code) + G01-G08 (General)
- **Thin Router Pattern**: `.claude/commands/chati.md` delegates to orchestrator
