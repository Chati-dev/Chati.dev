---
id: orchestrator-escalate
agent: orchestrator
trigger: agent-failure
phase: all
requires_input: false
parallelizable: false
outputs: [escalation-report]
handoff_to: null
autonomous_gate: false
criteria:
  - Failure correctly classified
  - Context collected
  - User notified
  - Pipeline paused
---

# Orchestrator Escalate Task

## Purpose
Handle agent failures, blockers, and critical issues by collecting context, classifying severity, and escalating to the user with actionable options.

## Prerequisites
- Failure signal from agent
- Session state at `.chati/session.yaml`
- Agent definition with failure handling rules
- Error logs or stack traces (if available)

## Steps

### 1. Receive Failure Signal
Capture the error from the agent:
- Agent name and failure timestamp
- Error type (exception, validation failure, blocker, timeout)
- Error message and stack trace
- Agent state at time of failure
- Partial outputs (if any)

### 2. Classify Severity
Categorize the failure impact:
- **Warning**: Non-critical issue, can continue with caution
- **Error**: Agent cannot complete, requires intervention
- **Critical**: Pipeline cannot continue, requires immediate action
- **Blocker**: External dependency missing, user decision needed

### 3. Collect Failure Context
Gather all relevant information:
- Agent's current task/step when failure occurred
- Inputs provided to the agent
- Previous agent outputs (handoff chain)
- Session state at failure time
- Related artifacts

### 4. Identify Root Cause
Analyze the failure to determine likely cause:
- **Configuration**: Missing or invalid config values
- **Dependency**: Required tool/MCP not available
- **Data**: Invalid or missing input data
- **Logic**: Agent code error or unexpected state
- **External**: Third-party service failure

### 5. Check Recovery Options
Evaluate possible recovery paths:
- **Retry**: Can the agent retry with same inputs?
- **Skip**: Can the agent be marked `skipped` and pipeline continue?
- **Rollback**: Should we revert to previous agent?
- **Manual**: Does user need to fix something externally?
- **Abort**: Is the entire project blocked?

### 6. Format Escalation Report
Build a clear, actionable report:
- Summary: One-line description of what went wrong
- Details: Full error context
- Impact: What this means for the project
- Options: Specific actions user can take
- Recommendation: Suggested path forward

### 7. Pause Pipeline
Prevent automatic progression:
- Set agent status to `blocked`
- Update session with escalation flag
- Prevent other agents from starting
- Log escalation event

### 8. Notify User
Present the escalation clearly:
- Use attention-grabbing formatting
- Provide full context
- List options with pros/cons
- Include relevant file paths and error snippets

### 9. Await User Decision
Wait for explicit user input:
- Do not auto-recover for errors or critical issues
- Timeout after 24 hours (session expires)
- Allow user to choose from options
- Validate user choice before proceeding

### 10. Execute Recovery Action
Based on user decision:
- **Retry**: Re-invoke agent with same or updated inputs
- **Skip**: Mark agent as `skipped`, route to next
- **Rollback**: Revert to previous agent, update session
- **Manual Fix**: Pause pipeline, provide instructions
- **Abort**: Mark project as blocked, save state

## Decision Points

### When Failure is Recoverable
If agent can be retried successfully:
1. Check retry count (max 3 attempts)
2. Determine if inputs need modification
3. Suggest retry with guidance

### When Failure is Due to Missing Config
If agent failed because of invalid configuration:
1. Identify the missing/invalid config key
2. Show example of correct format
3. Offer to re-run installer to fix config

### When Failure is External
If agent failed due to third-party service:
1. Check if service is critical or optional
2. Suggest workaround if available
3. Offer to skip agent if non-critical

### When Multiple Failures Occur
If several agents fail in sequence:
1. Look for common root cause
2. Suggest fixing root cause first
3. Offer full pipeline validation

## Error Handling

### Escalation During Escalation
If escalation process itself fails:
- Fall back to minimal text report
- Log to `.chati/logs/critical.log`
- Attempt to notify via stderr

### Session Update Failure
If session can't be updated with escalation:
- Continue escalation anyway
- Store in-memory state
- Warn user about state persistence issue

### User Response Timeout
If user doesn't respond within 24 hours:
- Mark session as stale
- Preserve all state
- Next invocation resumes escalation

### Cannot Determine Root Cause
If failure is mysterious:
- Provide full error details
- Suggest framework validation
- Offer to collect debug logs

### Recovery Action Fails
If user's chosen recovery also fails:
- Re-escalate with updated context
- Increment failure count
- Suggest more drastic action (rollback/abort)

## Output Format

```yaml
escalation_report:
  timestamp: "2026-02-13T10:30:00Z"
  escalation_id: "ESC-001"
  severity: "error"
  agent: "architect"
  failure_type: "dependency-missing"

  summary: "Architect agent failed: Required MCP 'gdrive' not available"

  details:
    error_message: "MCP server 'gdrive' is not configured or not responding"
    error_code: "MCP_UNAVAILABLE"
    stack_trace: null
    failure_step: "load-existing-architecture-docs"
    timestamp: "2026-02-13T10:28:45Z"

    agent_state:
      current_task: "Searching for existing architecture documentation"
      inputs_provided:
        - "handoff from detail agent"
        - "functional requirements"
      partial_outputs: []

    context:
      previous_agent: "detail"
      session_mode: "planning"
      pipeline_position: "PLAN/architect"

  root_cause_analysis:
    primary_cause: "dependency-missing"
    explanation: |
      Architect agent requires Google Drive MCP to search for existing
      architecture documents. The MCP server is listed in agent definition
      as 'required' but is not configured in the IDE.
    related_config: "chati.dev/agents/architect.yaml > mcps.required"

  impact:
    pipeline_status: "paused"
    affected_agents: ["architect"]
    can_continue_without: false
    affects_deliverables: true

  recovery_options:
    - id: "R1"
      action: "configure-gdrive-mcp"
      description: "Install and configure Google Drive MCP, then retry"
      effort: "5-10 minutes"
      risk: "low"
      steps:
        - "Follow Google Drive MCP setup: https://..."
        - "Add server config to IDE MCP settings"
        - "Restart IDE"
        - "Run `/chati` to retry Architect agent"
      recommended: true

    - id: "R2"
      action: "skip-gdrive-search"
      description: "Skip Drive search, Architect uses only local docs"
      effort: "immediate"
      risk: "medium"
      warning: "May miss important existing architecture documentation"
      recommended: false

    - id: "R3"
      action: "manual-doc-collection"
      description: "User manually collects architecture docs, provides to agent"
      effort: "variable"
      risk: "low"
      steps:
        - "Search Google Drive manually"
        - "Download relevant architecture docs"
        - "Place in .chati/artifacts/architecture/"
        - "Run `/chati` to retry Architect agent"
      recommended: false

  recommendation: "R1"
  recommendation_rationale: |
    Configuring the Google Drive MCP is quick and ensures Architect has
    full access to existing documentation. This is a one-time setup that
    benefits future sessions.

  session_updates:
    agent_status: "blocked"
    escalation_flag: true
    pipeline_paused: true
    retry_count: 0

  user_prompt: |
    ⚠️  ESCALATION: Architect agent blocked

    The Architect agent requires Google Drive MCP but it's not configured.

    Options:
    1. [Recommended] Configure Google Drive MCP (5-10 min)
       - Follow setup: https://...
       - Add to IDE MCP settings
       - Restart IDE and retry

    2. Skip Drive search (less thorough, may miss docs)

    3. Manually collect architecture docs

    What would you like to do? (1/2/3)

  audit_trail:
    logged_at: "2026-02-13T10:30:00Z"
    logged_to: ".chati/logs/escalations.log"
    session_state_saved: true
```
