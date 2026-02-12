# chati.dev Upgrade V7.1 — Intelligence Layer

**Baseline**: V7 Specification (2026-02-07)
**Upgrade**: V7.1 Intelligence Layer (2026-02-12)
**Status**: Specification Complete

---

## 1. Summary of Changes

V7.1 adds an **Intelligence Layer** to the chati.dev framework — three interconnected systems that make the 13-agent pipeline smarter, more context-aware, and capable of learning across sessions.

| Change | System | Impact |
|--------|--------|--------|
| Windsurf Removal | IDE Support | 7 IDEs -> 6 IDEs |
| Context Engine | Orchestrator | Bracket-aware context injection (4 brackets, 5 layers) |
| Memory Layer | All Agents | Persistent knowledge across sessions (4 cognitive sectors) |
| Framework Registry | Framework | Entity tracking + decision engine (REUSE/ADAPT/CREATE) |
| Session Lock Protocol | Orchestrator | Once activated, user stays in system until explicit exit |
| Constitution XII-XV | Governance | 4 new articles governing intelligence systems + session lock |

### New File Summary

| File | Purpose |
|------|---------|
| `chati.dev/intelligence/context-engine.md` | Context Engine specification |
| `chati.dev/intelligence/memory-layer.md` | Memory Layer specification |
| `chati.dev/intelligence/decision-engine.md` | Decision Engine specification |
| `chati.dev/schemas/context.schema.json` | `<chati-context>` block schema |
| `chati.dev/schemas/memory.schema.json` | Memory entry schema |
| `chati.dev/data/entity-registry.yaml` | Framework entity registry |

---

## 2. Windsurf Removal (7 -> 6 IDEs)

Windsurf has been discontinued from the supported IDE list.

### Supported IDEs (V7.1)

| IDE | Config Path | Rules File | MCP Support |
|-----|-------------|------------|-------------|
| Claude Code | `.claude/commands/` | `.claude/CLAUDE.md` | Full |
| VS Code | `.vscode/chati/` | `.vscode/chati/rules.md` | Partial |
| AntiGravity | `.antigravity/agents/` | `.antigravity/rules.md` | Full |
| Cursor | `.cursor/rules/` | `.cursorrules` | Partial |
| Gemini CLI | `.gemini/agents/` | `.gemini/instructions.md` | Partial |
| GitHub Copilot | `.github/agents/` | `.github/copilot-instructions.md` | Partial |

### Files Modified

- `packages/chati-dev/src/config/ide-configs.js` — Removed windsurf entry
- `chati.dev/schemas/session.schema.json` — Removed from enum
- `packages/chati-dev/framework/schemas/session.schema.json` — Removed from enum
- `README.md` — Updated IDE count and table
- `CHANGELOG.md` — Updated IDE list
- `packages/chati-dev/package.json` — Updated description
- `packages/chati-dev/bin/chati.js` — Updated IDE count

---

## 3. Context Engine — Bracket-Aware Context Management

### Problem

The chati.dev pipeline operates 13 agents across sessions that can span hours or days. As the context window fills, agent quality degrades because the same amount of contextual information is injected regardless of remaining capacity. Late-pipeline agents (Tasks, QA-Planning) receive degraded context compared to early agents (WU, Brief).

### Solution

The **Context Engine** introduces automatic context bracket detection and adaptive rule injection. The orchestrator monitors context usage and adjusts what information is injected into each agent's prompt.

### 3.1 Context Brackets

Four brackets define how much context remains and what behavior is appropriate:

| Bracket | Context Remaining | Behavior |
|---------|-------------------|----------|
| **FRESH** | 60-100% | All protocols active. Minimal injection — context is plentiful. |
| **MODERATE** | 40-60% | Normal protocols. Summarize long outputs. Standard memory retrieval. |
| **DEPLETED** | 25-40% | Reinforce Constitution + Agent scope. Skip optional patterns. Recover context via memory. |
| **CRITICAL** | <25% | Constitution + Agent scope only. Trigger handoff to new session. Full memory dump for continuity. |

### 3.2 Layered Context Injection

The orchestrator injects context through 5 hierarchical layers. Higher brackets activate fewer layers to conserve tokens.

| Layer | Name | Source | When Active |
|-------|------|--------|-------------|
| **L0** | Constitution | `chati.dev/constitution.md` (Articles I-XIV) | ALWAYS (non-negotiable) |
| **L1** | Mode + Global | `config.yaml` + mode governance (clarity/build/deploy) | ALWAYS |
| **L2** | Agent Scope | `chati.dev/agents/{agent}/` — mission, inputs, outputs, criteria | When agent is active |
| **L3** | Pipeline State | `.chati/session.yaml` — pipeline position, scores, backlog | When session is active |
| **L4** | Task Context | Active artifact + previous agent's handoff | When task is active |

**Layer activation by bracket:**

| Bracket | Active Layers | Approx. Token Budget |
|---------|--------------|---------------------|
| FRESH | L0, L1, L2, L3, L4 | ~2500 tokens |
| MODERATE | L0, L1, L2, L3, L4 | ~2000 tokens |
| DEPLETED | L0, L1, L2 | ~1500 tokens |
| CRITICAL | L0, L1 | ~800 tokens |

### 3.3 Context Block Format

The orchestrator produces a structured XML block injected into agent prompts:

```xml
<chati-context bracket="MODERATE">
  <constitution>
    Articles I-XIV governing agent behavior.
    Key: Self-validation required. Loop until quality threshold.
    Guided options (1,2,3). Persistent session state.
    Two-layer handoff. Language protocol. Deviation protocol.
    Mode governance (clarity/build/deploy).
    Context brackets. Memory governance. Registry governance.
  </constitution>

  <mode>clarity</mode>

  <agent name="brief" mission="Extract user requirements in 5 structured phases">
    <inputs>WU artifact, user access</inputs>
    <outputs>Brief document with functional/non-functional requirements</outputs>
    <criteria>All 5 phases completed, requirements categorized, user confirmed</criteria>
  </agent>

  <pipeline>
    WU(100%) -> Brief(in_progress, 45%) -> Detail(pending) -> Architect(pending)
    -> UX(pending) -> Phases(pending) -> Tasks(pending) -> QA-Planning(pending)
  </pipeline>

  <task>Phase 2: Core Requirements Elicitation</task>

  <handoff from="greenfield-wu" score="95">
    Project: SaaS platform for team collaboration.
    Stack: Next.js + PostgreSQL + Vercel.
    Key constraint: Must support real-time features.
    User level: power_user (confidence: 0.85)
  </handoff>

  <memory bracket="MODERATE" level="metadata">
    [3 HOT memories available: auth-pattern, db-migration-gotcha, user-preference-dark-mode]
  </memory>
</chati-context>
```

### 3.4 Bracket Detection

Context usage is estimated using prompt count and average token size:

```
contextPercent = (estimatedUsedTokens / maxContextTokens) * 100
bracket = calculateBracket(100 - contextPercent)
```

The orchestrator recalculates the bracket before each agent interaction and adjusts injection accordingly.

### 3.5 Autonomous Context Recovery (2-Level Strategy)

The Context Engine uses a **two-level autonomous strategy** to handle context depletion. The user should never need to manually manage context — the system handles it transparently.

#### Level 1: Smart Continuation (default, automatic)

When context is compacted by the IDE (PreCompact event), the orchestrator continues seamlessly:

```
Context filling up
    │
    ▼
PreCompact Hook Fires
    │
    ├─ 1. Capture session digest (decisions, errors, patterns)
    ├─ 2. Persist all HOT+WARM memories to .chati/memories/
    └─ 3. Store continuation state in .chati/session.yaml
    │
    ▼
IDE Auto-Compaction Occurs (context compressed)
    │
    ▼
Post-Compact: Bracket resets to FRESH
    │
    ├─ 1. Orchestrator detects post-compact state
    ├─ 2. Loads HOT memories for current agent
    ├─ 3. Rebuilds <chati-context> with FRESH bracket
    ├─ 4. Injects continuation prompt with full pipeline state
    └─ 5. Agent resumes exactly where it left off
    │
    ▼
User experiences zero interruption
```

The user does not need to do anything. The session continues as if nothing happened. This works in all IDEs.

#### Level 2: Autonomous Session Spawn (fallback)

If Smart Continuation is insufficient (e.g., multiple compactions in short time, or context is too degraded to recover), the orchestrator spawns a new session autonomously:

```
Multiple compactions detected OR context quality degraded
    │
    ▼
Orchestrator decides to spawn new session
    │
    ├─ 1. Generate comprehensive continuation prompt:
    │     - Full pipeline state from session.yaml
    │     - All HOT memories for current + next agents
    │     - Current task context + partial progress
    │     - Pending decisions requiring user input
    │
    ├─ 2. Persist continuation prompt to:
    │     .chati/continuation/latest.md
    │
    └─ 3. Spawn new session via:
          - Claude Code: Task tool (subagent) or new terminal
          - AntiGravity: New agent session via platform API
          - Other IDEs: Generate /chati resume command for manual pickup
    │
    ▼
New session starts with FRESH bracket + full context from memories
    │
    ▼
Agent continues autonomously from exact stopping point
```

#### Spawn Decision Criteria

The orchestrator spawns a new session when ANY of these conditions are met:

| Condition | Threshold | Rationale |
|-----------|-----------|-----------|
| Multiple compactions | 3+ in single session | Context is churning too fast |
| Post-compact quality | Agent score drops >15% | Compaction lost critical context |
| Critical bracket persists | CRITICAL for 3+ consecutive interactions | Recovery not working |
| Agent handoff pending | Current agent done, next agent needs fresh context | Clean start is better |

#### IDE-Specific Behavior

| IDE | Level 1 (Smart Continuation) | Level 2 (Spawn) |
|-----|------------------------------|-----------------|
| Claude Code | Automatic via PreCompact hook | Task tool subagent or `claude` CLI spawn |
| AntiGravity | Automatic via platform hooks | New agent session via platform API |
| Cursor | Automatic via context detection | Generate `.chati/continuation/latest.md` for manual resume |
| VS Code | Automatic via context detection | Generate continuation file for manual resume |
| Gemini CLI | Automatic via context detection | `gemini` CLI spawn |
| GitHub Copilot | Automatic via context detection | Generate continuation file for manual resume |

**Note**: Full autonomous spawn (Level 2) is available in Claude Code, AntiGravity, and Gemini CLI. Other IDEs fall back to generating a continuation file that the user can load with `/chati resume`.

---

## 4. Memory Layer — Persistent Intelligence Across Sessions

### Problem

chati.dev persists **state** in `.chati/session.yaml` (agent scores, pipeline position, backlog), but does not persist **knowledge**. When a session ends:
- Decisions and their rationale are lost
- Error patterns and their resolutions vanish
- User corrections and preferences disappear
- Cross-agent learning (e.g., QA findings informing Dev) is not retained

Each new session starts with zero institutional memory.

### Solution

The **Memory Layer** adds intelligent, persistent memory to the framework. Knowledge is captured automatically, stored as searchable files, retrieved progressively based on context budget, and evolves through attention scoring.

### 4.1 Capture — Session Digest

Before context is compacted (PreCompact event), the system automatically captures:

| Captured | Example |
|----------|---------|
| Decisions | "User chose JWT over session-based auth" |
| Error patterns | "CORS issues when API runs on different port" |
| Resolutions | "Added proxy config to next.config.js" |
| User corrections | "User prefers functional components over class" |
| Validated patterns | "This project uses barrel exports in index.ts" |

The digest is stored as a Markdown file with structured metadata.

### 4.2 Storage — `.chati/memories/`

```
.chati/memories/
  shared/                        # Cross-agent memories
    durable/                     # Permanent knowledge (never expires)
      2026-02-12-jwt-auth.md
      2026-02-10-db-schema.md
    daily/                       # Day-level consolidation
      2026-02-12/
        session-001-digest.md
    session/                     # Ephemeral (cleaned on next session start)
      current-session.md
  brief/                         # Brief agent private memories
    durable/
    daily/
  architect/                     # Architect agent private memories
    durable/
    daily/
  dev/                           # Dev agent private memories
    durable/
    daily/
  ... (one directory per agent)
  index.json                     # Search index (derived, rebuildable)
```

**Storage tiers:**
- **Session**: Lives during current session only. Cleaned on next start.
- **Daily**: Day-level consolidation. Auto-archived after 30 days.
- **Durable**: Permanent knowledge. Never expires unless explicitly removed.

**Note**: `.chati/memories/` is gitignored (runtime state, not committed).

### 4.3 Memory Format

Each memory is a Markdown file with YAML frontmatter:

```markdown
---
id: mem-2026-02-12-001
type: procedural
agent: architect
tags: [authentication, jwt, pattern, validated]
confidence: 0.92
sector: procedural
tier: hot
access_count: 7
last_accessed: 2026-02-12T16:30:00Z
created_at: 2026-02-10T10:15:00Z
---

# Pattern: JWT Authentication in Next.js Projects

## Context
During architecture phase, evaluated JWT vs session-based auth for SaaS platform.

## Decision
JWT chosen for stateless API, with refresh token rotation for security.

## Implementation
- `@/lib/auth/jwt.ts` — Token generation and validation
- `@/middleware.ts` — Route protection middleware
- Refresh tokens stored in httpOnly cookies

## Gotcha
Token validation fails silently when `JWT_SECRET` contains special characters.
Always use base64-encoded secrets.
```

### 4.4 Progressive Retrieval

Instead of loading all memories or none, the system retrieves progressively based on context budget:

| Level | Tokens | Content | When Used |
|-------|--------|---------|-----------|
| **L1: Metadata** | ~50 | IDs, titles, tags, scores | Quick listing, bracket MODERATE |
| **L2: Chunks** | ~200 | Summary + key decisions | Moderate context, bracket DEPLETED |
| **L3: Full** | ~1000+ | Complete memory content | Deep context, bracket CRITICAL, handoffs |

This reduces token usage by 60-95% compared to loading full memories.

### 4.5 Cognitive Sectors

Each memory is classified into one of 4 cognitive sectors. Agents have sector preferences that determine what memories are most relevant to them:

| Sector | Meaning | What It Stores |
|--------|---------|----------------|
| **Episodic** | "What happened" | Sessions, events, timelines, decision history |
| **Semantic** | "What we know" | Facts, concepts, definitions, domain knowledge |
| **Procedural** | "How to do it" | Patterns, workflows, step-by-step guides, recipes |
| **Reflective** | "What we learned" | Insights, principles, heuristics, lessons |

**Agent sector preferences:**

| Agent | Primary Sectors | Rationale |
|-------|----------------|-----------|
| Greenfield WU | Semantic, Episodic | Needs FACTS about domain + WHAT HAPPENED in similar projects |
| Brownfield WU | Semantic, Episodic | Needs FACTS about existing code + WHAT HAPPENED historically |
| Brief | Episodic, Semantic | User DECISIONS + knowledge base |
| Detail (PRD) | Semantic, Episodic | Domain FACTS + decision HISTORY |
| Architect | Semantic, Reflective | Technical PATTERNS + LESSONS learned |
| UX | Reflective, Procedural | UX LESSONS + HOW to implement |
| Phases | Procedural, Semantic | Decomposition HOW-TO + project FACTS |
| Tasks | Procedural, Semantic | Task creation HOW-TO + project FACTS |
| QA-Planning | Reflective, Episodic | LESSONS learned + WHAT happened |
| Dev | Procedural, Semantic | HOW to code + WHAT to build |
| QA-Implementation | Reflective, Episodic | Bug PATTERNS + WHAT happened |
| DevOps | Procedural, Episodic | HOW to deploy + WHAT happened |

### 4.6 Attention Scoring

Every memory has an attention score that determines loading priority:

```
score = base_relevance * recency_factor * access_modifier * confidence
```

Where:
- `base_relevance` (0.0-1.0): Semantic match to current agent context
- `recency_factor`: Exponential decay based on time since last access
- `access_modifier`: Logarithmic boost based on access count
- `confidence` (0.0-1.0): How certain the system is about this memory

**Tier classification:**
- **HOT** (score > 0.7): Pre-loaded into agent context automatically
- **WARM** (0.3-0.7): Loaded on demand when relevant
- **COLD** (score < 0.3): Only retrieved via explicit search

**Natural decay**: Memories that are not accessed lose relevance over time, creating organic forgetting. Frequently accessed memories stay HOT.

**Tier transitions:**
- COLD -> WARM: `access_count >= 3` OR `evidence_count >= 2`
- WARM -> HOT: `confidence > 0.7` AND `evidence >= 5`
- HOT -> WARM/COLD: Natural decay when not accessed
- ANY -> ARCHIVE: `score < 0.1` for 90+ days

### 4.7 Integration with Context Engine

The Memory Layer integrates directly with the Context Engine brackets:

| Bracket | Memory Level | Behavior |
|---------|-------------|----------|
| FRESH | None | Context is sufficient — no memory injection |
| MODERATE | L1 Metadata | Light reminder of relevant memories (~50 tokens) |
| DEPLETED | L2 Chunks | Context recovery via memory summaries (~200 tokens) |
| CRITICAL | L3 Full | Full memory dump for session handoff (~1000+ tokens) |

### 4.8 Agent Privacy

Each agent has:
- **Private memories**: Only visible to that agent (stored in `{agent-name}/`)
- **Shared memories**: Visible to all agents (stored in `shared/`)

This prevents cross-contamination while enabling knowledge sharing. The Architect's technical patterns remain private, but validated decisions are shared with Dev.

### 4.9 Memory Governance (Constitution Article XIII)

- Memories are captured **automatically** — agents do not need to explicitly save
- The system **never auto-modifies user files** (code, configs, etc.)
- Heuristic proposals (new rules derived from patterns) require:
  - Confidence > 0.9
  - Evidence count >= 5
  - Explicit user approval before integration
- Users can review, edit, or delete any memory at any time

---

## 5. Framework Registry — Entity Tracking & Decision Engine

### Problem

chati.dev contains 13 agents, 5 templates, 5 workflows, multiple schemas, a constitution, intelligence documents, frameworks, patterns, migrations, and quality gates. There is no centralized catalog of these artifacts, making it difficult to:
- Know what exists and where
- Assess impact of changes
- Make reuse-vs-create decisions in brownfield analysis
- Validate framework integrity after updates

### Solution

The **Framework Registry** provides a single source of truth for all framework artifacts, plus a decision engine that formalizes reuse decisions.

### 5.1 Entity Registry

A YAML file catalogs every artifact in the framework:

```yaml
# chati.dev/data/entity-registry.yaml
metadata:
  version: "1.0.0"
  last_updated: "2026-02-12T00:00:00Z"
  entity_count: 48
  checksum_algorithm: sha256

entities:
  agents:
    orchestrator:
      path: chati.dev/orchestrator/chati.md
      type: agent
      purpose: "Route user requests to correct agent, manage session state and deviations"
      keywords: [routing, session, deviation, handoff, mode-governance]
      dependencies: [constitution, session-schema, config]
      adaptability: 0.2
      checksum: "<sha256>"

    greenfield-wu:
      path: chati.dev/agents/clarity/greenfield-wu.md
      type: agent
      purpose: "Analyze greenfield project context, constraints, and technology landscape"
      keywords: [greenfield, analysis, context, technology, constraints]
      dependencies: [brief-template, session-schema]
      adaptability: 0.5

    brownfield-wu:
      path: chati.dev/agents/clarity/brownfield-wu.md
      type: agent
      purpose: "Deep discovery of existing codebase — architecture, patterns, debt, dependencies"
      keywords: [brownfield, discovery, codebase, architecture, debt]
      dependencies: [brief-template, session-schema, decision-engine]
      adaptability: 0.5

    brief:
      path: chati.dev/agents/clarity/brief.md
      type: agent
      purpose: "Extract and structure user requirements through 5 elicitation phases"
      keywords: [requirements, elicitation, brief, functional, non-functional]
      dependencies: [brief-template, session-schema]
      adaptability: 0.4

    detail:
      path: chati.dev/agents/clarity/detail.md
      type: agent
      purpose: "Transform Brief into formal PRD with complete specifications"
      keywords: [prd, specification, detail, formal, requirements]
      dependencies: [prd-template, session-schema]
      adaptability: 0.4

    architect:
      path: chati.dev/agents/clarity/architect.md
      type: agent
      purpose: "Design technical architecture, make technology decisions, define system boundaries"
      keywords: [architecture, technology, design, patterns, boundaries]
      dependencies: [architecture-template, session-schema]
      adaptability: 0.3

    ux:
      path: chati.dev/agents/clarity/ux.md
      type: agent
      purpose: "Design user experience, interaction flows, and interface structure"
      keywords: [ux, design, interaction, flows, interface, wireframes]
      dependencies: [session-schema]
      adaptability: 0.5

    phases:
      path: chati.dev/agents/clarity/phases.md
      type: agent
      purpose: "Decompose PRD into development phases with MVP-first strategy"
      keywords: [phases, decomposition, mvp, planning, milestones]
      dependencies: [session-schema]
      adaptability: 0.4

    tasks:
      path: chati.dev/agents/clarity/tasks.md
      type: agent
      purpose: "Create executable tasks with acceptance criteria from phase definitions"
      keywords: [tasks, acceptance-criteria, executable, given-when-then]
      dependencies: [task-template, session-schema]
      adaptability: 0.4

    qa-planning:
      path: chati.dev/agents/quality/qa-planning.md
      type: agent
      purpose: "Validate traceability and consistency across all clarity artifacts"
      keywords: [qa, traceability, consistency, validation, quality-gate]
      dependencies: [qa-gate-template, session-schema]
      adaptability: 0.3

    qa-implementation:
      path: chati.dev/agents/quality/qa-implementation.md
      type: agent
      purpose: "Validate implementation against specifications — tests, SAST, code review"
      keywords: [qa, implementation, tests, sast, code-review]
      dependencies: [qa-gate-template, session-schema]
      adaptability: 0.3

    dev:
      path: chati.dev/agents/build/dev.md
      type: agent
      purpose: "Implement features following task specifications and architecture decisions"
      keywords: [development, implementation, coding, features]
      dependencies: [session-schema]
      adaptability: 0.5

    devops:
      path: chati.dev/agents/deploy/devops.md
      type: agent
      purpose: "Deploy, configure CI/CD, manage infrastructure and releases"
      keywords: [deploy, cicd, infrastructure, releases, git]
      dependencies: [session-schema]
      adaptability: 0.4

  templates:
    prd:
      path: chati.dev/templates/prd.md
      type: template
      purpose: "Product Requirements Document template for greenfield projects"
      keywords: [prd, requirements, document, greenfield]
      dependencies: []
      adaptability: 0.6

    brownfield-prd:
      path: chati.dev/templates/brownfield-prd.md
      type: template
      purpose: "PRD template adapted for brownfield projects with existing codebase analysis"
      keywords: [prd, brownfield, existing, codebase]
      dependencies: []
      adaptability: 0.6

    fullstack-architecture:
      path: chati.dev/templates/fullstack-architecture.md
      type: template
      purpose: "Architecture document template for full-stack applications"
      keywords: [architecture, fullstack, system-design, technology]
      dependencies: []
      adaptability: 0.7

    task:
      path: chati.dev/templates/task.md
      type: template
      purpose: "Task template with acceptance criteria in Given-When-Then format"
      keywords: [task, acceptance-criteria, given-when-then]
      dependencies: []
      adaptability: 0.7

    qa-gate:
      path: chati.dev/templates/qa-gate.md
      type: template
      purpose: "Quality gate report template for QA agents"
      keywords: [qa, gate, report, validation]
      dependencies: []
      adaptability: 0.6

  workflows:
    greenfield-fullstack:
      path: chati.dev/workflows/greenfield-fullstack.md
      type: workflow
      purpose: "Full pipeline for new greenfield fullstack projects"
      keywords: [greenfield, fullstack, pipeline, complete]
      dependencies: [orchestrator]
      adaptability: 0.3

    brownfield-discovery:
      path: chati.dev/workflows/brownfield-discovery.md
      type: workflow
      purpose: "Deep discovery workflow for existing codebases"
      keywords: [brownfield, discovery, analysis, existing]
      dependencies: [orchestrator, brownfield-wu]
      adaptability: 0.4

    brownfield-fullstack:
      path: chati.dev/workflows/brownfield-fullstack.md
      type: workflow
      purpose: "Full pipeline for brownfield projects after discovery"
      keywords: [brownfield, fullstack, pipeline]
      dependencies: [orchestrator]
      adaptability: 0.3

    brownfield-ui:
      path: chati.dev/workflows/brownfield-ui.md
      type: workflow
      purpose: "UI-focused workflow for brownfield frontend changes"
      keywords: [brownfield, ui, frontend, interface]
      dependencies: [orchestrator]
      adaptability: 0.5

    brownfield-service:
      path: chati.dev/workflows/brownfield-service.md
      type: workflow
      purpose: "Service-focused workflow for brownfield backend changes"
      keywords: [brownfield, service, backend, api]
      dependencies: [orchestrator]
      adaptability: 0.5

  schemas:
    session:
      path: chati.dev/schemas/session.schema.json
      type: schema
      purpose: "JSON schema for .chati/session.yaml runtime state"
      keywords: [session, state, validation, runtime]
      dependencies: []
      adaptability: 0.2

    config:
      path: chati.dev/schemas/config.schema.json
      type: schema
      purpose: "JSON schema for chati.dev/config.yaml framework configuration"
      keywords: [config, validation, installation]
      dependencies: []
      adaptability: 0.2

    context:
      path: chati.dev/schemas/context.schema.json
      type: schema
      purpose: "JSON schema for <chati-context> block structure"
      keywords: [context, bracket, injection, validation]
      dependencies: []
      adaptability: 0.2

    memory:
      path: chati.dev/schemas/memory.schema.json
      type: schema
      purpose: "JSON schema for memory entry frontmatter"
      keywords: [memory, entry, validation, frontmatter]
      dependencies: []
      adaptability: 0.2

  governance:
    constitution:
      path: chati.dev/constitution.md
      type: governance
      purpose: "14 Articles + Preamble governing all agent behavior"
      keywords: [constitution, governance, rules, articles]
      dependencies: []
      adaptability: 0.1
```

**Adaptability scoring:**
- 0.0-0.3: Low (core definitions — changes break consumers)
- 0.4-0.6: Medium (shared utilities — needs impact analysis)
- 0.7-1.0: High (specific tasks — safe to adapt)

### 5.2 Decision Engine

The Brownfield WU agent analyzes existing codebases and must decide whether to reuse, adapt, or create artifacts. The Decision Engine formalizes this:

**Algorithm**: TF-IDF keyword overlap (60% weight) + purpose similarity (40% weight)

| Similarity Score | Decision | Action |
|-----------------|----------|--------|
| >= 90% | **REUSE** | Use existing artifact as-is |
| 60-89% | **ADAPT** | Modify existing artifact (check adaptability constraints) |
| < 60% | **CREATE** | Build new artifact |

**Process:**
1. Extract keywords from developer intent (e.g., "I need a task for API endpoints")
2. Match against registry entities using TF-IDF
3. Score top matches by combined keyword + purpose similarity
4. Return ranked recommendations with decisions
5. Check adaptability score before recommending ADAPT

**Example:**
```
Intent: "I need a template for documenting API endpoints"
Top match: task template (72% similarity, adaptability: 0.7)
Decision: ADAPT — "The task template is similar. Recommend adapting it
           for API documentation. Adaptability score (0.7) confirms safe to modify."
```

### 5.3 Health Check

A CLI command validates framework integrity:

```bash
npx chati-dev health
```

**Checks performed:**
- All registered entities exist on disk
- Schema files are valid JSON
- Constitution is intact (all 14 articles present)
- Agent definitions contain required sections (mission, inputs, outputs, criteria)
- Templates contain required placeholders
- Registry checksums match file contents
- No orphaned dependencies

**Output:**
```
chati.dev Health Check
======================
Entities:    48/48 present
Schemas:     4/4 valid
Constitution: 14/14 articles
Agents:      13/13 complete
Templates:   5/5 valid
Checksums:   48/48 match
Status:      HEALTHY
```

---

## 6. Session Lock Protocol — Persistent System Containment

### Problem

When a user activates `/chati`, the orchestrator takes over. But in subsequent messages, there is no mechanism preventing the LLM from "forgetting" it's in a chati.dev session and responding as a generic assistant. This causes:
- Loss of pipeline context mid-session
- User accidentally exits the framework without knowing
- Agent state inconsistencies when the LLM responds outside the system

### Solution

The **Session Lock Protocol** ensures that once `/chati` is invoked, ALL subsequent messages are routed through the orchestrator and active agent. The user cannot accidentally fall out of the system.

### How It Works

```
User types /chati
    │
    ▼
Orchestrator activates
    │
    ├─ 1. Load session state
    ├─ 2. SET session lock = ACTIVE
    ├─ 3. Update CLAUDE.md with Session Lock block
    └─ 4. Route to current agent
    │
    ▼
ALL subsequent messages → Orchestrator → Active Agent
    │
    ├─ On-topic message → Route to current agent
    ├─ Off-topic message → Deviation Protocol (5.7), stay locked
    ├─ /chati subcommand → Execute (status, help, resume), stay locked
    └─ Exit command → Execute Exit Protocol, unlock
```

### CLAUDE.md Session Lock Block

When the session is active, CLAUDE.md contains a lock block that instructs the LLM:

```markdown
## Session Lock — ACTIVE

**chati.dev session is ACTIVE.** You MUST follow these rules for EVERY message:

1. Read `chati.dev/orchestrator/chati.md` and follow its routing logic
2. Route ALL user messages through the current agent: `{current_agent}`
3. NEVER respond outside of the chati.dev framework
4. NEVER act as generic AI — you ARE the chati.dev orchestrator
5. Off-topic requests → Deviation Protocol, do NOT exit the system
6. The ONLY way to exit: /chati exit, /chati stop, /chati quit
```

When the user exits, this block is replaced with `Status: INACTIVE`.

### Exit Commands

| Command | Scope |
|---------|-------|
| `/chati exit` | Primary exit command |
| `/chati stop` | Alias for exit |
| `/chati quit` | Alias for exit |
| Natural language | "sair do chati", "exit chati", "salir de chati", "quitter chati" |

**NOT exit triggers**: "stop" (without "chati"), "wait", "go back", "cancel" — these are navigation within the system, not exit.

### Exit Protocol

1. Save current agent state to session.yaml
2. Generate session digest for Memory Layer
3. Update CLAUDE.md: remove lock block, add resume instructions
4. Confirm to user in their language: "Session saved. Type /chati to resume."
5. Session data persists — nothing is lost

### Resume

When the user types `/chati` after a previous exit:
- Session is detected from session.yaml
- Session lock is re-activated
- CLAUDE.md lock block is re-injected
- User is seamlessly back in the system

---

## 7. Constitution Updates (Articles XII-XV)

The Constitution grows from 11 to 15 articles. Four new articles govern the Intelligence Layer systems and session containment.

### Article XII — Context Bracket Governance

```
Article XII: Context Bracket Governance

1. The orchestrator SHALL calculate the context bracket (FRESH, MODERATE,
   DEPLETED, CRITICAL) before every agent interaction.

2. Context injection layers SHALL be reduced according to bracket level:
   - FRESH/MODERATE: All 5 layers (L0-L4)
   - DEPLETED: L0 (Constitution) + L1 (Mode) + L2 (Agent) only
   - CRITICAL: L0 (Constitution) + L1 (Mode) only

3. Context recovery uses a two-level autonomous strategy:
   a. Level 1 (Smart Continuation): When context is compacted, the
      orchestrator SHALL automatically capture a digest, persist memories,
      and rebuild context post-compact. The user experiences zero
      interruption. This is the default behavior.
   b. Level 2 (Autonomous Spawn): When Smart Continuation is insufficient
      (3+ compactions, quality degradation >15%, or persistent CRITICAL
      bracket), the orchestrator SHALL spawn a new session autonomously
      with full context from memories and continuation state.

4. The Constitution (L0) and Mode governance (L1) are NON-NEGOTIABLE
   and SHALL be injected in ALL brackets, including CRITICAL.

5. Token budgets per bracket:
   - FRESH: 2500 tokens maximum
   - MODERATE: 2000 tokens maximum
   - DEPLETED: 1500 tokens maximum
   - CRITICAL: 800 tokens maximum

6. Autonomous spawn capability varies by IDE:
   - Full autonomy: Claude Code, AntiGravity, Gemini CLI
   - Continuation file: Cursor, VS Code, GitHub Copilot
     (user loads with /chati resume)
```

### Article XIII — Memory Governance

```
Article XIII: Memory Governance

1. The Memory Layer SHALL capture session knowledge automatically
   before context compaction (PreCompact event).

2. Memories are classified into 4 cognitive sectors:
   Episodic, Semantic, Procedural, Reflective.

3. Each agent SHALL have private memory scope plus access to shared
   memories. Agents SHALL NOT access other agents' private memories.

4. The system SHALL NEVER auto-modify user files (code, configurations,
   documentation). All file modifications require explicit user action.

5. Heuristic proposals (new rules derived from learned patterns)
   SHALL only be generated when:
   a. Confidence score exceeds 0.9
   b. Evidence count is 5 or greater
   c. The proposal is presented for explicit user approval

6. Users MAY review, edit, or delete any memory at any time.
   The system SHALL respect user decisions without question.

7. Memory attention scoring SHALL use natural decay — memories
   not accessed lose relevance organically. No memory is permanent
   unless explicitly marked as durable by the user.
```

### Article XIV — Framework Registry Governance

```
Article XIV: Framework Registry Governance

1. The entity registry (`chati.dev/data/entity-registry.yaml`) is the
   single source of truth for all framework artifacts.

2. The health check command (`npx chati-dev health`) performs advisory
   validation. It SHALL NEVER block development or prevent agent execution.

3. The Decision Engine follows the preference order:
   REUSE > ADAPT > CREATE
   Agents SHALL prefer reusing existing artifacts over creating new ones.

4. Adaptability constraints SHALL be respected — entities with
   adaptability < 0.3 require impact analysis before modification.

5. The registry SHALL be updated when artifacts are added, modified,
   or removed. Stale entries degrade system intelligence.

6. Checksum validation ensures file integrity. Mismatches indicate
   unauthorized or untracked modifications.
```

### Article XV — Session Lock Governance

```
Article XV: Session Lock Governance

1. When a session is active (session.yaml has project.name and
   current_agent), the session lock MUST be ACTIVE. CLAUDE.md MUST
   contain the Session Lock block.

2. Every user message MUST be routed through the orchestrator and
   then to the active agent. No message may be answered outside of
   the chati.dev framework while the lock is active.

3. The AI MUST NOT respond as a generic assistant while the lock is
   active. It IS the chati.dev orchestrator. Off-topic requests are
   handled via the Deviation Protocol (5.7), not by dropping out.

4. The session lock is released ONLY by explicit user intent via
   recognized exit commands (/chati exit, /chati stop, /chati quit)
   or clear natural language exit requests in the user's language.

5. On exit, all session state, progress, and partial work MUST be
   persisted. The session lock status in CLAUDE.md is set to INACTIVE.
   The user can resume anytime with /chati.

6. When /chati is invoked after a previous exit, the session lock is
   immediately re-activated and CLAUDE.md is updated with the active
   lock block.

7. If the IDE is closed/restarted, the session lock status in CLAUDE.md
   persists. On the next /chati invocation, the orchestrator detects
   the existing session and re-engages the lock.
```

---

## 8. Impact Matrix

### Impact on Existing Components

| Component | Impact | Changes Required |
|-----------|--------|-----------------|
| Orchestrator (`chati.md`) | HIGH | Add bracket detection, layered injection, memory integration, session lock |
| Constitution | MEDIUM | Add Articles XII-XV (4 new articles) |
| Session Schema | LOW | No changes (brackets are calculated, not stored) |
| Config Schema | LOW | No changes |
| All 12 Agents | LOW | Agents benefit automatically from context/memory — no code changes |
| Installer | LOW | Bundle new intelligence files |
| Dashboard | MEDIUM | Add memory stats, bracket display |
| Quality Gates | LOW | QA agents gain memory-backed validation |

### Impact on User Experience

| Before (V7) | After (V7.1) |
|-------------|-------------|
| Context degrades silently in long sessions | Orchestrator detects and adapts automatically |
| Knowledge lost between sessions | Memories persist and are retrieved progressively |
| Each session starts from zero | Agents receive relevant memories from past sessions |
| No framework health visibility | `npx chati-dev health` validates integrity |
| Brownfield WU uses ad-hoc analysis | Decision Engine formalizes REUSE/ADAPT/CREATE |
| User can accidentally "fall out" of the system | Session Lock keeps user inside until explicit exit |
| No explicit exit/resume commands | `/chati exit` saves session, `/chati` resumes seamlessly |

---

## 9. New Files & Schemas

### Intelligence Layer Files

| File | Type | Purpose |
|------|------|---------|
| `chati.dev/intelligence/context-engine.md` | Specification | Complete Context Engine definition |
| `chati.dev/intelligence/memory-layer.md` | Specification | Complete Memory Layer definition |
| `chati.dev/intelligence/decision-engine.md` | Specification | Decision Engine for brownfield analysis |

### Schemas

| File | Validates |
|------|-----------|
| `chati.dev/schemas/context.schema.json` | `<chati-context>` XML block structure |
| `chati.dev/schemas/memory.schema.json` | Memory entry YAML frontmatter |

### Data

| File | Purpose |
|------|---------|
| `chati.dev/data/entity-registry.yaml` | Central catalog of all framework artifacts |

### Runtime Directories

| Directory | Purpose | Gitignored |
|-----------|---------|------------|
| `.chati/memories/` | Memory storage (shared + per-agent) | Yes |

---

## 10. Version History

| Version | Date | Changes |
|---------|------|---------|
| V7 | 2026-02-07 | Initial standalone specification. 13 agents, 7 IDEs, 11 Articles. |
| V7.1 | 2026-02-12 | Intelligence Layer. Context Engine (4 brackets, 5 layers). Memory Layer (4 sectors, 3 retrieval levels). Framework Registry (entity catalog + decision engine). Session Lock Protocol (persistent system containment). 4 new Constitution articles (XII-XV). Windsurf removed (6 IDEs). |
