# /chati — Thin Router

Read and execute the full orchestrator at `chati.dev/orchestrator/chati.md`.

Pass through all context: session state, handoffs, artifacts, and user input.

This file contains no logic — it is a pure delegation to the orchestrator.

---

**Load:** `chati.dev/orchestrator/chati.md`

**Context to pass:**
- `.chati/session.yaml` (session state)
- `CLAUDE.md` (project context)
- `chati.dev/artifacts/handoffs/` (latest handoff)
- `chati.dev/config.yaml` (version info)

**User input:** $ARGUMENTS
