---
id: brief-constraint-identify
agent: brief
trigger: brief-stakeholder-map
phase: discover
requires_input: true
parallelizable: false
outputs: [constraints.yaml]
handoff_to: brief-consolidate
autonomous_gate: true
criteria:
  - All constraint types identified
  - Constraint conflicts resolved
  - Realistic feasibility assessment
---
# Identify and Resolve Constraint Conflicts

## Purpose
Identify all project constraints, detect conflicts, and work with user to resolve them.

## Prerequisites
- `validation-report.yaml` with initial constraints
- `stakeholder-map.yaml` for authority on constraint resolution

## Steps

### 1. Consolidate All Constraints
From previous artifacts, gather:
- Technical constraints
- Timeline constraints
- Budget constraints
- Team constraints
- Regulatory/compliance constraints
- Business constraints

### 2. Analyze Each Constraint Type

**Technical Constraints**:
- Must-use technologies
- Integration requirements
- Platform requirements
- Data constraints
- Infrastructure limitations

**Timeline Constraints**:
- Hard deadlines (launch date, regulatory deadline)
- Soft deadlines (preferred dates)
- Milestones
- Dependencies on external events

**Budget Constraints**:
- Development budget (hours × rate)
- Infrastructure budget (hosting, services)
- Third-party service costs (APIs, SaaS)
- One-time vs. recurring costs

**Team Constraints**:
- Team size and composition
- Skill levels and gaps
- Availability (full-time, part-time, contract)
- Timezone distribution

**Regulatory Constraints**:
- GDPR, CCPA (data privacy)
- HIPAA (healthcare)
- PCI-DSS (payments)
- SOC2 (security)
- Industry-specific regulations

### 3. Detect Constraint Conflicts
Common conflicts:
- **Time vs. Scope**: Not enough time to build all features
- **Budget vs. Quality**: Budget doesn't support proper testing
- **Team Skills vs. Tech Stack**: Team doesn't know required technologies
- **Timeline vs. Quality**: Rush leads to technical debt
- **Multiple Hard Deadlines**: Can't meet all simultaneously

### 4. Assess Constraint Flexibility
For each constraint, determine:
- **Fixed**: Cannot change (legal deadline, existing API)
- **Negotiable**: Can discuss changes (MVP scope, timeline)
- **Flexible**: Can easily adjust (nice-to-have features)

### 5. Calculate Feasibility
Estimate if project is feasible given constraints:
- Required effort (hours) vs. available capacity (team × hours)
- Required timeline vs. estimated development time
- Required budget vs. estimated costs
- Required skills vs. available skills

If infeasible, flag with recommended adjustments.

### 6. Present Conflicts to User
For each conflict:
- Describe the conflict
- Explain the impact if not resolved
- Provide 2-3 resolution options with trade-offs
- Recommend preferred option

### 7. Collect User Decisions
- Which constraints are truly fixed?
- Which can be relaxed?
- How to resolve each conflict?
- What are acceptable trade-offs?

### 8. Update Constraint List
- Mark fixed vs. flexible
- Document resolutions
- Note any assumptions made

### 9. Re-assess Feasibility
- After resolutions, is project now feasible?
- If not, escalate to stakeholders for major decisions

### 10. Document Final Constraints
- Clear, unambiguous constraint list
- All conflicts resolved
- Feasibility confirmed

## Decision Points
- **Infeasible Project**: If project cannot be done within constraints, recommend scope reduction or constraint relaxation
- **Major Conflict**: If conflict requires stakeholder decision, facilitate that conversation

## Error Handling
- **Unrealistic Expectations**: Gently educate user on typical timelines/costs
- **Unwilling to Compromise**: Document the risk and proceed (user responsibility)

## Output Format
```yaml
# constraints.yaml
timestamp: 2026-02-13T13:45:00Z

all_constraints:
  technical:
    - id: CT-001
      constraint: Must integrate with existing WordPress blog API
      flexibility: fixed
      impact: high
      reason: Business requirement, existing content must be accessible
    - id: CT-002
      constraint: Must use React for frontend
      flexibility: negotiable
      impact: medium
      reason: Team expertise, but could learn Vue if needed
  timeline:
    - id: CT-003
      constraint: MVP launch by May 13, 2026 (3 months)
      flexibility: negotiable
      impact: high
      reason: Marketing campaign scheduled, but can adjust
  budget:
    - id: CT-004
      constraint: Development budget is $60,000 (600 hours @ $100/hr)
      flexibility: negotiable
      impact: high
      reason: Allocated budget for Q1-Q2, could request more if justified
    - id: CT-005
      constraint: Hosting budget is $200/month
      flexibility: fixed
      impact: medium
      reason: Recurring budget approved, hard to change
  team:
    - id: CT-006
      constraint: Team of 2 React developers, no backend experience
      flexibility: fixed
      impact: high
      reason: Current team, hiring not possible short-term
  regulatory:
    - id: CT-007
      constraint: Must be GDPR compliant for EU users
      flexibility: fixed
      impact: high
      reason: Legal requirement

detected_conflicts:
  - conflict_id: CONF-001
    description: Timeline too aggressive for scope
    constraints_involved: [CT-003, functional requirements FR-001 through FR-008]
    impact: Project will miss deadline or deliver incomplete features
    severity: high
    resolution_options:
      - option: Reduce MVP scope to core features only (FR-001, FR-002, FR-005)
        pros: Can meet timeline, focused MVP
        cons: Deferred features delay user value
        recommended: true
      - option: Extend timeline to 5 months
        pros: All features delivered with quality
        cons: Misses marketing campaign
        recommended: false
      - option: Hire contractor for additional capacity
        pros: Accelerate development
        cons: Increases budget, onboarding overhead
        recommended: false
    user_decision: Reduce scope to core features
    resolution: MVP scope reduced to user auth, posting, and search. Admin moderation and comments deferred to phase 2.

  - conflict_id: CONF-002
    description: Team lacks backend skills but project requires full-stack
    constraints_involved: [CT-006, architecture requirements]
    impact: Backend development will be slow, potential quality issues
    severity: high
    resolution_options:
      - option: Use Backend-as-a-Service (Firebase, Supabase, AWS Amplify)
        pros: Reduces backend complexity, team can focus on React
        cons: Vendor lock-in, recurring costs
        recommended: true
      - option: Hire backend contractor
        pros: Expert backend implementation
        cons: Increases budget, coordination overhead
        recommended: false
      - option: Team learns backend while building
        pros: Team skill development
        cons: Slower development, higher bug risk
        recommended: false
    user_decision: Use Supabase (BaaS)
    resolution: Supabase chosen for auth, database, and API. Team focuses on React frontend.

  - conflict_id: CONF-003
    description: Budget may not support 3-month intensive development
    constraints_involved: [CT-004, CT-003]
    impact: May run out of budget before completion
    severity: medium
    resolution_options:
      - option: Reduce scope to fit budget
        pros: Stays within budget
        cons: Fewer features
        recommended: true
      - option: Request budget increase
        pros: Full feature set
        cons: Requires approval, may not be granted
        recommended: false
    user_decision: Reduced scope fits within budget
    resolution: Scope reduction (CONF-001) brings estimated effort to 480 hours, fits within 600-hour budget with buffer.

resolved_conflicts: 3
remaining_conflicts: 0

feasibility_assessment:
  before_resolution:
    required_effort_hours: 720
    available_capacity_hours: 600 (2 devs × 3 months × 100 hours/month)
    feasibility: infeasible
    gap: 120 hours
  after_resolution:
    required_effort_hours: 480
    available_capacity_hours: 600
    feasibility: feasible
    buffer: 120 hours (20%)
    confidence: high

final_constraints:
  fixed:
    - WordPress integration (CT-001)
    - Hosting budget $200/month (CT-005)
    - Team size 2 developers (CT-006)
    - GDPR compliance (CT-007)
  negotiable:
    - React frontend (CT-002) - chosen, but could have been Vue
    - Timeline 3 months (CT-003) - could extend if needed
  flexible:
    - Feature scope - reduced to MVP
    - Development budget (CT-004) - could request more if justified

assumptions:
  - Supabase free tier sufficient for MVP, will upgrade as needed
  - Developers available 100 hours/month each (full-time equivalent)
  - No major requirements changes during development
  - WordPress API is well-documented and stable

risk_mitigations:
  - 20% time buffer for unknowns and bugs
  - Weekly checkpoint meetings to track progress
  - Feature flags to enable/disable incomplete features
  - Plan for soft launch before marketing campaign

next_step: consolidate_brief
```
