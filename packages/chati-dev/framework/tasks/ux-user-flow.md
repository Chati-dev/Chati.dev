---
id: ux-user-flow
agent: ux
trigger: ux-wireframe
phase: plan
requires_input: false
parallelizable: false
outputs: [user-flows.yaml]
handoff_to: ux-component-map
autonomous_gate: true
criteria:
  - Happy path flows documented for all key user journeys
  - Error paths documented
  - Flow diagrams created (text-based)
---
# Map User Flows

## Purpose
Document user journeys through the application including happy paths and error paths.

## Steps
Map key user flows:
1. New user registration and first post
2. Returning user login and post creation
3. Search for content
4. Edit existing post
5. Error scenarios (failed login, validation errors)

## Output Format
```yaml
# user-flows.yaml
flows:
  - name: New User First Post
    steps:
      - User visits / (home)
      - Clicks "Register"
      - Fills registration form
      - Submits → redirected to /dashboard
      - Clicks "Create Post"
      - Fills post form
      - Clicks "Publish" → redirected to /posts/:id
      - Success! Post is live
    error_paths:
      - If email exists: Show error, remain on register page
      - If validation fails: Show specific errors inline
```
