---
id: brief-stakeholder-map
agent: brief
trigger: brief-validate-completeness
phase: discover
requires_input: true
parallelizable: false
outputs: [stakeholder-map.yaml]
handoff_to: brief-constraint-identify
autonomous_gate: true
criteria:
  - All stakeholder categories identified
  - Influence and interest levels assessed
  - Communication plan defined
---
# Map Stakeholders and Personas

## Purpose
Identify all stakeholders, assess their influence and interest, and create communication plan.

## Prerequisites
- `validation-report.yaml` with validated personas

## Steps

### 1. Identify Stakeholder Categories
- **Primary Users**: Direct users of the system
- **Business Stakeholders**: Product owner, executives, sponsors
- **Technical Stakeholders**: Development team, DevOps, security team
- **External Stakeholders**: Partners, vendors, regulators
- **Customers/Clients**: Paying customers if different from users

### 2. For Each Stakeholder, Document
- Name/role
- Interest level (high, medium, low)
- Influence level (high, medium, low)
- Needs and expectations
- Concerns and risks
- Communication preferences

### 3. Create Influence-Interest Matrix
- **High Influence, High Interest**: Manage closely (key stakeholders)
- **High Influence, Low Interest**: Keep satisfied
- **Low Influence, High Interest**: Keep informed
- **Low Influence, Low Interest**: Monitor

### 4. Map Personas to Stakeholders
- Link user personas to stakeholder categories
- Identify which personas are most critical
- Note any conflicting needs

### 5. Define Communication Plan
- For each stakeholder group:
  - Communication frequency (daily, weekly, monthly)
  - Communication channel (email, Slack, meetings)
  - Information needs (detailed progress, high-level status, demo)
  - Decision-making authority

### 6. Identify Decision Makers
- Who approves requirements?
- Who approves design decisions?
- Who approves budget/timeline changes?
- Who signs off on completion?

### 7. Document Potential Conflicts
- Conflicting needs between stakeholder groups
- Resource competition
- Priority disagreements

### 8. Create Stakeholder Engagement Strategy
- How to gather feedback from each group
- How to resolve conflicts
- Escalation path for blockers

### 9. Generate Stakeholder Map
- Visual representation of relationships
- Clear lines of authority
- Communication flows

### 10. Define Success for Each Stakeholder Group
- What does each group need to consider project successful?
- How to measure their satisfaction?

## Decision Points
- **Unclear Authority**: Ask user who has final decision-making power
- **Too Many Stakeholders**: Prioritize and focus on top 5-7

## Error Handling
- **Solo Developer**: Simplify stakeholder map, focus on end users
- **Large Organization**: Create simplified groups, avoid listing every individual

## Output Format
```yaml
# stakeholder-map.yaml
timestamp: 2026-02-13T13:30:00Z

stakeholders:
  - id: STK-001
    name: Product Owner
    category: business
    interest: high
    influence: high
    quadrant: manage_closely
    needs: [successful launch, user adoption, ROI]
    concerns: [timeline, budget overruns]
    communication: weekly status meeting
    decision_authority: [requirements, priorities, MVP scope]
  - id: STK-002
    name: Development Team
    category: technical
    interest: high
    influence: medium
    quadrant: keep_informed
    needs: [clear requirements, realistic timeline, modern tech stack]
    concerns: [scope creep, technical debt, changing requirements]
    communication: daily standups, Slack
    decision_authority: [technical implementation details]
  - id: STK-003
    name: End Users (Bloggers)
    category: primary_user
    interest: high
    influence: low
    quadrant: keep_informed
    needs: [easy to use, fast, reliable]
    concerns: [learning curve, data loss, downtime]
    communication: beta testing, surveys, support tickets
    decision_authority: []
    persona_mapping: [P-001]

influence_interest_matrix:
  manage_closely: [Product Owner, Executive Sponsor]
  keep_satisfied: [IT Security Team]
  keep_informed: [Development Team, End Users]
  monitor: [External Partners]

decision_makers:
  requirements_approval: Product Owner
  design_approval: Product Owner
  budget_changes: Executive Sponsor
  technical_decisions: Tech Lead
  completion_signoff: Product Owner

potential_conflicts:
  - conflict: Product Owner wants fast delivery, Dev Team wants time for quality
    resolution: Negotiate MVP scope, defer nice-to-have features
  - conflict: End Users want many features, Budget constrains development time
    resolution: Prioritize based on user research and usage data

communication_plan:
  daily:
    - Development Team standups
  weekly:
    - Product Owner status update
    - Progress demos
  biweekly:
    - Executive Sponsor briefing
  monthly:
    - User beta testing sessions
  ad_hoc:
    - Critical issue escalation
    - Scope change discussions

success_metrics_by_stakeholder:
  Product_Owner:
    - 1000 registered users in first month
    - 4.5/5 user satisfaction rating
    - On-time MVP launch
  Development_Team:
    - Clean, maintainable codebase
    - >80% test coverage
    - No critical post-launch bugs
  End_Users:
    - Easy to use (<5 min to publish first post)
    - Fast (<2s page loads)
    - Reliable (99.5% uptime)
```
