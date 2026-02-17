---
id: tasks-consolidate
agent: tasks
trigger: tasks-acceptance-write
phase: plan
requires_input: false
parallelizable: false
outputs: [tasks-final.yaml]
handoff_to: qa-planning
autonomous_gate: true
criteria:
  - All task artifacts consolidated
  - Work breakdown structure complete
  - Ready for QA planning
---
# Consolidate Task List

## Purpose
Merge all task artifacts into final comprehensive task breakdown.

## Steps

### 1. Combine All Task Data
Merge: tasks-list.yaml, estimates.yaml, task-criteria.yaml

### 2. Create Work Breakdown Structure
Organize tasks hierarchically:
- Phase → Feature → Tasks

### 3. Add Sprint Planning Hints
Suggest which tasks could be grouped into sprints.

### 4. Generate Final Task List
Complete, ready for development.

## Output Format
```yaml
# tasks-final.yaml
timestamp: 2026-02-13T18:00:00Z
total_tasks: 67
total_estimated_hours: 480
[All task details consolidated]
sprint_suggestions:
  sprint_1:
    focus: Database schema and authentication backend
    tasks: [TASK-001, TASK-002, TASK-005, TASK-006]
    estimated_hours: 60
  sprint_2:
    focus: Authentication UI and post backend
    tasks: [TASK-003, TASK-004, TASK-010, TASK-011]
    estimated_hours: 72
next_phase: qa_planning
handoff_note: |
  Complete task breakdown with 67 atomic tasks, estimated at 480 hours
  including buffer. Tasks organized by module with clear acceptance criteria.
  Ready for QA Planning agent to define test strategy.
```
