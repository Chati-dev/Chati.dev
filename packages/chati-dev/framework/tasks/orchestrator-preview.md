---
id: orchestrator-preview
agent: orchestrator
trigger: user-preview-action
phase: build
requires_input: true
parallelizable: false
outputs: [preview-feedback, server-logs]
handoff_to: null
autonomous_gate: false
criteria:
  - Server started successfully OR graceful fallback for non-visual projects
  - User provided explicit feedback (approve/adjust/rethink)
  - Server lifecycle managed by user decision (never killed implicitly)
  - Adjustment feedback includes server logs context
---

# Orchestrator Preview Task

## Purpose
Launch a local preview server after QA-Implementation passes so the user can visually validate the build before deploying. The server stays alive until the user explicitly decides to kill it. Captures server logs for Dev agent context during iterative adjustments.

## Prerequisites
- QA-Implementation completed with score >= 95%
- Pipeline state: `phase = 'build'`, `nextAction = 'user_preview'`
- Project directory with source code ready to run

## Steps

### 1. Detect Project Framework
Call `detectDevCommand(projectDir)` to identify:
- Framework (Next.js, Vite, Angular, Django, etc.)
- Dev command (`npm run dev`, `python manage.py runserver`, etc.)
- Default port

Also call `detectProjectKind(projectDir)` to determine UX messaging:
- `frontend` / `fullstack` / `static`: Visual preview (browser)
- `api`: Endpoint preview (suggest curl/Postman)
- `cli`: No server needed (show help command)
- `library`: No server needed (show test results/README)

### 2. Handle Non-Visual Projects
If project kind is `cli` or `library`, or `detectDevCommand()` returns `null`:
- Skip server launch
- Present appropriate message:
  - CLI: "Run `node bin/cli.js --help` to test your tool"
  - Library: "Tests passed. Would you like to review the README?"
  - Unknown: "Proceed to deploy, run tests, or review documentation?"
- Still collect user decision (approve/adjust/rethink)

### 3. Find Available Port
Call `findAvailablePort(defaultPort)`:
- Starts at the framework's default port
- **NEVER kills existing processes** on occupied ports
- Scans incrementally (+1, +2, ...) up to 20 attempts
- Returns first available port

### 4. Launch Preview Server
Call `launchPreview(projectDir, { command, args, port, framework })`:
- Spawns the dev server process
- Captures stdout/stderr into `LogBuffer` (circular, 200 lines)
- Waits for server health check (HTTP GET, 30s timeout)
- Opens browser automatically

### 5. Present Preview to User
Display the running preview with 4 options:

```
Your app is running at http://localhost:{PORT}
Opened in your browser.

What do you think?
1. Deploy (keep local server running)
2. Deploy (shut down local server)
3. I need adjustments
4. Rethink the approach
```

### 6. Process User Decision

#### Option 1: Deploy + Keep Server
- Call `confirmPreview(state, 'approve_keep')`
- Pipeline advances to DEPLOY phase
- Server stays alive (user can compare local vs production)
- Route to DevOps agent

#### Option 2: Deploy + Kill Server
- Kill the preview server process
- Call `confirmPreview(state, 'approve_kill')`
- Pipeline advances to DEPLOY phase
- Route to DevOps agent

#### Option 3: Adjustments
- Collect feedback: "What needs to change?"
- Capture server logs via `handle.logs.toContext()`
- Call `confirmPreview(state, 'adjust')`
- Route to Dev agent with context:
  - User feedback (text)
  - Server logs (last 200 lines)
  - Filtered errors (stderr + error patterns)
  - Active URL + port (server ALIVE, hot-reload active)
- After Dev completes adjustments:
  - Re-run QA-Implementation (fast, diffs only)
  - Return to Step 5 (user validates again)
  - Loop until approval

#### Option 4: Rethink
- Server stays alive (user can reference it)
- Call `confirmPreview(state, 'rethink')`
- Activate deviation protocol
- Route to appropriate agent for rework
- When resolved, return to Step 5

### 7. Post-Deploy Cleanup
After DevOps agent completes deployment successfully:
- Check if local preview server is still running
- If running, offer cleanup:

```
Deploy completed successfully!
Your local server is still running at http://localhost:{PORT}.
Would you like to shut it down?
1. Yes, shut it down
2. No, keep it running (I want to compare)
```

## Decision Points

### When Framework Detection Fails
If `detectDevCommand()` returns `null` but there's a `package.json`:
1. Check for any script that looks like a server (dev, start, serve)
2. If found, try running it
3. If not found, treat as library/CLI project

### When Server Fails to Start
If health check times out (30s):
1. Show captured logs (errors from LogBuffer)
2. Ask user: "Server failed to start. Want to see the error logs?"
3. Options: Route to Dev for fix, proceed to deploy anyway, rethink

### When Port Range Exhausted
If no port found in 20 attempts:
1. Inform user: "Ports {start}-{start+19} are all in use"
2. Ask user for a preferred port or to free one up
3. Retry with user-provided port

## Error Handling

### Server Crash During Preview
- LogBuffer preserves crash output
- Notify user: "Server stopped unexpectedly"
- Show last error logs
- Options: Restart, route to Dev, proceed to deploy

### Browser Failed to Open
- Show URL for manual access
- Continue normally (non-blocking)

## Context for Dev Agent (Adjustments)

When routing to Dev agent after user requests adjustments, include:

```yaml
preview_context:
  user_feedback: "<text from user>"
  server_url: "http://localhost:{PORT}"
  server_alive: true
  logs:
    total_lines: 156
    error_count: 3
    errors:
      - "TypeError: Cannot read properties of undefined (reading 'map')"
      - "Warning: Each child in a list should have a unique key prop"
      - "Error: ECONNREFUSED 127.0.0.1:5432"
    recent_output:
      - "[stdout] GET /api/users 200 12ms"
      - "[stderr] TypeError: Cannot read properties..."
      - "[stdout] GET /dashboard 200 45ms"
  framework: "nextjs"
  hot_reload: true
```
