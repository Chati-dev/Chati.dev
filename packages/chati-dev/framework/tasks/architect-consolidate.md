---
id: architect-consolidate
agent: architect
trigger: architect-security-review
phase: plan
requires_input: false
parallelizable: false
outputs: [architecture-final.yaml]
handoff_to: phases
autonomous_gate: true
criteria:
  - All architecture artifacts consolidated
  - Architecture Decision Records documented
  - Complete architecture package ready
---
# Consolidate Architecture Documentation

## Purpose
Merge all architecture artifacts into final comprehensive architecture document.

## Steps
Combine: architecture.yaml, stack-selection.yaml, api-design.yaml, db-design.yaml, security-review.yaml

Add:
- System architecture diagram
- Deployment architecture
- ADRs for major decisions

## Output Format
```yaml
# architecture-final.yaml
timestamp: 2026-02-13T16:30:00Z
completeness: 100%
[All architecture details consolidated]
architecture_decisions:
  - id: ADR-001
    title: Use Supabase as Backend-as-a-Service
    decision: Use Supabase instead of custom Node.js backend
    rationale: Team lacks backend expertise, Supabase provides auth, database, storage
    status: accepted
  - id: ADR-002
    title: Use TanStack Query for server state
    decision: Use TanStack Query instead of Redux
    rationale: Server state caching, automatic refetching, simpler than Redux
    status: accepted
next_phase: phases
```
