---
id: phases-mvp-scoping
agent: phases
trigger: phases-dependency-mapping
phase: plan
requires_input: false
parallelizable: false
outputs: [mvp-scope.yaml]
handoff_to: tasks
autonomous_gate: true
criteria:
  - MVP scope clearly defined with cut line
  - Justification provided for inclusions/exclusions
  - MVP delivers user value
---
# Define MVP Scope and Cut Line

## Purpose
Precisely define what is in and out of MVP, with clear justification.

## Steps

### 1. Review Phase 1 Features
Ensure MVP includes minimum features to deliver value.

### 2. Apply MVP Criteria
Feature is MVP if:
- Required for core user journey (register → create post → view post)
- Blocks other features
- Critical for launch (authentication, security)

Feature is NOT MVP if:
- Nice-to-have enhancement
- Can be added later without refactoring
- Low user impact

### 3. Define Cut Line
Explicit list of included vs excluded features.

### 4. Justify Exclusions
Why each excluded feature is not MVP.

### 5. Validate MVP Delivers Value
Can user accomplish meaningful tasks with MVP alone?

## Output Format
```yaml
# mvp-scope.yaml
mvp_definition: |
  Minimum set of features that allow users to register, create and publish
  blog posts, search for posts, and view posts. WordPress integration included
  to show existing content alongside new posts.

included_in_mvp:
  - FR-001: User registration
    justification: Must have accounts to create posts
  - FR-002: User login
    justification: Must authenticate to create posts
  - FR-003: Create posts
    justification: Core value proposition
  - FR-004: Edit/delete posts
    justification: Users need to fix mistakes
  - FR-005: Search posts
    justification: Discoverability is critical
  - FR-006: View posts
    justification: Can't have blog without reading posts
  - FR-007: WordPress integration
    justification: Business requirement to show existing content

excluded_from_mvp:
  - FR-008: Comments
    justification: Engagement feature, not required for core journey. Can add in phase 2 without major refactoring.
  - FR-009: Admin moderation
    justification: Low initial traffic means manual moderation acceptable. Can add when needed.
  - FR-010: User profiles
    justification: Nice-to-have, not required to publish posts.
  - FR-011: Analytics
    justification: Can add tracking later, doesn't block launch.
  - Social sharing
    justification: Growth feature, not required for MVP.

mvp_user_value: |
  With MVP, users can:
  1. Create an account
  2. Write and publish blog posts with rich content and images
  3. Edit their posts after publishing
  4. Search for posts by keyword or tag
  5. Read posts from new platform and existing WordPress blog
  
  This delivers core blogging functionality and replaces existing WordPress
  admin interface with modern, faster experience.

next_phase: tasks
```
