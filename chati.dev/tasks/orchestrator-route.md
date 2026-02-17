---
id: orchestrator-route
agent: orchestrator
trigger: user-input
phase: all
requires_input: true
parallelizable: false
outputs: [routing-decision]
handoff_to: null
autonomous_gate: true
criteria:
  - User intent correctly classified
  - Target agent identified
  - Pipeline position validated
---

# Orchestrator Route Task

## Purpose
Analyze user input, classify intent, determine pipeline position, and route to the appropriate agent.

## Prerequisites
- Session state loaded from `.chati/session.yaml`
- Constitution available at `chati.dev/constitution.md`
- Agent definitions in `chati.dev/agents/`
- User input captured

## Steps

### 1. Parse User Input
Extract the core intent from user message. Identify:
- Explicit commands (e.g., `/chati status`, `/chati resume`)
- Implicit requests (e.g., "I need a login feature")
- Context changes (e.g., "actually, let's change the database")

### 2. Load Session Context
Read `.chati/session.yaml` to understand:
- Current mode (planning/build/deploy)
- Last completed agent
- Pipeline position
- Active phase
- Project configuration

### 3. Classify Intent Category
Determine the request type:
- **Pipeline**: Next agent in sequence
- **Status**: Information request
- **Deviation**: Change to plan/scope
- **Health**: Framework validation
- **Escalation**: Error/blocker handling

### 4. Validate Pipeline Position
Check if the requested action is valid for current position:
- Mode restrictions (Article XI)
- Agent prerequisites met
- Required artifacts exist
- Quality gates passed

### 5. Select Target Agent
Based on intent and position, identify the appropriate agent:
- **DISCOVER agents**: greenfield-wu, brownfield-wu, brief, detail
- **PLAN agents**: architect, ux, phases, tasks, qa-planning
- **BUILD agents**: dev, qa-implementation
- **DEPLOY agents**: devops
- **Orchestrator actions**: status, health, deviation

### 6. Check Agent Availability
Verify the target agent:
- Definition file exists in `chati.dev/agents/{agent}.yaml`
- Required MCPs are available
- Agent has not already completed (unless revalidation)

### 7. Prepare Routing Context
Build the context package for the target agent:
- Previous handoff document (if exists)
- Session state excerpt
- User input
- Pipeline metadata

### 8. Validate Routing Decision
Confirm the routing is correct:
- Agent matches pipeline position
- Mode boundaries respected
- No circular routing
- Quality gates satisfied

### 9. Execute Routing Decision
Dispatch to the selected destination:
- For agents: Load agent definition and prepare handoff
- For orchestrator actions: Execute internal task (status, health, etc.)
- For deviations: Trigger deviation protocol

### 10. Log Routing Action
Update session state with routing information:
- Timestamp
- Source (user input)
- Target (agent/action)
- Reasoning

## Decision Points

### When Intent is Ambiguous
If user input could map to multiple agents:
1. Check pipeline position first (sequential bias)
2. Ask clarifying question
3. Default to next agent in sequence

### When Mode Transition is Triggered
If routing would cross mode boundaries:
1. Check autonomous gate conditions
2. If met: auto-transition via `orchestrator-mode-switch`
3. If not met: escalate to user for confirmation

### When Agent Already Completed
If target agent shows `completed` status:
1. Check if revalidation is needed
2. Determine if this is a deviation (scope change)
3. Route to deviation handler if appropriate

## Error Handling

### Invalid Agent Request
If user requests an agent that doesn't exist or is inaccessible:
- Escalate with clear error message
- Suggest valid alternatives
- Provide pipeline visualization

### Mode Violation
If routing would violate Article XI restrictions:
- Block the routing
- Explain mode constraints
- Offer deviation protocol as alternative

### Missing Prerequisites
If target agent's prerequisites are not met:
- Identify missing artifacts
- Suggest remediation steps
- Route to prerequisite agent first

### Session Corruption
If session state is invalid or corrupted:
- Attempt recovery from handoffs
- Escalate to user
- Offer framework re-initialization

## Output Format

```yaml
routing_decision:
  timestamp: "2026-02-13T10:30:00Z"
  source: "user-input"
  intent_classification: "pipeline-next"
  target_type: "agent"  # or "orchestrator-action"
  target: "detail"
  reason: "User completed brief, detail is next in DISCOVER pipeline"
  mode: "planning"
  pipeline_position: "DISCOVER/detail"
  context_package:
    previous_agent: "brief"
    handoff_file: ".chati/artifacts/handoffs/2026-02-13-brief.md"
    session_excerpt:
      mode: "planning"
      project_type: "greenfield"
      current_phase: "DISCOVER"
  validation:
    mode_check: "passed"
    prerequisites_check: "passed"
    quality_gates: "passed"
  next_action: "load-agent-definition"
```
