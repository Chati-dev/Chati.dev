# Context Engine — Bracket-Aware Context Management

## Purpose

The Context Engine monitors context window usage and adapts what information is injected into each agent's prompt. As the context fills, fewer layers are injected to preserve quality for critical operations.

---

## Context Brackets

Four brackets define behavior based on remaining context:

| Bracket | Context Remaining | Behavior |
|---------|-------------------|----------|
| **FRESH** | 60-100% | All protocols active. Minimal injection — context is plentiful. |
| **MODERATE** | 40-60% | Normal protocols. Summarize long outputs. Standard memory retrieval. |
| **DEPLETED** | 25-40% | Reinforce Constitution + Agent scope. Skip optional patterns. Recover context via memory. |
| **CRITICAL** | <25% | Constitution + Agent scope only. Trigger handoff to new session. Full memory dump for continuity. |

---

## Layered Context Injection

The orchestrator injects context through 5 hierarchical layers:

| Layer | Name | Source | When Active |
|-------|------|--------|-------------|
| **L0** | Constitution | `chati.dev/constitution.md` (Articles I-XIX) | ALWAYS (non-negotiable) |
| **L1** | Mode + Global | `config.yaml` + mode governance (planning/build/deploy) | ALWAYS |
| **L2** | Agent Scope | `chati.dev/agents/{agent}/` — mission, inputs, outputs, criteria | When agent is active |
| **L3** | Pipeline State | `.chati/session.yaml` — pipeline position, scores, backlog | When session is active |
| **L4** | Task Context | Active artifact + previous agent's handoff | When task is active |

### Layer Activation by Bracket

| Bracket | Active Layers | Approx. Token Budget |
|---------|--------------|---------------------|
| FRESH | L0, L1, L2, L3, L4 | ~2500 tokens |
| MODERATE | L0, L1, L2, L3, L4 | ~2000 tokens |
| DEPLETED | L0, L1, L2 | ~1500 tokens |
| CRITICAL | L0, L1 | ~800 tokens |

---

## Context Block Format

The orchestrator produces a structured XML block injected into agent prompts:

```xml
<chati-context bracket="MODERATE">
  <constitution>
    Articles I-XIX governing agent behavior.
    Key: Self-validation required. Loop until quality threshold.
    Guided options (1,2,3). Persistent session state.
    Two-layer handoff. Language protocol. Deviation protocol.
    Mode governance (planning/build/deploy).
    Context brackets. Memory governance. Registry governance.
  </constitution>

  <mode>planning</mode>

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
  </handoff>

  <memory bracket="MODERATE" level="metadata">
    [3 HOT memories available: auth-pattern, db-migration-gotcha, user-preference-dark-mode]
  </memory>
</chati-context>
```

---

## Bracket Detection

Context usage is estimated using prompt count and average token size:

```
contextPercent = (estimatedUsedTokens / maxContextTokens) * 100
bracket = calculateBracket(100 - contextPercent)
```

The orchestrator recalculates the bracket before each agent interaction and adjusts injection accordingly.

---

## Autonomous Context Recovery

### Level 1: Smart Continuation (default, automatic)

When context is compacted by the IDE (PreCompact event), the orchestrator continues seamlessly:

1. Capture session digest (decisions, errors, patterns)
2. Persist all HOT+WARM memories to `.chati/memories/`
3. Store continuation state in `.chati/session.yaml`
4. After compaction: bracket resets to FRESH
5. Orchestrator loads HOT memories for current agent
6. Rebuilds `<chati-context>` with FRESH bracket
7. Agent resumes exactly where it left off

The user experiences zero interruption.

### Level 2: Autonomous Session Spawn (fallback)

If Smart Continuation is insufficient, the orchestrator spawns a new session:

1. Generate comprehensive continuation prompt with full pipeline state
2. Persist to `.chati/continuation/latest.md`
3. Spawn new session via IDE-specific mechanism

### Spawn Decision Criteria

| Condition | Threshold | Rationale |
|-----------|-----------|-----------|
| Multiple compactions | 3+ in single session | Context is churning too fast |
| Post-compact quality | Agent score drops >15% | Compaction lost critical context |
| Critical bracket persists | CRITICAL for 3+ consecutive interactions | Recovery not working |
| Agent handoff pending | Current agent done, next agent needs fresh context | Clean start is better |

### IDE-Specific Behavior

| IDE | Level 1 | Level 2 |
|-----|---------|---------|
| Claude Code | Automatic via PreCompact hook | Task tool subagent or CLI spawn |
| AntiGravity | Automatic via platform hooks | New agent session via platform API |
| Cursor / VS Code / GitHub Copilot | Automatic via context detection | Continuation file for manual resume |
| Gemini CLI | Automatic via context detection | CLI spawn |

---

## Integration with Memory Layer

| Bracket | Memory Level | Behavior |
|---------|-------------|----------|
| FRESH | None | Context is sufficient — no memory injection |
| MODERATE | L1 Metadata | Light reminder of relevant memories (~50 tokens) |
| DEPLETED | L2 Chunks | Context recovery via memory summaries (~200 tokens) |
| CRITICAL | L3 Full | Full memory dump for session handoff (~1000+ tokens) |

---

## Constitution Reference

**Article XII: Context Bracket Governance** — Brackets are calculated automatically. In CRITICAL, only L0+L1 are injected. Handoff is mandatory when context < 15%.

---

*Context Engine v1.0 — Chati.dev Intelligence Layer*

---

## Multi-CLI Context Strategy (v3.0.0)

When agents execute on different CLI providers, context injection adapts to the provider's capabilities:

### Hook-Based Providers (Claude Code, Gemini CLI, Copilot CLI)
- PRISM context injected via `UserPromptSubmit` hook
- Mode governance enforced via `PreToolUse` hook
- Constitution guard enforced via `PreToolUse` hook
- Full governance parity with Claude Code

### Prompt-Based Providers (Codex CLI)
- PRISM context embedded directly in the spawned prompt (via prompt-builder)
- Governance directives included as system instructions in the prompt
- Softer enforcement — relies on model compliance rather than hook interception
- Write scope restrictions communicated via prompt, not blocked at tool level

### Context File Mapping
| Provider | Context File | Generation |
|----------|-------------|------------|
| Claude Code | CLAUDE.md | Native (already exists) |
| Gemini CLI | GEMINI.md | Auto-generated from CLAUDE.md |
| Codex CLI | AGENTS.md | Auto-generated from CLAUDE.md |
| Copilot CLI | All three | Reads CLAUDE.md, GEMINI.md, AGENTS.md natively |

### Cross-Provider Handoff
Handoff format is identical regardless of which provider executed the agent. The two-layer structure (Article VIII) ensures any provider can read any handoff. Session state in `.chati/session.yaml` is the single source of truth — all providers read from and write to the same session file.
