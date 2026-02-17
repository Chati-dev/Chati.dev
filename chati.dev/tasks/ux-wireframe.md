---
id: ux-wireframe
agent: ux
trigger: detail
phase: plan
requires_input: false
parallelizable: true
outputs: [wireframes.yaml]
handoff_to: ux-user-flow
autonomous_gate: true
criteria:
  - Wireframes created for all key screens
  - Layout and component hierarchy defined
  - Responsive breakpoints documented
---
# Create Wireframes for Key Screens

## Purpose
Design wireframes (text-based descriptions with ASCII diagrams) for all key user-facing screens.

## Prerequisites
- `prd.yaml` with UI requirements

## Steps

### 1. Identify All Screens
From PRD: home, post detail, register, login, dashboard, create post, edit post, search results.

### 2. For Each Screen, Define
- Layout structure (header, main, sidebar, footer)
- Key UI elements (forms, buttons, lists, cards)
- Component hierarchy
- Responsive breakpoints (mobile 320px, tablet 768px, desktop 1024px+)

### 3. Create ASCII Wireframes
Text-based visual representations.

### 4. Document Interactions
Hover states, focus states, loading states.

### 5. Define Navigation
How users move between screens.

## Output Format
```yaml
# wireframes.yaml
screens:
  - name: Home Page
    route: /
    layout: |
      [Header: Logo | Search | Login/Register]
      [Hero: Welcome message, CTA]
      [Post Grid: 3 columns on desktop, 1 on mobile]
      [Pagination]
      [Footer]
    components:
      - Header (sticky)
      - SearchBar
      - PostCard (repeating)
      - Pagination
    responsive:
      mobile: Single column
      tablet: 2 columns
      desktop: 3 columns
  - name: Login Page
    route: /login
    layout: |
      [Header]
      [Centered Card:
        Email input
        Password input
        Login button
        Link to /register
      ]
      [Footer]
```
