---
id: orchestrator-mode-switch
agent: orchestrator
trigger: orchestrator-internal
phase: all
requires_input: false
parallelizable: false
outputs: [mode-transition]
handoff_to: null
autonomous_gate: true
criteria:
  - Transition conditions validated
  - Article XI rules enforced
  - Session mode updated
  - New scope applied
---

# Orchestrator Mode Switch Task

## Purpose
Execute transitions between modes (planning, build, deploy) while enforcing Article XI governance rules and validating quality gates.

## Prerequisites
- Session state at `.chati/session.yaml`
- Constitution Article XI at `chati.dev/constitution.md`
- Quality scores from QA agents
- Agent completion statuses

## Steps

### 1. Receive Transition Trigger
Identify the transition request:
- **Autonomous**: Quality gate met, auto-transition enabled
- **Suggested**: Conditions met, awaiting user confirmation
- **Manual**: User explicitly requests mode change
- **Backward**: QA-Implementation found spec issues, reverting to planning

### 2. Load Current Mode State
Read session to understand current position:
- Current mode (planning/build/deploy)
- Last completed agent in current mode
- Quality scores
- Mode transition history

### 3. Validate Transition Direction
Check if transition is valid per Article XI:
- **Forward transitions**: planning → build, build → validate, validate → deploy
- **Backward transitions**: build/validate → planning (on spec issues)
- **Invalid**: deploy → build, build → planning (except on QA failure)

### 4. Check Transition Preconditions
Verify mode-specific requirements are met:

**For planning → build**:
- QA-Planning agent completed
- QA-Planning score >= 95%
- All DISCOVER/PLAN agents complete or skipped
- No blocking issues

**For build → validate**:
- Dev agent completed
- All build outputs present
- No critical errors

**For validate → deploy**:
- QA-Implementation agent completed
- QA-Implementation approved (score >= 8.0)
- No deployment blockers

**For backward to planning**:
- QA-Implementation found spec/architecture issues
- Issues documented in handoff
- User confirmation obtained (if manual)

### 5. Evaluate Autonomous Gate
Check if transition should be automatic:
- Article XI specifies autonomous transitions for forward moves when gates met
- Backward transitions require user confirmation
- Manual overrides require deviation protocol

### 6. Calculate Confidence Score
Assess readiness for transition:
- Quality scores from QA agents
- Completeness of artifacts
- Number of open questions
- Blocker status
- Return confidence: high (>90%), medium (70-90%), low (<70%)

### 6.5. User Preview Gate (BUILD → DEPLOY only)
When transitioning from BUILD to DEPLOY, the pipeline returns `nextAction: 'user_preview'` instead of advancing automatically. The orchestrator must:
1. Execute `orchestrator-preview` task to launch a local dev server
2. Collect user feedback (approve/adjust/rethink)
3. Only proceed to DEPLOY after user explicitly approves
4. Server lifecycle is user-controlled (never killed implicitly)

See `orchestrator-preview.md` for the full preview flow.

This step is skipped for transitions that don't involve BUILD → DEPLOY (e.g., PLAN → BUILD proceeds normally).

### 7. Execute or Suggest Transition
Based on autonomous_gate and confidence:
- **Auto-transition**: confidence high + autonomous enabled → execute
- **Suggest**: confidence medium OR manual trigger → ask user
- **Block**: confidence low → escalate with issues

### 8. Update Session Mode
If transition approved:
- Change `mode` field in session.yaml
- Set `current_agent` to first agent of new mode
- Log transition in `mode_transitions` array
- Update `pipeline_position`

### 9. Apply Mode Scope Restrictions
Enforce Article XI scope rules for new mode:
- **planning**: Read all, write only to `chati.dev/` directory
- **build**: Full filesystem access
- **deploy**: Full access + infrastructure operations

### 10. Dispatch to Next Agent
Route to first agent of new mode:
- **build mode**: Route to `dev` agent
- **deploy mode**: Route to `devops` agent
- **planning mode** (backward): Route to agent that needs rework

## Decision Points

### When Quality Gate is Borderline
If QA score is 94% (just under 95% threshold):
1. Check if issues are minor vs. critical
2. For minor: Suggest override with warning
3. For critical: Block transition, require rework

### When User Requests Override
If user wants to force transition despite low confidence:
1. Trigger deviation protocol
2. Document override in audit trail
3. Require explicit confirmation
4. Proceed with warning flags

### When Backward Transition is Needed
If QA-Implementation finds fundamental spec problems:
1. Identify which DISCOVER/PLAN agent needs to re-run
2. Mark affected agents as `needs_revalidation`
3. Set mode to `planning`
4. Route to earliest affected agent

### When Multiple Transitions are Eligible
If conditions for multiple transitions are met (edge case):
1. Follow pipeline sequence (planning → build → deploy)
2. Execute one transition at a time
3. Re-evaluate after each transition

## Error Handling

### Invalid Transition Request
If transition violates Article XI:
- Block the transition
- Explain the violation
- Show valid transitions from current state

### Quality Gate Data Missing
If QA score is not available:
- Assume gate not met
- Block autonomous transition
- Suggest running QA agent first

### Session Update Failure
If mode can't be written to session:
- Retry with backup creation
- If persistent: Escalate, don't proceed
- Risk of mode desync is high

### Agent Routing Failure
If first agent of new mode can't be loaded:
- Rollback mode change
- Escalate with agent definition error
- Validate framework integrity

### Concurrent Transition Attempt
If another process is changing mode:
- Wait for lock (up to 30 seconds)
- If timeout: Escalate with lock conflict
- Suggest retry

## Output Format

```yaml
mode_transition:
  timestamp: "2026-02-13T15:45:00Z"
  transition_id: "MT-001"
  type: "autonomous"  # or "suggested", "manual", "backward"

  from_state:
    mode: "planning"
    current_agent: "qa-planning"
    pipeline_position: "PLAN/qa-planning"

  to_state:
    mode: "build"
    current_agent: "dev"
    pipeline_position: "BUILD/dev"

  trigger:
    source: "qa-planning-completion"
    condition: "QA-Planning score >= 95%"
    autonomous_gate: true

  validation:
    transition_direction: "forward"  # planning → build
    preconditions_met: true
    quality_gate:
      required_score: 95
      actual_score: 97.5
      passed: true
    artifacts_complete: true
    blockers: []

  confidence:
    score: 95
    level: "high"
    factors:
      - "All DISCOVER/PLAN agents completed"
      - "QA-Planning score excellent (97.5%)"
      - "Only 2 minor open questions"
      - "No blockers"

  execution:
    approved_by: "autonomous"  # or "user"
    approved_at: "2026-02-13T15:45:00Z"
    session_updated: true
    mode_changed: true
    agent_routed: true

  scope_enforcement:
    previous_scope: "read-all, write chati.dev/ only"
    new_scope: "full filesystem access"
    restrictions_applied: true

  routing:
    next_agent: "dev"
    context_package:
      - ".chati/artifacts/handoffs/2026-02-13-qa-planning.md"
      - ".chati/artifacts/planning/phases.yaml"
      - ".chati/artifacts/planning/tasks.yaml"

  session_updates:
    mode: "build"
    current_agent: "dev"
    pipeline_position: "BUILD/dev"
    mode_transitions:
      - type: "autonomous-forward"
        from: "planning"
        to: "build"
        timestamp: "2026-02-13T15:45:00Z"
        trigger: "qa-planning-score-97.5"
        approved_by: "autonomous"

  audit_trail:
    article_xi_compliance: true
    quality_gate_met: true
    user_confirmation: false  # not required for autonomous
    deviation_protocol: false

  user_notification: |
    ✓ Mode Transition: PLAN → BUILD

    QA-Planning completed with score 97.5% (>= 95% required).
    Autonomous transition to BUILD mode approved.

    Next: Dev agent will begin implementation.

    Scope updated: Full filesystem access now enabled.
```
