# Decision Engine — Entity Tracking & Reuse Optimization

## Purpose

The Decision Engine provides a centralized catalog of all system artifacts (the Entity Registry) and a formal decision algorithm for brownfield analysis. When the Brownfield WU agent discovers existing patterns, the Decision Engine determines whether to REUSE, ADAPT, or CREATE.

---

## Entity Registry

The registry catalogs every artifact in the system:

**Location**: `chati.dev/data/entity-registry.yaml`

```yaml
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
      purpose: "Route user requests to correct agent, manage session state"
      keywords: [routing, session, deviation, handoff]
      dependencies: [constitution, session-schema, config]
      adaptability: 0.2
  # ... (all 48 entities)
```

### Entity Fields

| Field | Type | Purpose |
|-------|------|---------|
| `path` | string | Relative file path from project root |
| `type` | enum | agent, template, workflow, schema, governance, intelligence, framework |
| `purpose` | string | One-line description of what this entity does |
| `keywords` | array | Searchable terms for similarity matching |
| `dependencies` | array | Other entities this one requires |
| `adaptability` | float | 0.0 (rigid) to 1.0 (flexible) — how much this can be adapted |
| `checksum` | string | SHA-256 hash for integrity verification |

---

## Decision Algorithm

When Brownfield WU encounters existing patterns, the engine scores similarity:

```
similarity = (keyword_overlap * 0.6) + (purpose_similarity * 0.4)
```

Where:
- `keyword_overlap`: TF-IDF cosine similarity between entity keywords and discovered pattern
- `purpose_similarity`: Semantic match between entity purpose and discovered need

### Decision Thresholds

| Similarity Score | Decision | Action |
|-----------------|---------|------|
| >= 90% | **REUSE** | Use existing artifact as-is |
| 60-89% | **ADAPT** | Modify existing artifact for current needs |
| < 60% | **CREATE** | Create new artifact from scratch |

### Decision Preference Order

**REUSE > ADAPT > CREATE** — The system always prefers reusing existing artifacts over creating new ones. This reduces duplication and maintains consistency.

---

## Adaptability Scoring

Each entity has an adaptability score (0.0-1.0) indicating how flexible it is:

| Score Range | Meaning | Examples |
|-------------|---------|----------|
| 0.0-0.2 | Rigid — should not be modified | Constitution, orchestrator, quality gates |
| 0.3-0.5 | Moderate — can be customized with care | Agents, templates, workflows |
| 0.6-1.0 | Flexible — designed to be adapted | Templates, data files |

When ADAPT is the decision, the adaptability score determines how much modification is acceptable.

---

## Health Check

The registry supports system integrity validation:

```
npx chati-dev health
```

Checks:
1. All registered entities exist on disk
2. Schema files are valid JSON
3. Constitution has >= 16 articles
4. Agents contain required protocol references
5. Entity count matches actual file count
6. Checksums match (if calculated)

**Health check is advisory** — it reports issues but never blocks operations.

---

## Integration with Brownfield WU

When the Brownfield WU agent analyzes an existing codebase:

1. Discovery: Agent scans codebase for patterns, architecture, dependencies
2. Matching: Each discovered pattern is scored against entity registry
3. Decision: REUSE/ADAPT/CREATE recommendation per pattern
4. Report: Decision matrix included in WU artifact

Example output:
```
| Discovered Pattern | Best Match | Similarity | Decision |
|-------------------|------------|-----------|----------|
| JWT auth middleware | auth-pattern (P001) | 92% | REUSE |
| Custom ORM layer | data-access template | 71% | ADAPT |
| Novel caching strategy | (none) | 34% | CREATE |
```

---

## Constitution Reference

**Article XIV: Framework Registry Governance** — Registry is the source of truth for artifacts. Health check is advisory (never blocks). REUSE > ADAPT > CREATE preference.

---

*Decision Engine v1.0 — chati.dev Intelligence Layer*
