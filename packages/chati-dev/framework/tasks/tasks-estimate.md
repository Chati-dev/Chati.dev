---
id: tasks-estimate
agent: tasks
trigger: tasks-decompose
phase: plan
requires_input: false
parallelizable: false
outputs: [estimates.yaml]
handoff_to: tasks-acceptance-write
autonomous_gate: true
criteria:
  - All tasks estimated with T-shirt sizing or days
  - Total effort calculated
  - Estimates include buffer for unknowns
---
# Estimate Task Complexity

## Purpose
Estimate effort for each task using T-shirt sizes or day estimates.

## Steps

### 1. Review Each Task
Assess complexity based on:
- Technical difficulty
- Unknowns and risks
- Dependencies on external systems
- Team familiarity with technology

### 2. Assign T-Shirt Size
- XS: <1 day, trivial
- S: 1-2 days, straightforward
- M: 3-5 days, moderate complexity
- L: 6-10 days, complex (consider breaking down)
- XL: >10 days (must break down)

### 3. Convert to Day Estimates
Provide specific day estimates for planning.

### 4. Add Buffer
20-30% buffer for unknowns, bugs, learning.

### 5. Calculate Totals
Sum by module, by phase, and overall.

## Output Format
```yaml
# estimates.yaml
task_estimates:
  - task_id: TASK-001
    size: S
    estimated_days: 1
    confidence: high
  - task_id: TASK-002
    size: M
    estimated_days: 3
    confidence: medium
  - task_id: TASK-003
    size: M
    estimated_days: 3
    confidence: high
totals:
  raw_estimate: 400 hours
  with_20_percent_buffer: 480 hours
  with_30_percent_buffer: 520 hours
```
