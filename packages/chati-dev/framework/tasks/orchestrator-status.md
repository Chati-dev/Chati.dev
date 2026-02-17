---
id: orchestrator-status
agent: orchestrator
trigger: user-input
phase: all
requires_input: false
parallelizable: false
outputs: [status-report]
handoff_to: null
autonomous_gate: true
criteria:
  - Session state accurately read
  - Agent statuses collected
  - Pipeline progress calculated
  - Report formatted correctly
---

# Orchestrator Status Task

## Purpose
Generate a comprehensive status report of the current project, showing pipeline progress, agent completion, and next steps.

## Prerequisites
- Session file at `.chati/session.yaml`
- Agent definitions in `chati.dev/agents/`
- Constitution at `chati.dev/constitution.md`
- Artifacts in `.chati/artifacts/`

## Steps

### 1. Load Session State
Read `.chati/session.yaml` to get current project state:
- Project metadata (name, type, language)
- Current mode and phase
- Agent statuses with timestamps
- Recent decisions
- Mode transition history

### 2. Collect Agent Statuses
For each agent in the pipeline, gather:
- Status: `not_started`, `in_progress`, `completed`, `skipped`, `blocked`, `needs_revalidation`
- Completion timestamp (if completed)
- Quality score (if applicable)
- Handoff document path
- Output artifacts

### 3. Calculate Pipeline Progress
Determine overall completion for each mode:
- **DISCOVER + PLAN**: 9 agents (greenfield-wu OR brownfield-wu, brief, detail, architect, ux, phases, tasks, qa-planning)
- **BUILD**: 2 agents (dev, qa-implementation)
- **DEPLOY**: 1 agent (devops)
- Calculate percentage: completed / total

### 4. Identify Current Position
Determine where the user is in the pipeline:
- Last completed agent
- Current/next agent
- Blocking issues (if any)
- Pending decisions

### 5. Check Mode Transition Eligibility
Evaluate if mode transition conditions are met:
- **planning → build**: QA-Planning score >= 95%
- **build → validate**: Dev completed
- **validate → deploy**: QA-Implementation approved
- Report eligibility status

### 6. Collect Recent Activity
Summarize the last 5-10 actions:
- Agent completions
- Decisions made
- Artifacts created
- Mode transitions
- Deviations

### 7. Identify Blockers
Check for any items preventing progress:
- Agents with `blocked` status
- Missing prerequisites
- Failed quality gates
- Unresolved escalations

### 8. Generate Next Steps
Based on current position, suggest concrete next actions:
- "Continue with {next-agent}"
- "Resolve blocker: {description}"
- "Review and approve {artifact}"
- "Answer open question: {question}"

### 9. Format TUI Report
Create text-based visualization:
- ASCII pipeline diagram with progress indicators
- Agent status table
- Recent activity log
- Next steps section
- Blocker warnings (if any)

### 10. Output Report
Present the formatted report:
- Console output for CLI invocation
- Return structured data for programmatic access
- Update `.chati/artifacts/status/latest.md`

## Decision Points

### When Multiple Blockers Exist
If several agents are blocked:
1. Prioritize by pipeline sequence (earlier first)
2. Group related blockers
3. Suggest resolution order

### When Mode is Ambiguous
If session mode doesn't align with agent progress:
1. Recalculate mode from agent statuses
2. Flag discrepancy in report
3. Suggest correction

### When Progress is Stale
If no activity in last 7+ days:
1. Note staleness in report
2. Suggest validation check
3. Offer resume guidance

## Error Handling

### Session File Missing
If `.chati/session.yaml` doesn't exist:
- Report "No active session"
- Suggest running `/chati` to initialize
- Check for backup session files

### Agent Definitions Incomplete
If some agent YAML files are missing:
- Report missing agents
- Show only available agents in status
- Suggest framework validation

### Artifact Access Failure
If handoff or artifact files can't be read:
- Mark as "unknown" in report
- Continue with available data
- Log warning for investigation

### Corrupted Session Data
If session YAML is malformed:
- Attempt partial parsing
- Report known good data
- Flag corruption clearly

## Output Format

```yaml
status_report:
  generated_at: "2026-02-13T10:30:00Z"
  project:
    name: "HealthCare Portal"
    type: "brownfield"
    language: "Portugues"
    initialized: "2026-02-10T14:00:00Z"

  current_state:
    mode: "planning"
    phase: "DISCOVER"
    last_activity: "2026-02-13T02:15:00Z"
    hours_since_activity: 8.25

  pipeline_progress:
    planning:
      total_agents: 8  # brownfield-wu counted, greenfield-wu skipped
      completed: 3
      percentage: 37.5
      agents:
        - name: "brownfield-wu"
          status: "completed"
          completed_at: "2026-02-10T15:30:00Z"
        - name: "brief"
          status: "completed"
          completed_at: "2026-02-12T18:45:00Z"
        - name: "detail"
          status: "completed"
          completed_at: "2026-02-13T02:15:00Z"
          quality_score: 8.5
        - name: "architect"
          status: "in_progress"
          started_at: "2026-02-13T02:20:00Z"
        - name: "ux"
          status: "not_started"
        - name: "phases"
          status: "not_started"
        - name: "tasks"
          status: "not_started"
        - name: "qa-planning"
          status: "not_started"
    build:
      total_agents: 2
      completed: 0
      percentage: 0
    deploy:
      total_agents: 1
      completed: 0
      percentage: 0

  overall_progress: 25  # 3 of 12 total agents

  mode_transitions:
    eligible_for_next: false
    next_transition: "planning → build"
    condition: "QA-Planning score >= 95%"
    current_score: null

  recent_activity:
    - timestamp: "2026-02-13T02:15:00Z"
      event: "agent-completed"
      agent: "detail"
      outputs: ["functional-requirements.md", "user-stories.yaml"]
    - timestamp: "2026-02-12T18:45:00Z"
      event: "agent-completed"
      agent: "brief"
      outputs: ["project-brief.md"]
    - timestamp: "2026-02-12T16:30:00Z"
      event: "decision-made"
      description: "Database: PostgreSQL 15"

  blockers: []

  next_steps:
    - action: "continue-architect"
      description: "Complete architecture design with Architect agent"
      priority: "high"
    - action: "review-detail-output"
      description: "Review functional requirements from Detail agent"
      priority: "medium"

  artifacts:
    handoffs: 3
    decisions: 8
    outputs: 5
    latest_handoff: ".chati/artifacts/handoffs/2026-02-13-detail.md"

  visual_report: |
    ╔════════════════════════════════════════════════════════════╗
    ║  chati.dev Status - HealthCare Portal                      ║
    ║  Mode: DISCOVER  |  Progress: 25% (3/12 agents)             ║
    ╚════════════════════════════════════════════════════════════╝

    DISCOVER / PLAN Pipeline (37.5%)
    ✓ brownfield-wu  ✓ brief  ✓ detail  ◐ architect  ○ ux  ○ phases  ○ tasks  ○ qa-planning

    BUILD Pipeline (0%)
    ○ dev  ○ qa-implementation

    DEPLOY Pipeline (0%)
    ○ devops

    NEXT STEPS:
    → Continue with Architect agent (in progress)
    → Review functional requirements from Detail

    Last activity: 8h ago (2026-02-13T02:15:00Z)
```
