---
id: orchestrator-suggest-mode
agent: orchestrator
trigger: orchestrator-internal
phase: all
requires_input: false
parallelizable: false
outputs: [mode-suggestion]
handoff_to: null
autonomous_gate: true
criteria:
  - Session state analyzed
  - Transition conditions evaluated
  - Confidence calculated
  - Suggestion or auto-transition executed
---

# Orchestrator Suggest Mode Task

## Purpose
Analyze session state to determine if mode transition conditions are met, calculate confidence, and either suggest to user or autonomously execute the transition.

## Prerequisites
- Session state at `.chati/session.yaml`
- Constitution Article XI at `chati.dev/constitution.md`
- Agent completion data
- Quality scores from QA agents

## Steps

### 1. Load Current Session State
Read session to understand current position:
- Current mode (planning/build/deploy)
- Last completed agent
- Agent statuses and timestamps
- Quality scores
- Previous mode transitions

### 2. Identify Potential Transitions
Based on current mode, check eligibility for:
- **planning → build**: Triggered after QA-Planning completes
- **build → validate**: Triggered after Dev completes
- **validate → deploy**: Triggered after QA-Implementation approves

### 3. Evaluate Transition Conditions
For each potential transition, check requirements:

**For planning → build**:
- QA-Planning agent status = `completed`
- QA-Planning score >= 95%
- All DISCOVER/PLAN agents completed or skipped
- No blocking issues in planning phase

**For build → validate**:
- Dev agent status = `completed`
- All build artifacts present
- No critical build errors

**For validate → deploy**:
- QA-Implementation agent status = `completed`
- QA-Implementation score >= 8.0 (approved)
- No deployment blockers
- All validation criteria met

### 4. Calculate Transition Confidence
Assess readiness on multiple factors:

**Quality Factor** (40% weight):
- Actual score vs. required threshold
- Margin of safety (how far above threshold)

**Completeness Factor** (30% weight):
- All required agents completed
- All required artifacts present
- No pending tasks

**Risk Factor** (20% weight):
- Number of open questions
- Blocker count
- Historical success rate

**Context Factor** (10% weight):
- Recent activity (not stale)
- Session stability
- No recent failures

Combine to get overall confidence: 0-100%

### 5. Check Autonomous Gate Eligibility
Determine if autonomous transition is allowed:
- Article XI specifies autonomous for forward transitions
- Confidence must be >= 90% for auto-execution
- No manual override flags in session
- No recent escalations

### 6. Classify Suggestion Type
Based on confidence and autonomous gate:
- **Auto-Execute** (>= 90% confidence + autonomous enabled)
- **Strong Suggestion** (80-89% confidence)
- **Weak Suggestion** (70-79% confidence)
- **Not Ready** (< 70% confidence)

### 7. Generate Suggestion Context
Build explanation for user:
- Why transition is suggested
- What conditions are met
- What confidence level means
- What happens if user accepts
- What risks exist (if any)

### 8. Execute or Present
Based on classification:

**Auto-Execute**:
- Trigger `orchestrator-mode-switch` immediately
- Log autonomous decision
- Notify user of transition

**Strong/Weak Suggestion**:
- Present to user with confidence level
- List met conditions
- Offer accept/decline
- Wait for user input

**Not Ready**:
- Explain missing conditions
- Show progress toward readiness
- Estimate time to readiness

### 9. Handle User Response
If user input required:
- **Accept**: Trigger `orchestrator-mode-switch`
- **Decline**: Log decision, continue in current mode
- **Defer**: Set reminder to re-evaluate later

### 10. Update Session
Log the suggestion event:
- Timestamp
- Suggestion type
- Confidence score
- User response (if applicable)
- Transition executed (yes/no)

## Decision Points

### When Confidence is Borderline (88-92%)
At the threshold of autonomous execution:
1. Lean toward user confirmation for safety
2. Present strong suggestion instead of auto-execute
3. Highlight the borderline status

### When Multiple Factors Conflict
If quality is high but risks exist:
1. Weight quality more heavily
2. Document risks clearly
3. Suggest with strong warning

### When Session is Stale
If last activity is old (> 7 days):
1. Reduce confidence by 10 points
2. Suggest validation before transition
3. Warn user about staleness

### When Previous Transition Failed
If last mode switch had issues:
1. Reduce confidence by 15 points
2. Require user confirmation even if auto-eligible
3. Reference previous failure in suggestion

## Error Handling

### Quality Score Missing
If QA score is unavailable:
- Assume condition not met
- Suggest running QA agent
- Do not proceed with transition

### Session State Inconsistent
If mode doesn't match agent statuses:
1. Recalculate mode from agent progress
2. Flag inconsistency
3. Suggest health check

### Agent Status Ambiguous
If agent shows `in_progress` but has handoff:
1. Check handoff timestamp vs. agent timestamp
2. Infer completion if handoff is newer
3. Log ambiguity for investigation

### Confidence Calculation Error
If factors yield impossible result (e.g., >100%):
1. Log calculation error
2. Fall back to manual suggestion
3. Do not auto-execute

### User Response Timeout
If user doesn't respond to suggestion:
1. Preserve suggestion in session
2. Re-present on next invocation
3. Don't force decision

## Output Format

```yaml
mode_suggestion:
  timestamp: "2026-02-13T15:45:00Z"
  session_id: "sess-20260210-140000"

  current_state:
    mode: "planning"
    phase: "PLAN"
    last_completed_agent: "qa-planning"
    last_activity: "2026-02-13T15:30:00Z"

  potential_transition:
    from_mode: "planning"
    to_mode: "build"
    trigger_agent: "qa-planning"

  conditions_evaluation:
    qa_planning_completed: true
    qa_planning_score: 97.5
    qa_planning_threshold: 95
    score_meets_threshold: true
    all_planning_agents_done: true
    no_blockers: true
    conditions_met: true

  confidence_analysis:
    overall_confidence: 95
    confidence_level: "high"

    factors:
      quality_factor:
        weight: 40
        score: 98  # 97.5 vs 95 threshold = excellent
        contribution: 39.2

      completeness_factor:
        weight: 30
        score: 100  # All agents done, all artifacts present
        contribution: 30.0

      risk_factor:
        weight: 20
        score: 90  # 2 minor open questions
        contribution: 18.0

      context_factor:
        weight: 10
        score: 95  # Recent activity, stable session
        contribution: 9.5

    calculation:
      total_weighted: 96.7
      adjusted_for_staleness: 0
      adjusted_for_history: 0
      final_confidence: 95

  autonomous_gate_check:
    article_xi_allows_autonomous: true
    confidence_threshold: 90
    confidence_met: true
    no_override_flags: true
    eligible_for_auto: true

  suggestion_classification: "auto-execute"

  decision:
    action: "execute-transition"
    approved_by: "autonomous"
    rationale: |
      QA-Planning completed with excellent score (97.5% vs 95% required).
      All DISCOVER/PLAN agents complete. No blockers. High confidence (95%).
      Article XI allows autonomous transition. Auto-executing.

  execution:
    trigger_mode_switch: true
    mode_switch_task: "orchestrator-mode-switch"
    notify_user: true

  user_notification: |
    ✓ Autonomous Mode Transition

    PLAN → BUILD

    QA-Planning completed with score 97.5% (>= 95% required).
    Confidence: 95% (high)

    Transition executed automatically per Article XI.
    Next: Dev agent will begin implementation.

  session_updates:
    mode_suggestion_logged: true
    transition_triggered: true

  audit_trail:
    suggestion_id: "SUGG-001"
    classification: "auto-execute"
    confidence: 95
    autonomous: true
    user_confirmation_required: false
    executed: true
```

### Example: Strong Suggestion (Not Auto-Execute)

```yaml
mode_suggestion:
  confidence_analysis:
    overall_confidence: 87

  suggestion_classification: "strong-suggestion"

  decision:
    action: "suggest-to-user"
    requires_confirmation: true
    rationale: |
      QA-Planning completed with good score (96.5%).
      Confidence 87% is below 90% threshold for autonomous execution.
      3 open questions reduce confidence. Suggesting to user.

  user_prompt: |
    Mode Transition Available: PLAN → BUILD

    QA-Planning completed with score 96.5% (>= 95% required).
    Confidence: 87% (strong suggestion)

    Considerations:
    ✓ Quality score exceeds threshold
    ✓ All DISCOVER/PLAN agents complete
    ⚠ 3 open questions remain (non-blocking)

    Proceed with transition to BUILD mode? (yes/no)

  execution:
    trigger_mode_switch: false  # Awaiting user input
    mode_switch_task: "orchestrator-mode-switch"
    await_user_response: true
```

### Example: Not Ready

```yaml
mode_suggestion:
  confidence_analysis:
    overall_confidence: 65

  suggestion_classification: "not-ready"

  decision:
    action: "inform-user"
    rationale: |
      QA-Planning completed but score is 92% (below 95% threshold).
      Confidence 65% is too low for transition.
      Recommend addressing planning issues first.

  user_notification: |
    Mode Transition: Not Ready

    QA-Planning score: 92% (95% required for PLAN → BUILD)

    To proceed:
    1. Address planning issues identified by QA-Planning
    2. Re-run QA-Planning to achieve >= 95% score

    Current confidence: 65% (needs improvement)

  execution:
    trigger_mode_switch: false
    recommend_action: "rerun-qa-planning"
```
