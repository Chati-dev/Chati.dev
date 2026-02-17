---
id: ux-consolidate
agent: ux
trigger: ux-a11y-check
phase: plan
requires_input: false
parallelizable: false
outputs: [ux-final.yaml]
handoff_to: phases
autonomous_gate: true
criteria:
  - All UX artifacts consolidated
  - Design system foundation defined
  - UX package complete
---
# Consolidate UX Documentation

## Purpose
Merge all UX artifacts into comprehensive UX specification document.

## Steps
Combine wireframes, user flows, component map, and accessibility requirements.

Add design system foundations:
- Color palette
- Typography scale
- Spacing system
- Component variants

## Output Format
```yaml
# ux-final.yaml
timestamp: 2026-02-13T17:00:00Z
[All UX details consolidated]
design_system:
  colors:
    primary: blue-600
    secondary: gray-700
    success: green-600
    error: red-600
  typography:
    headings: font-bold
    body: font-normal
  spacing: [4px, 8px, 16px, 24px, 32px, 48px, 64px]
next_phase: phases
```
