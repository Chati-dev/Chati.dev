# Memory Layer — Persistent Intelligence Across Sessions

## Purpose

The Memory Layer adds persistent knowledge to the Chati.dev system. While session state (agent scores, pipeline position) is stored in `.chati/session.yaml`, the Memory Layer captures **knowledge** — decisions, patterns, errors, and lessons — that persists across sessions.

---

## Capture — Session Digest

Before context is compacted (PreCompact event), the system automatically captures:

| Captured | Example |
|----------|---------|
| Decisions | "User chose JWT over session-based auth" |
| Error patterns | "CORS issues when API runs on different port" |
| Resolutions | "Added proxy config to next.config.js" |
| User corrections | "User prefers functional components over class" |
| Validated patterns | "This project uses barrel exports in index.ts" |

The digest is stored as a Markdown file with structured metadata.

---

## Storage — `.chati/memories/`

```
.chati/memories/
  shared/                        # Cross-agent memories
    durable/                     # Permanent knowledge (never expires)
    daily/                       # Day-level consolidation
    session/                     # Ephemeral (cleaned on next session start)
  {agent-name}/                  # Agent-private memories
    durable/
    daily/
  index.json                     # Search index (derived, rebuildable)
```

### Storage Tiers

- **Session**: Lives during current session only. Cleaned on next start.
- **Daily**: Day-level consolidation. Auto-archived after 30 days.
- **Durable**: Permanent knowledge. Never expires unless explicitly removed.

**Note**: `.chati/memories/` is gitignored (runtime state, not committed).

---

## Memory Format

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
During architecture phase, evaluated JWT vs session-based auth.

## Decision
JWT chosen for stateless API, with refresh token rotation.

## Implementation
- `@/lib/auth/jwt.ts` — Token generation and validation
- `@/middleware.ts` — Route protection middleware
- Refresh tokens stored in httpOnly cookies

## Gotcha
Token validation fails silently when `JWT_SECRET` contains special characters.
Always use base64-encoded secrets.
```

---

## Progressive Retrieval

Memories are retrieved progressively based on context budget:

| Level | ~Tokens | Content | When Used |
|-------|---------|---------|-----------|
| **L1: Metadata** | ~50 | IDs, titles, tags, scores | Bracket MODERATE |
| **L2: Chunks** | ~200 | Summary + key decisions | Bracket DEPLETED |
| **L3: Full** | ~1000+ | Complete memory content | Bracket CRITICAL, handoffs |

This reduces token usage by 60-95% compared to loading full memories.

---

## Cognitive Sectors

Each memory is classified into 1 of 4 cognitive sectors:

| Sector | Meaning | What It Stores |
|--------|---------|----------------|
| **Episodic** | "What happened" | Sessions, events, timelines, decision history |
| **Semantic** | "What we know" | Facts, concepts, definitions, domain knowledge |
| **Procedural** | "How to do it" | Patterns, workflows, step-by-step guides, recipes |
| **Reflective** | "What we learned" | Insights, principles, heuristics, lessons |

### Agent Sector Preferences

| Agent | Primary Sectors | Rationale |
|-------|----------------|-----------|
| Greenfield WU | Semantic, Episodic | Domain facts + similar project history |
| Brownfield WU | Semantic, Episodic | Existing code facts + historical context |
| Brief | Episodic, Semantic | User decisions + knowledge base |
| Detail (PRD) | Semantic, Episodic | Domain facts + decision history |
| Architect | Semantic, Reflective | Technical patterns + lessons learned |
| UX | Reflective, Procedural | UX lessons + implementation how-to |
| Phases | Procedural, Semantic | Decomposition how-to + project facts |
| Tasks | Procedural, Semantic | Task creation how-to + project facts |
| QA-Planning | Reflective, Episodic | Lessons learned + what happened |
| Dev | Procedural, Semantic | How to code + what to build |
| QA-Implementation | Reflective, Episodic | Bug patterns + what happened |
| DevOps | Procedural, Episodic | How to deploy + what happened |

---

## Attention Scoring

Every memory has an attention score that determines loading priority:

```
score = base_relevance * recency_factor * access_modifier * confidence
```

Where:
- `base_relevance` (0.0-1.0): Semantic match to current agent context
- `recency_factor`: Exponential decay based on time since last access
- `access_modifier`: Logarithmic boost based on access count
- `confidence` (0.0-1.0): How certain the system is about this memory

### Tier Classification

- **HOT** (score > 0.7): Pre-loaded into agent context automatically
- **WARM** (0.3-0.7): Loaded on demand when relevant
- **COLD** (score < 0.3): Only retrieved via explicit search

### Tier Transitions

- COLD -> WARM: `access_count >= 3` OR `evidence_count >= 2`
- WARM -> HOT: `confidence > 0.7` AND `evidence >= 5`
- HOT -> WARM/COLD: Natural decay when not accessed
- ANY -> ARCHIVE: `score < 0.1` for 90+ days

---

## Agent Privacy

Each agent has:
- **Private memories**: Only visible to that agent (stored in `{agent-name}/`)
- **Shared memories**: Visible to all agents (stored in `shared/`)

This prevents cross-contamination while enabling knowledge sharing.

---

## Integration with Context Engine

| Bracket | Memory Level | Behavior |
|---------|-------------|----------|
| FRESH | None | Context is sufficient — no memory injection |
| MODERATE | L1 Metadata | Light reminder of relevant memories (~50 tokens) |
| DEPLETED | L2 Chunks | Context recovery via memory summaries (~200 tokens) |
| CRITICAL | L3 Full | Full memory dump for session handoff (~1000+ tokens) |

---

## Constitution Reference

**Article XIII: Memory Governance** — Memories are captured automatically. Never auto-modify user files. Heuristic proposals require confidence > 0.9, evidence >= 5, and explicit user approval.

---

*Memory Layer v1.0 — Chati.dev Intelligence Layer*

---

## Cross-CLI Memory Persistence (v3.0.0)

Memory is provider-agnostic. All providers read from and write to the same memory store (`.chati/memories/`).

### Memory Capture Across Providers
- **Hook-based providers**: Capture via `PreCompact` hook (session-digest.js)
- **Prompt-based providers**: Capture via explicit instructions in the spawned prompt — the agent is instructed to output a `<chati-memory>` block that the orchestrator parses from stdout

### Memory Injection Across Providers
- **Hook-based providers**: Injected via PRISM engine hook (prism-engine.js)
- **Prompt-based providers**: Relevant memories are included in the spawned prompt by the prompt-builder

### Gotchas Auto-Capture
Gotchas are captured regardless of provider. The auto-capture engine monitors agent stdout for error patterns and tracks frequency. When an error pattern appears 3+ times across any provider combination, a gotcha is auto-created.
