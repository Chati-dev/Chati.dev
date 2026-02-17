---
id: ux-a11y-check
agent: ux
trigger: ux-component-map
phase: plan
requires_input: false
parallelizable: false
outputs: [a11y-report.yaml]
handoff_to: ux-consolidate
autonomous_gate: true
criteria:
  - WCAG 2.1 AA requirements documented
  - Accessibility patterns defined for key interactions
  - Screen reader considerations documented
---
# Accessibility Audit and Requirements

## Purpose
Define accessibility requirements to meet WCAG 2.1 AA compliance.

## Steps
Document:
- Semantic HTML requirements
- ARIA labels for interactive elements
- Keyboard navigation support
- Color contrast requirements (4.5:1 for text)
- Focus management
- Screen reader announcements
- Alt text for images
- Form error announcements

## Output Format
```yaml
# a11y-report.yaml
wcag_compliance: AA
requirements:
  - All interactive elements keyboard accessible (Tab, Enter, Escape)
  - Focus visible with clear outline
  - Color contrast 4.5:1 minimum for text
  - Alt text for all images
  - ARIA labels for icon buttons
  - Form errors announced to screen readers
  - Skip links for main content
  - Heading hierarchy maintained (h1, h2, h3)
testing:
  - Lighthouse accessibility audit >90
  - Manual keyboard navigation test
  - Screen reader test (NVDA/JAWS)
```
