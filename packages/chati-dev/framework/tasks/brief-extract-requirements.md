---
id: brief-extract-requirements
agent: brief
trigger: orchestrator
phase: discover
requires_input: true
parallelizable: false
outputs: [requirements-raw.yaml]
handoff_to: brief-validate-completeness
autonomous_gate: true
criteria:
  - All 5 requirement categories populated
  - At least 5 functional requirements captured
  - At least 3 personas identified
  - Confidence >= 85%
---
# Extract Requirements from User Input

## Purpose
Extract and structure requirements from user's initial brain dump into the five core categories.

## Prerequisites
- User has provided initial project description or brain dump
- Access to user input (text, conversation history, or documents)

## Steps

### 1. Parse User Input
- Read user's brain dump or project description
- Identify key themes and topics
- Note any explicit requirements or constraints
- Flag ambiguities for follow-up questions

### 2. Extract Functional Requirements
Identify **what the system must do**:
- User actions (login, create post, search, etc.)
- System behaviors (send email, process payment, generate report)
- Business rules (user must be 18+, discount applies after 10 purchases)
- Data operations (CRUD operations, calculations, transformations)
- Integrations (third-party APIs, external systems)

Format as: **Actor + Action + Object + Context**
Example: "User can create a blog post with title, content, and tags"

Extract at least 5 functional requirements. If fewer found, ask user for more details.

### 3. Extract Non-Functional Requirements
Identify **how the system should perform**:
- **Performance**: Response time, throughput, load time targets
- **Scalability**: Expected users, data volume, growth rate
- **Availability**: Uptime requirements, maintenance windows
- **Security**: Authentication, authorization, data protection, compliance
- **Usability**: Accessibility, mobile support, user experience quality
- **Compatibility**: Browser support, device support, API versioning
- **Reliability**: Error handling, data backup, disaster recovery
- **Maintainability**: Code quality, documentation, testability

Extract at least 3 NFRs. If none mentioned, use reasonable defaults and note as assumptions.

### 4. Extract Constraints
Identify **limitations and boundaries**:
- **Technical**: Must use specific technology, existing systems to integrate with
- **Budget**: Development cost limits, hosting budget
- **Timeline**: Deadlines, milestones, MVP date
- **Team**: Team size, skills, availability
- **Regulatory**: GDPR, HIPAA, SOC2, industry regulations
- **Business**: Existing contracts, partnerships, brand guidelines
- **Operational**: Support hours, deployment frequency

Extract all explicit constraints. Flag if constraints conflict.

### 5. Identify Personas
Identify **who will use the system**:
- Role name (Admin, Customer, Manager, API Consumer)
- Goals (what they want to achieve)
- Pain points (current problems)
- Technical proficiency (novice, intermediate, expert)
- Frequency of use (daily, weekly, occasional)

Create at least 3 personas. If user hasn't mentioned, infer from functional requirements.

### 6. Define Success Criteria
Identify **how to measure success**:
- Business metrics (revenue, conversion rate, user growth)
- User metrics (engagement, satisfaction, retention)
- Technical metrics (uptime, response time, error rate)
- Project metrics (on-time delivery, budget adherence)

Extract at least 3 success criteria. If none mentioned, ask user to define.

### 7. Identify Gaps and Ambiguities
Flag areas needing clarification:
- Vague requirements ("fast", "user-friendly", "secure")
- Missing details (no authentication method specified)
- Conflicting requirements (need fast delivery but comprehensive features)
- Unclear priorities (everything is "must-have")

Prepare questions to resolve these in next step.

### 8. Structure into YAML
Organize extracted requirements into structured format:
- Group related requirements
- Number each requirement for reference
- Add notes for assumptions or uncertainties
- Mark requirements as explicit (user stated) vs. inferred

### 9. Calculate Extraction Confidence
Assess confidence (0-100) based on:
- Completeness (all categories populated)
- Clarity (requirements are specific vs. vague)
- Consistency (no conflicts)
- Sufficiency (enough detail to proceed)

### 10. Generate Clarification Questions
Create list of questions to ask user:
- Fill gaps (missing categories)
- Resolve ambiguities (vague requirements)
- Prioritize (what's MVP vs. nice-to-have)
- Validate assumptions (inferred requirements)

## Decision Points
- **Minimal Information**: If user provided <100 words, ask for more context before extracting
- **Conflicting Requirements**: Flag immediately and ask for prioritization
- **Regulated Industry**: If healthcare/finance/etc., ask about compliance needs upfront

## Error Handling
- **Empty Input**: Request user to provide project description
- **Non-English Input**: Ask user to provide in English or request translation
- **Multiple Projects**: Ask user to clarify which project to focus on
- **Too Much Information**: Summarize and ask user to confirm understanding

## Output Format
```yaml
# requirements-raw.yaml
timestamp: 2026-02-13T13:00:00Z
source: user_brain_dump

functional_requirements:
  - id: FR-001
    requirement: User can register with email and password
    actor: User
    action: register
    object: account
    context: using email and password
    source: explicit
  - id: FR-002
    requirement: User can create blog posts with title, content, tags, and images
    actor: User
    action: create
    object: blog post
    context: with title, content, tags, and images
    source: explicit
  - id: FR-003
    requirement: System sends email confirmation after registration
    actor: System
    action: send email
    object: confirmation
    context: after user registration
    source: inferred
  - id: FR-004
    requirement: Admin can moderate and delete inappropriate posts
    actor: Admin
    action: moderate and delete
    object: posts
    context: that violate community guidelines
    source: explicit
  - id: FR-005
    requirement: Users can search posts by keyword, tag, or author
    actor: User
    action: search
    object: posts
    context: by keyword, tag, or author
    source: explicit

non_functional_requirements:
  performance:
    - id: NFR-001
      requirement: Page load time must be under 2 seconds
      category: performance
      metric: page_load_time
      target: <2s
      source: explicit
  scalability:
    - id: NFR-002
      requirement: Support 10,000 concurrent users
      category: scalability
      metric: concurrent_users
      target: 10000
      source: explicit
  security:
    - id: NFR-003
      requirement: All data must be encrypted in transit and at rest
      category: security
      requirement_type: data_protection
      source: inferred
    - id: NFR-004
      requirement: GDPR compliant for EU users
      category: security
      requirement_type: compliance
      source: explicit
  usability:
    - id: NFR-005
      requirement: Mobile responsive design for all pages
      category: usability
      requirement_type: compatibility
      source: explicit

constraints:
  technical:
    - id: C-001
      constraint: Must integrate with existing WordPress blog via API
      type: technical
      impact: high
      source: explicit
  timeline:
    - id: C-002
      constraint: MVP must launch within 3 months
      type: timeline
      deadline: 2026-05-13
      source: explicit
  budget:
    - id: C-003
      constraint: Hosting budget is $200/month maximum
      type: budget
      limit: $200/month
      source: explicit
  team:
    - id: C-004
      constraint: Team of 2 developers, both familiar with React but not backend
      type: team
      size: 2
      skills: [React]
      gaps: [backend]
      source: explicit

personas:
  - id: P-001
    name: Content Creator
    role: Blogger
    goals:
      - Write and publish blog posts easily
      - Reach wide audience
      - Engage with readers through comments
    pain_points:
      - Current platform is slow and buggy
      - Difficult to format posts
      - Limited analytics
    technical_proficiency: intermediate
    frequency: daily
    priority: primary
  - id: P-002
    name: Site Administrator
    role: Admin
    goals:
      - Maintain community standards
      - Manage users and content
      - Monitor site health
    pain_points:
      - Manual moderation is time-consuming
      - No tools for bulk operations
    technical_proficiency: expert
    frequency: daily
    priority: secondary
  - id: P-003
    name: Reader
    role: Visitor
    goals:
      - Discover interesting content
      - Easy reading experience
      - Save favorite posts
    pain_points:
      - Hard to find relevant content
      - Cluttered interface
    technical_proficiency: novice
    frequency: weekly
    priority: primary

success_criteria:
  - id: SC-001
    metric: User registrations
    target: 1000 users in first month
    category: business
  - id: SC-002
    metric: Page load time
    target: <2 seconds average
    category: technical
  - id: SC-003
    metric: User satisfaction
    target: 4.5/5 rating
    category: user
  - id: SC-004
    metric: Uptime
    target: 99.5%
    category: technical

gaps_and_ambiguities:
  - gap: Authentication method not specified (JWT, session, OAuth?)
    severity: medium
    question: What authentication method should we use?
  - gap: Image upload limits not specified
    severity: low
    question: What are max image size and allowed formats?
  - gap: Moderation workflow unclear
    severity: medium
    question: Should moderation be pre-publish or post-publish?
  - gap: Search implementation not detailed
    severity: low
    question: Should search be full-text or simple keyword matching?
  - gap: Priority unclear (all requirements presented as must-have)
    severity: high
    question: Which features are MVP vs. phase 2?

assumptions:
  - Assumed GDPR compliance needed (not explicitly stated but inferred from "EU users" mention)
  - Assumed email confirmation needed for registration (standard practice)
  - Assumed HTTPS for all connections (security best practice)
  - Assumed data encryption at rest (security best practice)

confidence: 78
confidence_reasoning: |
  Good functional requirements coverage (5 FRs). Non-functional requirements
  present but some are vague. Personas identified. Major gap is prioritization
  (MVP vs. future). Authentication details missing. Overall sufficient to proceed
  to validation step where we'll fill gaps.

clarification_questions:
  - Which features are must-have for MVP vs. nice-to-have for later phases?
  - What authentication method do you prefer (JWT, session-based, OAuth)?
  - Should user content moderation be pre-publish (requires approval) or post-publish (published immediately)?
  - What are the image upload constraints (max size, allowed formats)?
  - Do you have an existing user base migrating from WordPress?
  - What analytics are most important to track?

next_steps:
  - Validate completeness of requirements
  - Ask clarification questions
  - Prioritize requirements
  - Map to MVP scope
```
