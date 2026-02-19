# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2026-02-19

### Added

- **Framework Adapter**: New `framework-adapter.js` transforms Claude-specific framework files into provider-native versions at install time. Each LLM reads instructions written natively for it — zero runtime translation needed.
- **Pre-configured orchestrator per provider**: Orchestrator, 12 agent files, constitution, and context files are adapted with correct model names, file references, and CLI names during installation.
- **59 new framework-adapter tests**: Comprehensive coverage for all 3 non-Claude providers (gemini, codex, copilot), edge cases, replacement ordering, and real-world content patterns.

### Changed

- **Simplified entry points**: Removed runtime mapping tables from Codex SKILL.md, Gemini TOML, and Copilot agent.md. Replaced with "pre-configured for {Provider}" since orchestrator files are now pre-adapted.
- **ADAPTABLE_FILES**: 16 framework files adapted per provider (orchestrator, 12 agents, constitution, 2 context files).

### Fixed

- **Gemini creating GEMINI.local.md**: All CLAUDE.local.md references pre-replaced with .chati/session.yaml in Gemini orchestrator.
- **Codex showing "Model recommendation: haiku"**: Model names pre-replaced with codex/mini tiers in Codex orchestrator and agents.
- **"NEVER act as generic Claude" on all providers**: Pre-replaced with "NEVER act as generic AI assistant" for non-Claude providers.
- **Inconsistent UX across providers**: LLMs no longer waste cognitive load on mapping tables, leading to more consistent instruction-following.

### Stats

- 1276 tests passing, 0 failures

## [3.0.6] - 2026-02-19

### Fixed

- **Model name mapping for non-Claude providers**: All entry points (SKILL.md, TOML, agent.md) now include model name translation tables. Codex maps opus→codex, sonnet/haiku→mini. Gemini maps opus→pro, sonnet/haiku→flash. Copilot maps opus/sonnet→claude-sonnet, haiku→gpt-5. Prevents agents from recommending Claude-specific model names on other providers.

### Stats

- 1210 tests passing, 0 failures

## [3.0.5] - 2026-02-19

### Fixed

- **Orchestrator auto-start for fresh installs**: When session.yaml exists (created by installer) but no agent has run yet, the orchestrator now skips the "Continue with X? (1/2/3)" prompt and immediately activates the first agent (greenfield-wu or brownfield-wu). This eliminates the confusing "resume" UX on first `/chati` invocation after install.

### Stats

- 1207 tests passing, 0 failures

## [3.0.4] - 2026-02-19

### Fixed

- **Installer feedback**: No longer shows "Created .claude/commands/" for non-Claude providers — shows provider-specific path
- **Provider Context Mapping**: All non-Claude entry points (SKILL.md, TOML, agent.md) include mapping table instructing CLI to replace CLAUDE.md/CLAUDE.local.md/.claude/ with provider equivalents
- **Codex creating CLAUDE.local.md**: Codex skill explicitly prohibits creating Claude-specific files
- **Gemini/Copilot context leaks**: Same provider mapping added to Gemini TOML and Copilot agent templates

### Stats

- 1208 tests passing, 0 failures

## [3.0.3] - 2026-02-19

### Fixed

- **Codex CLI Skill System**: Replaced non-functional `.codex/commands/chati.md` with proper `.agents/skills/chati/SKILL.md` (Codex native skill format)
- **Codex Quick Start**: Now shows `$chati` (skill invocation) instead of `/chati` (not supported by Codex)

### Changed

- `generateCodexRouter()` renamed to `generateCodexSkill()` — outputs SKILL.md with YAML frontmatter
- `codex-cli` configPath changed from `.codex/commands/` to `.agents/skills/chati/`
- Codex skill includes `description` field for implicit invocation (Codex auto-detects intent)

### Stats

- 1208 tests passing, 0 failures

## [3.0.2] - 2026-02-19

### Fixed

- **Multi-CLI Provider Isolation**: Selecting Codex/Gemini/Copilot no longer installs Claude Code files (.claude/, CLAUDE.md, CLAUDE.local.md)
- **Codex CLI as First-Class Citizen**: Added `codex-cli` IDE config, `.codex/commands/chati.md` thin router, proper /chati slash command support
- **Gemini CLI Standalone**: Gemini-only installs no longer create Claude-specific directories
- **GitHub Copilot Standalone**: Copilot-only installs no longer create Claude-specific files
- **Context File Generation**: GEMINI.md and AGENTS.md now generated from in-memory base content (no longer requires CLAUDE.md on disk)
- **Hardcoded Claude Code Fallback**: Quick Start no longer shows "Claude Code" when non-Claude provider is selected
- **Dynamic IDE Names**: Confirmation step and dashboard now show provider-specific IDE names

### Added

- `codex-cli` entry in IDE_CONFIGS with `.codex/commands/` config path
- `generateCodexRouter()` template for Codex CLI thin router
- Codex CLI handler in `configureIDE()` creating `.codex/commands/chati.md`
- Provider-specific model maps in config.yaml generation
- Standalone test suites for Gemini CLI, Codex CLI, and GitHub Copilot installations
- Codex CLI spawner adapter in terminal module

### Stats

- 14 files changed, 392 insertions, 66 deletions
- 1206 tests passing, 0 failures

## [3.0.0] - 2026-02-17

### Added

- **Multi-CLI Architecture**: CLI Provider Registry + Adapter pattern for Claude Code, Gemini CLI, Codex CLI, and GitHub Copilot CLI
- **CLI Adapters**: Per-provider command/args builders (claude-adapter, gemini-adapter, codex-adapter, copilot-adapter)
- **Context File Generator**: Auto-generates GEMINI.md and AGENTS.md from CLAUDE.md when alternative providers are enabled
- **Execution Profiles**: 3 profiles (explore/guided/autonomous) orthogonal to mode governance — controls confirmation requirements
- **Gotchas Auto-Capture Engine**: Monitors agent execution for recurring error patterns (3x threshold → auto-captured gotcha)
- **Health Check Engine**: 6 system checks (CLI availability, framework integrity, session state, hooks health, dependencies, git status)
- **File Evolution Tracker**: Records file modifications per agent for conflict detection in parallel execution
- **Timeline Manager**: Chronological event log (11 event types) for audit trail and session replay
- **Build State Manager**: Checkpoint-based persistence for autonomous build loop (Ralph Wiggum v2)
- **Autonomous Build Loop**: Retry logic, global timeout, progress callbacks for the dev agent
- **Wave Analyzer**: Topological sort (Kahn's algorithm) grouping tasks into parallelizable waves
- **Gate Verdicts**: APPROVED/NEEDS_REVISION/BLOCKED — enhanced from simple pass/fail
- **Constitution Articles XVIII + XIX**: Execution Profile Governance and Multi-CLI Governance

### Changed

- **Constitution**: Updated to 19 Articles (was 17). Article XVI expanded for multi-provider support
- **AGENT_MODELS**: Format changed from `string` to `{ provider, model, tier }` object (backwards compatible)
- **Spawner**: Now uses CLI adapter from registry instead of hardcoded `'claude'` command
- **Config**: Added `providers` section and `agent_overrides` for per-agent provider/model selection
- **Schemas**: Session schema adds `execution_profile`, `providers_enabled`, `profile_transitions`; Config schema adds `providers` and `agent_overrides`
- **Agent Definitions**: All 12 agents now include `Provider` field in Identity section
- **Orchestrator**: Added Provider Routing section and `/chati providers` subcommand
- **Domain Files**: Updated constitution.yaml, global.yaml, orchestrator.yaml, dev.yaml, brownfield-wu.yaml
- **Intelligence Docs**: Added Multi-CLI Context Strategy and Cross-CLI Memory Persistence sections

### Stats

- 20 new source files, ~30 modified files
- Constitution: 19 Articles + Preamble (v3.0.0)
- Multi-CLI: 4 providers supported (claude, gemini, codex, copilot)
- Claude Code remains primary and fully functional — multi-CLI is opt-in

---

## [2.1.2] - 2026-02-17

### Changed

- **License**: Migrated from BSL 1.1 to MIT License with trademark notice
- **README**: Full rewrite for clarity and non-technical accessibility
- **SECURITY.md**: Simplified — removed SLA commitments, fixed broken links
- **Sponsor**: Added Buy Me a Coffee via GitHub Sponsors

---

## [2.1.0] - 2026-02-17

### Changed

- **Pipeline Phases**: Split PLANNING into DISCOVER + PLAN. Pipeline is now 4 phases: DISCOVER → PLAN → BUILD → DEPLOY
- **Quick Flow**: New workflow blueprint for rapid prototyping

### Fixed

- Full internal consistency audit — 990 tests, 158 files validated, 4 scan rounds
- Mode governance hook, session state defaults, task phase alignment, cross-references

---

## [2.0.9] - 2026-02-17

- Migrated repository to `Chati-dev` GitHub organization
- Restructured Quick Start documentation

---

## [2.0.7] - 2026-02-16

### Added

- **Ed25519 Manifest Signing**: Cryptographic signing of framework files on publish, verified on install
- **Read Protection Hook**: Blocks reads of sensitive files (`.env`, `.pem`, `.key`, `credentials.*`)
- **Semantic Linter**: Cross-reference validation across entity registry, domains, workflows, i18n, schemas
- **Package Validator**: Pre-publish validation of framework bundle

---

## [2.0.5] - 2026-02-14

### Added

- **Multi-Terminal Spawning**: Autonomous agents in separate `claude -p` terminals with model assignments
- **Terminal Modules**: prompt-builder, handoff-parser, run-agent, run-parallel
- **Stdin Piping**: Prompts piped via stdin for shell injection prevention

### Changed

- Pipeline phase renamed from CLARITY to PLANNING across ~150 files
- README rewritten with pipeline diagram showing terminal spawning and parallel execution

---

## [2.0.0] - 2026-02-13

### Added

- **Context Engine PRISM**: 5-layer injection pipeline with bracket tracking and domain loading
- **Hooks System**: 5 Claude Code hooks for automatic enforcement
- **Task Definitions**: 72 task files across 13 agents with runtime modules
- **Memory System RECALL**: Gotchas auto-capture, per-agent memory, session digests
- **Decision Engine COMPASS**: Jaccard similarity for REUSE/ADAPT/CREATE decisions
- **Orchestrator Intelligence**: Intent classifier, agent selector, pipeline manager, deviation handler
- **Execution Modes**: Autonomous and human-in-the-loop with safety net and circuit breaker
- **Quality Gates**: 5 pipeline gates with circuit breaker pattern
- **18 Infrastructure Scripts**: Health check, validators, analyzers, generators

### Stats

- 843 tests, ~60 source modules, 72 task definitions, 13 enriched agents

---

## [1.4.0] - 2026-02-12

- **Model Governance (Article XVI)**: Per-agent model selection (opus/sonnet/haiku)
- Constitution updated to 16 articles

## [1.3.0] - 2026-02-12

- **Quality Infrastructure**: ESLint, node:test suite (115+ tests), GitHub Actions CI
- **Intelligence Runtime**: CLI commands for memory, context, registry, health check
- **Entity Registry**: 47 entities cataloged
- Constitution updated to 15 articles

## [1.2.0] - 2026-02-12

- **Context Engine**: Bracket-aware context management (FRESH/MODERATE/DEPLETED/CRITICAL)
- **Memory Layer**: 4 cognitive sectors, 3-level retrieval, attention scoring
- **Session Lock Protocol**: All messages routed through orchestrator when active
- Constitution Articles XII-XV added

## [1.1.0] - 2026-02-08

- **Mode Governance (Article XI)**: 3 modes (planning, build, deploy) with autonomous transitions

## [1.0.0] - 2026-02-07

- **13 Agents**: Orchestrator + 12 specialized agents
- **8 Universal Protocols**: Self-Validation, Loop Until Done, Guided Options, Persistence, Two-Layer Handoff, Language Protocol, Deviation Protocol, Interaction Model
- **5 Workflow Blueprints**: Greenfield Fullstack, Brownfield Discovery/Fullstack/UI/Service
- **Constitution**: 10 Articles + Preamble
- **CLI**: Installer wizard, dashboard TUI, upgrade system
- **6 IDE Support**: Claude Code, VS Code, AntiGravity, Cursor, Gemini CLI, GitHub Copilot
- **i18n**: EN, PT, ES, FR
