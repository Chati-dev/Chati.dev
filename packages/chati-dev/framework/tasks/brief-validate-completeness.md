---
id: brief-validate-completeness
agent: brief
trigger: brief-extract-requirements
phase: discover
requires_input: true
parallelizable: false
outputs: [validation-report.yaml]
handoff_to: brief-stakeholder-map
autonomous_gate: false
criteria:
  - All 5 requirement categories reviewed
  - Missing categories filled with user input
  - Validation score >= 90%
---
# Validate Completeness of Requirements

## Purpose
Verify all requirement categories are sufficiently populated and ask user to fill any gaps.

## Prerequisites
- `requirements-raw.yaml` exists with extracted requirements

## Steps

### 1. Load Raw Requirements
- Read `requirements-raw.yaml`
- Count requirements in each category
- Identify empty or sparse categories

### 2. Validate Functional Requirements
- **Minimum**: 5 FRs required
- Check coverage of CRUD operations
- Verify user workflows are complete
- Flag missing authentication/authorization requirements
- Ask user for missing critical functions

### 3. Validate Non-Functional Requirements
- **Minimum**: 3 NFRs required across different categories
- Check for: performance, scalability, security, usability
- Use defaults if user hasn't specified:
  - Performance: <3s page load
  - Security: HTTPS, encrypted passwords
  - Availability: 99% uptime
- Document assumptions

### 4. Validate Constraints
- Check for timeline, budget, technical, team constraints
- If missing, ask user to specify
- Flag if constraints are unrealistic (1 week for complex app)

### 5. Validate Personas
- **Minimum**: 2 personas required
- Ensure at least one primary persona
- Check personas have goals and pain points
- Ask user to elaborate if personas are shallow

### 6. Validate Success Criteria
- **Minimum**: 3 success criteria covering business, technical, and user metrics
- Ensure criteria are measurable (not "make users happy")
- Ask user to define if missing

### 7. Ask Clarification Questions
- Present questions from requirements-raw.yaml
- Collect user responses
- Update requirements with answers

### 8. Calculate Validation Score
- Score = (categories_complete / 5) × (avg_requirements_per_category / minimum) × 100
- Must reach 90% to pass

### 9. Update Requirements
- Incorporate user feedback
- Fill gaps
- Resolve ambiguities

### 10. Generate Validation Report
- Document completeness
- List remaining gaps
- Provide updated requirements

## Decision Points
- **Low Score (<70%)**: Ask if user needs more time to think about requirements
- **Conflicting Answers**: Ask user to resolve conflicts

## Error Handling
- **User Unavailable**: Document gaps and proceed with assumptions (flag for later review)
- **Vague Answers**: Ask follow-up questions for specificity

## Output Format
```yaml
# validation-report.yaml
timestamp: 2026-02-13T13:15:00Z
validation_score: 92

category_completeness:
  functional: 100 (8 requirements)
  non_functional: 100 (6 requirements)
  constraints: 80 (4 requirements, budget and regulatory missing)
  personas: 100 (3 personas)
  success_criteria: 100 (4 criteria)

gaps_filled:
  - Added authentication method: JWT
  - Added moderation workflow: post-publish with flagging
  - Added MVP scope: user registration, posting, search only
  - Added image constraints: 5MB max, JPG/PNG only

remaining_gaps:
  - Hosting budget not specified (assumed $200/month)
  - No regulatory constraints mentioned (assumed none)

updated_requirements_count:
  functional: 8
  non_functional: 6
  constraints: 4
  personas: 3
  success_criteria: 4

next_step: stakeholder_mapping
```
