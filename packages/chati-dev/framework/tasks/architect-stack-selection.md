---
id: architect-stack-selection
agent: architect
trigger: architect-design
phase: plan
requires_input: false
parallelizable: false
outputs: [stack-selection.yaml]
handoff_to: architect-api-design
autonomous_gate: true
criteria:
  - Specific technologies chosen for each layer
  - Choices justified with technical reasoning
  - Compatibility verified
---
# Select Technology Stack

## Purpose
Choose specific technologies for each architectural layer based on requirements and constraints.

## Steps
From brief: React frontend, Supabase backend (BaaS), PostgreSQL database.

Expand with specific versions and libraries:
- Frontend: React 18.2, Vite 5.x, TypeScript 5.x, TanStack Query, React Hook Form, Zod
- Backend: Supabase (auth, database, storage)
- Database: PostgreSQL 15+ (via Supabase)
- UI: Tailwind CSS, Headless UI
- Testing: Vitest, React Testing Library, Playwright

Document rationale for each choice.

## Output Format
```yaml
# stack-selection.yaml
frontend:
  framework: React 18.2 (team expertise, large ecosystem)
  build_tool: Vite 5 (fast HMR, modern)
  language: TypeScript 5 (type safety)
  state: TanStack Query (server state caching)
  forms: React Hook Form (performance)
  validation: Zod (runtime validation, type inference)
  ui: Tailwind CSS (utility-first, rapid development)
backend:
  platform: Supabase (BaaS, addresses team skill gap)
  auth: Supabase Auth (JWT-based)
  database: PostgreSQL 15 (via Supabase)
  storage: Supabase Storage (image uploads)
testing:
  unit: Vitest (Vite-native, fast)
  integration: React Testing Library
  e2e: Playwright (cross-browser)
```
