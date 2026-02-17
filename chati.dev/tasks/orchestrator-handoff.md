---
id: orchestrator-handoff
agent: orchestrator
trigger: agent-completion
phase: all
requires_input: false
parallelizable: false
outputs: [handoff-document]
handoff_to: null
autonomous_gate: true
criteria:
  - Agent output validated against criteria
  - Handoff document created
  - Session state updated
  - Next agent determined
---

# Orchestrator Handoff Task

## Purpose
Receive output from a completed agent, validate it, create a handoff document, update session state, and route to the next agent.

## Prerequisites
- Agent has signaled completion
- Agent output available
- Session file at `.chati/session.yaml`
- Handoff directory at `.chati/artifacts/handoffs/`
- Agent definition with success criteria

## Steps

### 1. Receive Agent Output
Collect the completion signal from the agent:
- Agent name and completion timestamp
- Output artifacts (files, data structures)
- Decisions made during execution
- Quality self-assessment
- Open questions or blockers

### 2. Load Agent Definition
Read the agent's YAML definition to get:
- Success criteria (acceptance conditions)
- Expected outputs
- Quality thresholds
- Next agent in sequence

### 3. Validate Against Criteria
Check agent output against defined criteria:
- All required outputs present
- Quality score meets threshold (if applicable)
- Acceptance conditions satisfied
- No critical blockers

### 4. Build Handoff Document
Create structured handoff in markdown with YAML frontmatter:
- Metadata: agent, timestamp, status, quality_score
- Summary: What was accomplished
- Outputs: List of artifacts with paths
- Decisions: Key choices made
- Open Questions: Unresolved items
- Recommendations: Guidance for next agent

### 5. Save Handoff Artifact
Write handoff to file system:
- Path: `.chati/artifacts/handoffs/{YYYY-MM-DD}-{agent}.md`
- Ensure directory exists
- Validate write success
- Set appropriate permissions

### 6. Update Session State
Modify `.chati/session.yaml`:
- Set agent status to `completed`
- Add completion timestamp
- Increment pipeline progress
- Log decision made during this agent
- Update `last_activity` timestamp

### 7. Determine Next Agent
Based on pipeline position and mode:
- **DISCOVER → PLAN**: Follow sequence (wu → brief → detail → architect → ux → phases → tasks → qa-planning)
- **BUILD**: dev → qa-implementation
- **DEPLOY**: devops
- Handle special transitions (e.g., qa-planning → dev requires mode switch)

### 8. Check Quality Gates
Evaluate if mode transition should occur:
- **After QA-Planning**: If score >= 95%, eligible for planning → build
- **After Dev**: If complete, eligible for build → validate
- **After QA-Implementation**: If approved, eligible for validate → deploy

### 9. Prepare Next Agent Context
Package context for the next agent:
- Current handoff document
- Relevant previous handoffs
- Session state excerpt
- Project configuration

### 10. Dispatch Next Action
Execute the routing decision:
- If next agent in same mode: Route directly
- If mode transition needed: Trigger `orchestrator-mode-switch`
- If validation needed: Trigger `orchestrator-escalate`
- If end of pipeline: Mark project complete

## Decision Points

### When Validation Fails
If agent output doesn't meet criteria:
1. Assess severity (minor vs. critical)
2. For minor: Document in handoff, proceed with warning
3. For critical: Set agent to `needs_revalidation`, escalate to user

### When Quality Score is Below Threshold
If agent self-assessment is low:
1. Check if this is a QA agent (requires >= 95%)
2. For QA agents: Block mode transition, require rework
3. For other agents: Note in handoff, continue with caution

### When Next Agent is Ambiguous
If pipeline branching or user choice is needed:
1. Pause automatic routing
2. Escalate to user with options
3. Wait for explicit direction

### When Open Questions Exist
If agent has unresolved questions:
1. Categorize: blocking vs. non-blocking
2. For blocking: Escalate immediately
3. For non-blocking: Include in handoff, continue

## Error Handling

### Agent Output Missing
If expected artifacts are not present:
- Attempt to locate in alternate paths
- Check if agent logged failure
- Escalate with missing artifact list

### Handoff Write Failure
If handoff document can't be saved:
- Try alternate location (`.chati/backups/handoffs/`)
- Log to session decisions as fallback
- Escalate with write error details

### Session Update Failure
If `.chati/session.yaml` update fails:
- Retry with backup creation
- If persistent: Continue with in-memory state
- Warn user about state persistence issue

### Circular Routing Detected
If next agent would create a loop:
- Block the routing
- Escalate with loop details
- Request user intervention

### Mode Transition Blocked
If quality gate fails for mode transition:
- Document the failure reason
- Set agent to `needs_revalidation`
- Notify user of required rework

## Output Format

```yaml
handoff_document:
  metadata:
    agent: "detail"
    timestamp: "2026-02-13T02:15:00Z"
    status: "completed"
    quality_score: 8.5
    duration_minutes: 45
    mode: "planning"
    phase: "DISCOVER"

  summary: |
    Completed detailed requirements analysis for HealthCare Portal.
    Identified 12 user stories across 4 modules (Authentication, Patient Records,
    Appointments, Billing). Mapped 3 external integrations (Payment Gateway,
    Insurance API, Lab Results). Defined data model with 8 core entities.

  outputs:
    - path: ".chati/artifacts/requirements/functional-requirements.md"
      type: "document"
      description: "Complete functional requirements with use cases"
      size_kb: 45
    - path: ".chati/artifacts/requirements/user-stories.yaml"
      type: "structured-data"
      description: "12 user stories with acceptance criteria"
      size_kb: 8
    - path: ".chati/artifacts/requirements/integrations.yaml"
      type: "structured-data"
      description: "External integration specifications"
      size_kb: 12

  decisions:
    - id: "D-008"
      decision: "Use OAuth2 + RBAC for authentication"
      rationale: "HIPAA compliance requires audit trails and role-based access"
      alternatives_considered: ["Basic Auth", "API Keys"]
    - id: "D-009"
      decision: "PostgreSQL for primary database"
      rationale: "Strong ACID compliance, JSON support for flexible fields"
      alternatives_considered: ["MySQL", "MongoDB"]

  open_questions:
    - id: "Q-003"
      question: "Should patient portal be mobile-first or desktop-first?"
      blocking: false
      context: "Affects UX design priorities"
    - id: "Q-004"
      question: "Maximum file size for document uploads?"
      blocking: false
      context: "Impacts storage infrastructure sizing"

  recommendations:
    - "Architect should prioritize HIPAA compliance in system design"
    - "Consider microservices for Billing module (complex integrations)"
    - "UX should validate mobile experience with healthcare workers"

  next_agent: "architect"

  validation:
    criteria_met: true
    all_outputs_present: true
    quality_threshold_met: true  # 8.5 >= 7.0
    blockers: []

  session_update:
    agent_status: "completed"
    pipeline_progress: 37.5  # 3 of 8 DISCOVER/PLAN agents done
    mode_transition_check:
      eligible: false
      reason: "QA-Planning not yet complete"

  routing_decision:
    next_action: "route-to-architect"
    mode: "planning"
    context_package:
      - ".chati/artifacts/handoffs/2026-02-13-detail.md"
      - ".chati/artifacts/handoffs/2026-02-12-brief.md"
      - ".chati/artifacts/requirements/"
```
