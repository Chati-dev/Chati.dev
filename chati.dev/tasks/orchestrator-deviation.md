---
id: orchestrator-deviation
agent: orchestrator
trigger: user-input
phase: all
requires_input: true
parallelizable: false
outputs: [deviation-plan]
handoff_to: null
autonomous_gate: false
criteria:
  - Deviation type correctly identified
  - Impact assessed
  - User confirmation obtained
  - Plan updated
---

# Orchestrator Deviation Task

## Purpose
Handle changes to project scope, priorities, or approach that deviate from the current plan. Evaluate impact, propose alternatives, and re-route the pipeline.

## Prerequisites
- Session state at `.chati/session.yaml`
- Current plan in artifacts (brief, requirements, phases, etc.)
- Constitution at `chati.dev/constitution.md`
- User input describing the change

## Steps

### 1. Capture Deviation Request
Parse user input to understand the change:
- What aspect of the project is changing (scope, tech stack, priorities, timeline)
- Why the change is needed
- Urgency level (immediate vs. planned)
- Scope of impact (isolated vs. systemic)

### 2. Classify Deviation Type
Categorize the deviation:
- **Scope Change**: Adding/removing features, changing requirements
- **Priority Change**: Re-ordering tasks, changing phase focus
- **Technical Change**: Different tech stack, architecture, approach
- **Rollback**: Undoing previous decisions, reverting to earlier state
- **Process Change**: Skipping agents, jumping pipeline position

### 3. Load Affected Artifacts
Identify which artifacts are impacted:
- Brief document (for scope changes)
- Requirements (for functional changes)
- Architecture (for technical changes)
- Phases/Tasks (for priority changes)
- Quality assessments (for rollbacks)

### 4. Assess Impact Scope
Evaluate the ripple effects:
- **Localized**: Change affects only current/next agent
- **Phase-wide**: Change affects current phase (e.g., all of DISCOVER or PLAN)
- **Mode-wide**: Change affects entire mode (e.g., planning → build transition)
- **Global**: Change affects entire project plan

### 5. Determine Required Rework
Identify which agents need to re-execute:
- Agents whose outputs are now invalid
- Agents whose inputs have changed
- Quality gates that need re-validation
- Handoffs that need updating

### 6. Calculate Cost Estimate
Estimate the deviation cost:
- Time: Hours or days of rework
- Complexity: Number of agents affected
- Risk: Potential quality impact
- Artifacts: Number of documents to update

### 7. Propose Alternatives
Present options to the user:
- **Option A**: Full re-planning (restart from affected agent)
- **Option B**: Incremental update (patch current plan)
- **Option C**: Fork approach (parallel track for new scope)
- **Option D**: Defer change (schedule for next iteration)

### 8. Get User Confirmation
Present the analysis and await explicit approval:
- Show impact summary
- Display cost estimate
- List alternatives
- Require explicit choice

### 9. Execute Deviation Plan
Based on user selection:
- Update session state with deviation record
- Mark affected agents as `needs_revalidation`
- Update artifact files with change tracking
- Log deviation in decisions log

### 10. Re-route Pipeline
Adjust the pipeline flow:
- Set new `current_agent` if jumping position
- Update phase if changing mode
- Trigger affected agents in sequence
- Update progress calculations

## Decision Points

### When Deviation is Minor
If impact is localized and low-cost:
1. Suggest incremental update (Option B)
2. Fast-track approval process
3. Apply change immediately

### When Deviation is Major
If impact is global or high-cost:
1. Strongly recommend full re-planning (Option A)
2. Highlight risks of partial updates
3. Suggest deferring if possible

### When Deviation Conflicts with Mode
If change would violate mode restrictions (Article XI):
1. Explain the mode constraint
2. Offer mode switch as part of deviation
3. Require explicit override confirmation

### When Deviation is Ambiguous
If user's intent is unclear:
1. Ask clarifying questions
2. Present examples of similar changes
3. Confirm understanding before proceeding

## Error Handling

### Invalid Deviation Request
If requested change is not feasible:
- Explain technical/process constraints
- Suggest achievable alternatives
- Offer escalation path

### Conflicting Deviations
If new deviation conflicts with previous ones:
- Show the conflict clearly
- Require resolution of old deviation first
- Offer to consolidate deviations

### Session Lock During Deviation
If another process is modifying session:
- Wait for lock release (up to 30 seconds)
- If timeout: Escalate with lock holder info
- Suggest retry

### Artifact Update Failure
If deviation updates can't be saved:
- Preserve original artifacts
- Log deviation in-memory only
- Escalate with write error details

### User Abandons Deviation
If user cancels mid-process:
- Rollback any partial changes
- Restore session to pre-deviation state
- Log cancellation for audit

## Output Format

```yaml
deviation_plan:
  timestamp: "2026-02-13T10:30:00Z"
  initiator: "user"
  type: "scope-change"

  request:
    description: "Add real-time chat feature for patient-doctor communication"
    reason: "Client feedback from stakeholder review"
    urgency: "medium"

  impact_assessment:
    scope: "phase-wide"  # Affects multiple DISCOVER/PLAN agents
    affected_agents:
      - agent: "detail"
        status: "completed"
        action: "needs_revalidation"
        reason: "Must add chat feature to requirements"
      - agent: "architect"
        status: "not_started"
        action: "update_input"
        reason: "Must design real-time messaging architecture"
      - agent: "ux"
        status: "not_started"
        action: "update_input"
        reason: "Must design chat interface"

    affected_artifacts:
      - ".chati/artifacts/requirements/functional-requirements.md"
      - ".chati/artifacts/requirements/user-stories.yaml"

    cost_estimate:
      time_hours: 4
      complexity: "medium"
      risk_level: "low"
      artifacts_to_update: 2

  alternatives:
    - id: "A"
      approach: "Full re-validation"
      description: "Re-run Detail agent to add chat requirements, then continue"
      effort: "4 hours"
      risk: "low"
      recommended: true
    - id: "B"
      approach: "Manual patch"
      description: "Manually add chat to existing requirements, skip re-validation"
      effort: "1 hour"
      risk: "medium"
      recommended: false
    - id: "C"
      approach: "Defer to Phase 2"
      description: "Complete Phase 1 as-is, add chat in future iteration"
      effort: "0 hours now"
      risk: "low"
      recommended: false

  user_choice: "A"  # Full re-validation

  execution_plan:
    steps:
      - action: "mark-agent-revalidation"
        agent: "detail"
        status: "needs_revalidation"
      - action: "update-session-phase"
        new_current_agent: "detail"
      - action: "log-decision"
        decision: "Added real-time chat feature per client request"
      - action: "route-to-agent"
        target: "detail"
        context: "Re-validate requirements with chat feature addition"

    session_updates:
      current_agent: "detail"
      decisions:
        - id: "D-010"
          decision: "Add real-time chat feature"
          rationale: "Client feedback, critical for patient engagement"
          deviation: true
      mode_transitions:
        - type: "deviation"
          timestamp: "2026-02-13T10:30:00Z"
          from_agent: "architect"
          to_agent: "detail"
          reason: "Scope change: add chat feature"
          user_approved: true

  audit_trail:
    deviation_id: "DEV-001"
    approved_by: "user"
    approved_at: "2026-02-13T10:32:00Z"
    previous_state:
      current_agent: "architect"
      pipeline_progress: 37.5
    new_state:
      current_agent: "detail"
      pipeline_progress: 25.0  # Rolled back
```
