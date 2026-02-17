---
id: greenfield-wu-tech-stack-assess
agent: greenfield-wu
trigger: greenfield-wu-scaffold-detection
phase: discover
requires_input: true
parallelizable: false
outputs: [tech-stack.yaml]
handoff_to: greenfield-wu-report
autonomous_gate: true
criteria:
  - All layers of stack identified (frontend, backend, database, infrastructure)
  - Technology choices justified with reasoning
  - Compatibility matrix verified
---
# Assess and Recommend Tech Stack

## Purpose
Evaluate project requirements and recommend a complete technology stack across all layers of the application architecture.

## Prerequisites
- `wu-analysis.yaml` with runtime detection
- `scaffold-report.yaml` with scaffolding recommendations
- User requirements or brain dump available

## Steps

### 1. Extract Requirements Context
- Load existing requirement information if available
- Identify key constraints:
  - Performance requirements (latency, throughput)
  - Scale expectations (users, data volume)
  - Team expertise (what they already know)
  - Budget constraints (hosting costs, licensing)
  - Time constraints (MVP timeline)
  - Compliance needs (GDPR, HIPAA, SOC2)

### 2. Define Application Layers
Identify which layers are needed:
- **Frontend**: Web UI, mobile app, desktop app
- **Backend**: API server, business logic, authentication
- **Database**: Primary data store, cache, search engine
- **File Storage**: Object storage, CDN
- **Message Queue**: Async processing, event streaming
- **Infrastructure**: Hosting, containers, orchestration, CI/CD
- **Monitoring**: Logging, metrics, tracing, alerting

### 3. Evaluate Frontend Stack
If frontend is required, recommend:
- **Framework**: React, Vue, Angular, Svelte, Solid
  - Consider: team expertise, ecosystem size, performance needs, TypeScript support
- **UI Library**: Material-UI, Ant Design, Chakra UI, shadcn/ui, Tailwind CSS
  - Consider: design system needs, customization level, bundle size
- **State Management**: Redux, Zustand, Jotai, TanStack Query, Context API
  - Consider: complexity, server state vs. client state
- **Routing**: React Router, Next.js routing, TanStack Router
- **Build Tool**: Vite, webpack, Turbopack, esbuild
- **Testing**: Vitest, Jest, React Testing Library, Playwright, Cypress

### 4. Evaluate Backend Stack
If backend is required, recommend:
- **Language/Runtime**: Node.js, Python, Go, Rust, Java
  - Consider: team expertise, performance needs, ecosystem, concurrency model
- **Framework**: Express, Fastify, NestJS (Node); FastAPI, Django (Python); Gin (Go)
  - Consider: structure needs, built-in features, community
- **API Style**: REST, GraphQL, gRPC, tRPC
  - Consider: client flexibility needs, type safety, performance
- **Authentication**: JWT, OAuth2, Passport, Auth0, Clerk, NextAuth
- **Validation**: Zod, Yup, Joi, Pydantic
- **ORM/Query Builder**: Prisma, Drizzle, TypeORM, SQLAlchemy, GORM

### 5. Evaluate Database Stack
Recommend database(s) based on data patterns:
- **Relational (ACID, structured data)**:
  - PostgreSQL (recommended for most cases)
  - MySQL/MariaDB
  - SQLite (development, edge deployments)
- **Document (flexible schema)**:
  - MongoDB
  - CouchDB
- **Key-Value (cache, sessions)**:
  - Redis (recommended)
  - Memcached
- **Search Engine**:
  - Elasticsearch
  - Meilisearch (simpler alternative)
  - Typesense
- **Time-Series**:
  - TimescaleDB (PostgreSQL extension)
  - InfluxDB
- **Graph**:
  - Neo4j
  - Amazon Neptune

### 6. Evaluate Infrastructure Stack
Recommend hosting and deployment:
- **Hosting Platform**:
  - Vercel (frontend, serverless)
  - Netlify (frontend, edge functions)
  - Railway (fullstack, simple)
  - Fly.io (global deployment)
  - AWS/GCP/Azure (enterprise scale)
  - DigitalOcean (balance of simplicity and control)
- **Containerization**:
  - Docker (development consistency)
  - Docker Compose (local multi-service)
- **Orchestration** (if scale requires):
  - Kubernetes
  - AWS ECS/Fargate
- **CI/CD**:
  - GitHub Actions (recommended)
  - GitLab CI
  - CircleCI
- **CDN**:
  - Cloudflare (recommended for most)
  - AWS CloudFront

### 7. Verify Compatibility Matrix
Check for known compatibility issues:
- Runtime version support (e.g., Node 22 + specific packages)
- Framework version conflicts
- Database driver versions
- TypeScript version alignment across tools
- Build tool compatibility with libraries

### 8. Calculate Total Cost of Ownership
Estimate costs across:
- **Development Time**: Learning curve, productivity
- **Hosting Costs**: Free tier, startup tier ($0-100/mo), scale tier ($100-1000/mo)
- **Maintenance Burden**: Update frequency, breaking changes, security patches
- **Vendor Lock-in**: Migration difficulty if switching later

### 9. Justify Each Choice
For each major technology decision, provide:
- **Why This**: Specific reasons for choosing this technology
- **Why Not Alternatives**: What alternatives were considered and why rejected
- **Risks**: Known issues, limitations, or concerns
- **Mitigation**: How to address the risks

### 10. Create Migration Path
If user has existing stack, document:
- What can be kept vs. what should change
- Migration strategy (big bang vs. incremental)
- Compatibility bridges needed
- Estimated migration effort

## Decision Points
- **Team Expertise vs. Best Tool**: Ask user to choose between familiar but suboptimal tech vs. learning curve for better tech
- **Build vs. Buy**: For authentication, payments, email, etc., ask if user prefers self-hosted or SaaS
- **Polyglot vs. Monoglot**: If multiple languages would be optimal, ask if team can handle polyglot architecture
- **SQL vs. NoSQL**: If data model is ambiguous, present trade-offs and ask user preference

## Error Handling
- **Conflicting Requirements**: If performance and simplicity conflict (e.g., need for extreme performance but small team), flag the conflict and ask user to prioritize
- **Unsupported Combination**: If user requests incompatible technologies (e.g., specific framework version + specific runtime version), explain incompatibility and offer alternatives
- **Budget Constraints**: If recommended stack exceeds budget, provide tiered alternatives (MVP stack vs. scale stack)
- **Knowledge Gaps**: If team lacks expertise in recommended tech, flag as risk and suggest training resources or alternative choices

## Output Format
```yaml
# tech-stack.yaml
project_type: web_application_fullstack
layers:
  frontend:
    framework:
      name: React
      version: "18.2.0"
      justification: |
        Largest ecosystem, strong TypeScript support, team familiarity.
        Component model aligns well with design system needs.
      alternatives_considered:
        - name: Vue
          why_not: Smaller ecosystem for complex UI component libraries
        - name: Svelte
          why_not: Team has no experience, would slow initial development
    ui_library:
      name: shadcn/ui
      justification: Unstyled, accessible components that can be customized. Not a dependency, code is owned.
    state_management:
      name: TanStack Query
      justification: Server state management with caching. Reduces need for global state.
    routing:
      name: React Router
      version: "6.x"
    build_tool:
      name: Vite
      justification: Fast HMR, modern ESM-based, excellent DX
    testing:
      unit: Vitest
      integration: React Testing Library
      e2e: Playwright
  backend:
    runtime:
      name: Node.js
      version: "22.x LTS"
      justification: Team expertise, shared TypeScript across stack, large ecosystem
    framework:
      name: Fastify
      justification: Faster than Express, built-in schema validation, TypeScript-first
    api_style: REST
    authentication:
      name: Clerk
      justification: Managed auth service, reduces security burden, good DX
      self_hosted_alternative: Passport + JWT
    validation:
      name: Zod
      justification: TypeScript-first, runtime validation, type inference
    orm:
      name: Prisma
      justification: Type-safe queries, excellent migration tooling, great DX
  database:
    primary:
      name: PostgreSQL
      version: "16"
      justification: ACID compliance, JSON support, full-text search, mature ecosystem
    cache:
      name: Redis
      version: "7"
      justification: Fast in-memory cache, pub/sub for real-time features
  infrastructure:
    hosting:
      frontend: Vercel
      backend: Railway
      justification: |
        Vercel offers excellent Next.js/React DX and global CDN.
        Railway provides simple database + backend hosting with good developer experience.
    ci_cd: GitHub Actions
    cdn: Cloudflare (Vercel's default)
    monitoring:
      logging: Vercel logs + Railway logs
      metrics: Prometheus (future)
      errors: Sentry
compatibility_matrix:
  node_22:
    fastify: ✓ (v4+)
    prisma: ✓ (v5+)
    zod: ✓
  prisma_5:
    postgres_16: ✓
    typescript_5: ✓
cost_estimate:
  development: Low (familiar stack, good DX)
  hosting_mvp: $50-100/month (Vercel hobby + Railway starter + Clerk free tier)
  hosting_scale: $500-1000/month (Vercel pro + Railway standard + Clerk growth)
  maintenance: Medium (regular updates needed for Node ecosystem)
risks:
  - risk: Node.js single-threaded may bottleneck under extreme load
    mitigation: Use clustering, consider microservices for compute-heavy tasks
  - risk: Vercel vendor lock-in for serverless patterns
    mitigation: Keep backend logic framework-agnostic, can migrate to containers
  - risk: Rapid deprecation in JavaScript ecosystem
    mitigation: Choose mature, well-maintained libraries; pin versions carefully
migration_path: null
timestamp: 2026-02-13T10:40:00Z
```
