---
id: brief-consolidate
agent: brief
trigger: brief-constraint-identify
phase: discover
requires_input: false
parallelizable: false
outputs: [brief.yaml]
handoff_to: detail
autonomous_gate: false
criteria:
  - All requirements consolidated and prioritized
  - MVP scope clearly defined
  - User approval obtained
  - Completeness score >= 95%
---
# Consolidate Brief Document

## Purpose
Compile all requirements gathering work into a comprehensive brief document for user approval.

## Prerequisites
- `requirements-raw.yaml`
- `validation-report.yaml`
- `stakeholder-map.yaml`
- `constraints.yaml`

## Steps

### 1. Load All Artifacts
Read all prerequisite files and verify completeness.

### 2. Create Executive Summary
5-7 sentence overview covering:
- Project vision and goals
- Target users
- Key features
- Success criteria
- Timeline and budget

### 3. Consolidate Requirements
Merge and deduplicate requirements from all sources:
- Functional requirements with priorities
- Non-functional requirements with metrics
- All resolved constraints
- Success criteria

### 4. Define MVP Scope
Clearly separate:
- **MVP (Phase 1)**: Must-have features for launch
- **Phase 2**: Important but can wait
- **Future**: Nice-to-have, long-term vision

### 5. Document Personas
Include all validated personas with:
- Goals and pain points
- User journeys (high-level)
- Priority ranking

### 6. Include Stakeholder Map
Reference key stakeholders and decision makers.

### 7. Document Assumptions and Risks
- All assumptions made
- Key risks identified
- Mitigation strategies

### 8. Calculate Completeness Score
Verify all required elements present:
- Functional requirements (20%)
- Non-functional requirements (15%)
- Constraints (15%)
- Personas (15%)
- Success criteria (15%)
- MVP scope (20%)

### 9. Present to User for Approval
- Show executive summary
- Highlight MVP scope
- Point out key trade-offs made
- Ask for explicit approval

### 10. Generate Final Brief
Create polished, presentation-ready document.

## Decision Points
- **User Requests Changes**: Iterate on requirements before proceeding
- **Unclear Priorities**: Ask user to rank requirements

## Error Handling
- **Incomplete Data**: Request missing information before finalizing
- **User Unavailable for Approval**: Document and proceed with flag

## Output Format
```yaml
# brief.yaml
timestamp: 2026-02-13T14:00:00Z
status: approved
approved_by: Product Owner
approved_at: 2026-02-13T14:00:00Z

executive_summary: |
  Building a modern blogging platform for content creators to publish and
  manage posts, integrated with existing WordPress content via API. Target
  users are bloggers and site administrators. MVP includes user authentication,
  post creation/editing, full-text search, and WordPress integration. Success
  measured by 1000 users in first month and 4.5/5 satisfaction rating.
  3-month timeline with $60k budget and 2-developer team using React +
  Supabase.

project_vision: |
  Create an intuitive, fast blogging platform that empowers content creators
  to focus on writing while providing powerful tools for discovery and engagement.

functional_requirements:
  mvp:
    - FR-001: User registration with email/password
    - FR-002: User login with JWT authentication
    - FR-003: Create blog posts with title, content, tags, and images
    - FR-004: Edit and delete own posts
    - FR-005: Full-text search by keyword, tag, or author
    - FR-006: View post details
    - FR-007: Integration with WordPress API to display existing content
  phase_2:
    - FR-008: Admin moderation interface
    - FR-009: Comment system
    - FR-010: User profiles and bios
    - FR-011: Post analytics and views
  future:
    - FR-012: Social sharing
    - FR-013: Email notifications
    - FR-014: Draft auto-save
    - FR-015: Rich text editor with embeds

non_functional_requirements:
  performance:
    - NFR-001: Page load time <2 seconds (P0)
    - NFR-002: Search results in <1 second (P1)
  scalability:
    - NFR-003: Support 10,000 concurrent users (P1)
  security:
    - NFR-004: HTTPS for all connections (P0)
    - NFR-005: Password hashing with bcrypt (P0)
    - NFR-006: GDPR compliant (P0)
    - NFR-007: XSS and SQL injection protection (P0)
  usability:
    - NFR-008: Mobile responsive (P0)
    - NFR-009: Accessible (WCAG 2.1 AA) (P1)
  reliability:
    - NFR-010: 99.5% uptime (P1)

constraints:
  technical:
    - React frontend (team expertise)
    - Supabase backend (BaaS to address team skill gap)
    - WordPress API integration (existing content)
  timeline:
    - MVP launch: May 13, 2026 (3 months)
  budget:
    - Development: $60,000 (600 hours @ $100/hr)
    - Hosting: $200/month
  team:
    - 2 React developers
    - No backend expertise
  regulatory:
    - GDPR compliance required

personas:
  - name: Sarah (Content Creator)
    role: Blogger
    goals: [Write easily, Reach audience, Build following]
    pain_points: [Slow tools, Complex formatting, Poor analytics]
    priority: primary
  - name: Mike (Administrator)
    role: Site Admin
    goals: [Maintain quality, Manage users, Monitor health]
    pain_points: [Manual moderation, Limited tools]
    priority: secondary
  - name: Emily (Reader)
    role: Visitor
    goals: [Discover content, Easy reading, Save favorites]
    pain_points: [Hard to find content, Cluttered UI]
    priority: primary

success_criteria:
  business:
    - 1000 registered users in first month
    - 500 published posts in first month
  technical:
    - <2s average page load time
    - 99.5% uptime
    - Zero critical security vulnerabilities
  user:
    - 4.5/5 user satisfaction rating
    - <5 minutes to publish first post (new user)

assumptions:
  - WordPress API is stable and documented
  - Supabase free tier sufficient for MVP
  - Team available full-time (100 hours/month each)
  - No major requirement changes during development

risks:
  - risk: Team unfamiliar with Supabase
    mitigation: 1-week learning phase, thorough documentation review
  - risk: WordPress API changes
    mitigation: Implement adapter pattern for easy updates
  - risk: Scope creep
    mitigation: Strict MVP scope, feature freeze after approval

mvp_scope:
  included:
    - User authentication (registration, login, JWT)
    - Post management (create, edit, delete, view)
    - Full-text search
    - WordPress integration (read-only)
    - Mobile responsive UI
  excluded:
    - Comments (phase 2)
    - Admin moderation (phase 2)
    - Analytics (phase 2)
    - Social features (future)

estimated_effort:
  total_hours: 480
  breakdown:
    setup_and_infrastructure: 40 hours
    authentication: 60 hours
    post_management: 120 hours
    search: 60 hours
    wordpress_integration: 40 hours
    ui_ux: 100 hours
    testing: 60 hours
  buffer: 120 hours (20%)

timeline:
  start_date: 2026-02-14
  mvp_launch: 2026-05-13
  duration_weeks: 12

completeness_score: 96
approval_status: approved
next_phase: detail
handoff_note: |
  Brief approved. MVP scope defined and constrained to fit 3-month timeline
  with 2-developer team. Key trade-off: Using Supabase BaaS to address
  backend skill gap. Next step: Detail agent to expand into full PRD with
  technical specifications.
```
