---
id: detail-consolidate
agent: detail
trigger: detail-acceptance-criteria
phase: plan
requires_input: false
parallelizable: false
outputs: [prd.yaml]
handoff_to: architect
autonomous_gate: true
criteria:
  - All detail artifacts consolidated into single PRD
  - PRD is comprehensive and ready for architecture phase
  - Completeness score >= 98%
---
# Consolidate Final PRD

## Purpose
Merge all detailed analysis into a comprehensive, production-ready Product Requirements Document.

## Prerequisites
- `brief.yaml`
- `prd-draft.yaml`
- `nfr.yaml`
- `edge-cases.yaml`
- `acceptance-criteria.yaml`

## Steps

### 1. Load All Artifacts
Read and verify all prerequisite documents.

### 2. Create PRD Structure
Standard sections:
- Executive Summary
- Project Vision and Goals
- Functional Requirements (detailed)
- Non-Functional Requirements
- Data Models
- API Specifications
- UI Specifications
- Acceptance Criteria
- Edge Cases and Error Handling
- Assumptions and Dependencies
- Success Metrics
- Glossary

### 3. Merge Functional Requirements
Combine FR details from prd-draft.yaml with acceptance criteria from acceptance-criteria.yaml.

### 4. Consolidate NFRs
Include detailed NFRs with implementation approaches.

### 5. Document Complete Data Models
Include relationships, constraints, indexes.

### 6. Specify API Contracts
Complete endpoint specifications with request/response examples.

### 7. Include All Acceptance Criteria
Link each FR to its testable criteria.

### 8. Document Edge Cases
Comprehensive error handling documentation.

### 9. Add Visual Documentation
ASCII diagrams for:
- Data model ERD
- System architecture (high-level)
- User flow diagrams

### 10. Calculate Completeness Score
Verify all required sections present and detailed.

## Decision Points
None - consolidation is mechanical.

## Error Handling
- **Missing Sections**: Flag and request completion of prerequisite tasks

## Output Format
```yaml
# prd.yaml
document_type: Product Requirements Document
version: 1.0
timestamp: 2026-02-13T16:00:00Z
status: complete
completeness_score: 98

executive_summary: |
  [Full summary from brief, enhanced with technical details]

project_vision: |
  [Vision statement]

goals:
  business: [List of business goals]
  technical: [List of technical goals]
  user: [List of user goals]

functional_requirements:
  [Complete FR list with all details, acceptance criteria, edge cases]

non_functional_requirements:
  [Complete NFR list with metrics and implementation]

data_models:
  [Complete data model specifications]

api_specifications:
  [Complete API endpoint documentation]

ui_specifications:
  [Complete UI screen definitions]

acceptance_criteria:
  [All Given-When-Then scenarios]

edge_cases:
  [All edge case handling]

assumptions:
  [List of all assumptions]

dependencies:
  [External dependencies and integrations]

success_metrics:
  [Measurable success criteria]

glossary:
  [Terms and definitions]

next_phase: architecture
handoff_note: |
  PRD complete with comprehensive functional and non-functional requirements,
  acceptance criteria, and edge case handling. Ready for architecture design.
```
