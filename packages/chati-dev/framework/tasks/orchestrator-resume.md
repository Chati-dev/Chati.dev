---
id: orchestrator-resume
agent: orchestrator
trigger: session-start
phase: all
requires_input: false
parallelizable: false
outputs: [session-state]
handoff_to: null
autonomous_gate: true
criteria:
  - Session state successfully loaded
  - Pipeline position determined
  - Context restored
---

# Orchestrator Resume Task

## Purpose
Restore session context from previous work, determine pipeline position, and prepare to continue.

## Prerequisites
- Session file exists at `.chati/session.yaml`
- Handoff artifacts in `.chati/artifacts/handoffs/`
- Constitution at `chati.dev/constitution.md`
- Project configuration at `chati.dev/config.yaml`

## Steps

### 1. Locate Session File
Check for existing session at `.chati/session.yaml`:
- If found: Load and validate
- If not found: This is a new session, initialize instead
- If corrupted: Attempt recovery from handoffs

### 2. Load Session State
Parse the YAML session file and extract:
- Project metadata (name, type, language)
- Current mode (planning/build/deploy)
- Pipeline position (phase, last agent)
- Agent statuses and timestamps
- Decisions log
- Mode transitions history

### 3. Identify Last Completed Agent
Find the most recent agent with `status: completed`:
- Check agent completion timestamp
- Verify handoff document exists
- Validate output artifacts

### 4. Determine Next Agent
Based on pipeline position and last completed agent:
- **DISCOVER → PLAN pipeline**: greenfield-wu → brief → detail → architect → ux → phases → tasks → qa-planning
- **BUILD pipeline**: dev → qa-implementation
- **DEPLOY pipeline**: devops
- Handle special cases (skipped, needs_revalidation)

### 5. Load Latest Handoff
Retrieve the most recent handoff document:
- Path: `.chati/artifacts/handoffs/{date}-{agent}.md`
- Parse frontmatter for metadata
- Extract key decisions and outputs
- Identify open questions or blockers

### 6. Restore Work Context
Rebuild the working context from session + handoff:
- Project decisions made so far
- Artifacts created
- Quality scores
- Pending tasks
- Known blockers

### 7. Check Mode Transition Conditions
Evaluate if mode transition should occur:
- **planning → build**: QA-Planning score >= 95%
- **build → validate**: Dev agent completed
- **validate → deploy**: QA-Implementation approved
- Check autonomous_gate flag

### 8. Validate Pipeline Continuity
Ensure the pipeline can continue from current position:
- Required artifacts exist
- No blocking errors
- Prerequisites for next agent met
- Mode constraints respected

### 9. Prepare Resumption Report
Build a summary for the user:
- Where they left off
- What was accomplished
- What comes next
- Any decisions needed

### 10. Initialize Next Action
Based on pipeline position:
- If next agent is clear: Route to that agent
- If decision needed: Present options to user
- If mode transition: Trigger mode-switch task
- If blocked: Escalate with context

## Decision Points

### When Multiple Agents Show Incomplete
If several agents are in `in_progress` state:
1. Use timestamps to find the most recent
2. Check for handoff (indicates pseudo-completion)
3. Default to earliest incomplete agent in sequence

### When Session is Stale
If session timestamp is very old (e.g., >30 days):
1. Warn user about staleness
2. Validate that config/constitution haven't changed
3. Suggest re-running validation agents

### When Handoff is Missing
If last agent is complete but handoff is absent:
1. Check for artifacts in other locations
2. Attempt to reconstruct from session decisions log
3. If unrecoverable, suggest re-running that agent

## Error Handling

### Session File Not Found
If `.chati/session.yaml` doesn't exist:
- Check if this is initial installation
- Look for backup in `.chati/backups/`
- Offer to initialize new session

### Session File Corrupted
If YAML parsing fails:
- Try JSON parse (in case of format change)
- Load most recent backup
- Escalate to user with corruption details

### Handoff Chain Broken
If handoff sequence has gaps:
- Identify missing handoffs
- Check if agents were skipped intentionally
- Reconstruct from session decisions where possible

### Mode Conflict
If session mode conflicts with agent statuses:
- Flag inconsistency
- Use agent statuses as source of truth
- Recalculate mode from pipeline position

### Next Agent Cannot Be Determined
If pipeline position is ambiguous:
- Default to orchestrator status report
- Present pipeline visualization to user
- Ask user to specify next step

## Output Format

```yaml
session_state:
  loaded_at: "2026-02-13T10:30:00Z"
  session_file: ".chati/session.yaml"
  session_age_hours: 8
  project:
    name: "HealthCare Portal"
    type: "brownfield"
    language: "Portugues"
  current_mode: "planning"
  pipeline_position:
    phase: "DISCOVER"
    last_completed_agent: "detail"
    next_agent: "architect"
    completion_percentage: 30
  last_handoff:
    agent: "detail"
    timestamp: "2026-02-13T02:15:00Z"
    file: ".chati/artifacts/handoffs/2026-02-13-detail.md"
    key_outputs:
      - "Functional requirements document"
      - "12 requirements identified"
      - "3 external integrations mapped"
  context_summary:
    decisions_made: 8
    artifacts_created: 3
    open_questions: 2
    blockers: 0
  mode_transition_check:
    eligible: false
    reason: "QA-Planning not yet complete"
    next_gate: "planning → build at QA-Planning >= 95%"
  resumption_action: "route-to-architect"
  user_message: "Welcome back! You completed Detail agent. Next: Architect will design the system architecture."
```
