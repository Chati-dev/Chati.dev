---
id: brownfield-wu-architecture-map
agent: brownfield-wu
trigger: brownfield-wu-dependency-scan
phase: discover
requires_input: false
parallelizable: true
outputs: [architecture-map.yaml]
handoff_to: brownfield-wu-risk-assess
autonomous_gate: true
criteria:
  - All architectural layers identified
  - Module boundaries documented
  - Design patterns detected
  - Coupling and cohesion assessed
---
# Map Existing Architecture

## Purpose
Analyze and document the existing architecture including layers, patterns, module boundaries, and coupling relationships.

## Prerequisites
- `discovery.yaml` exists with code organization analysis
- `dependencies.yaml` exists with framework detection
- Read access to source code

## Steps

### 1. Load Discovery Context
- Read `discovery.yaml` for architecture pattern hints
- Read `dependencies.yaml` for framework identification
- Identify primary frameworks that influence architecture

### 2. Identify Architectural Layers
Detect and document standard layers:
- **Presentation Layer**: UI components, views, pages, templates
  - Look for: `components/`, `pages/`, `views/`, `screens/`
  - Frameworks: React components, Vue components, Angular modules
- **Application Layer**: Business logic, use cases, services
  - Look for: `services/`, `useCases/`, `handlers/`, `controllers/`
  - Patterns: Service layer, CQRS, mediator pattern
- **Domain Layer**: Core business entities, domain logic
  - Look for: `domain/`, `entities/`, `models/`, `core/`
  - Patterns: Domain-driven design, rich domain models
- **Data Layer**: Database access, repositories, ORMs
  - Look for: `repositories/`, `dal/`, `db/`, `persistence/`
  - Patterns: Repository pattern, data mappers, active record
- **Infrastructure Layer**: External integrations, utilities
  - Look for: `infrastructure/`, `integrations/`, `adapters/`
  - Patterns: Adapter pattern, ports and adapters

### 3. Detect Design Patterns
Analyze code for common patterns:
- **Creational Patterns**:
  - Factory: `createX`, `XFactory` files/classes
  - Singleton: Single instance patterns, global state
  - Builder: `XBuilder` classes with fluent APIs
- **Structural Patterns**:
  - Adapter: `XAdapter` classes converting interfaces
  - Facade: Simplified interfaces over complex subsystems
  - Decorator: `withX`, HOCs in React, decorators in TypeScript
  - Proxy: API proxy layers, lazy loading
- **Behavioral Patterns**:
  - Observer: Event emitters, pub/sub, Redux stores
  - Strategy: Pluggable algorithms, dependency injection
  - Command: Command objects, undo/redo systems
  - Middleware: Express middleware, Redux middleware
- **Architectural Patterns**:
  - MVC/MVVM: Model-View-Controller/ViewModel separation
  - Layered Architecture: Clear layer separation
  - Microservices: Multiple independent services
  - Event-Driven: Event bus, message queues
  - CQRS: Separate read and write models

### 4. Map Module Boundaries
- Identify logical modules or features
- For each module, document:
  - **Purpose**: What the module does
  - **Entry Points**: Public APIs, exported functions
  - **Dependencies**: Other modules it depends on
  - **Dependents**: Other modules that depend on it
  - **Size**: Lines of code, file count
- Create dependency graph:
  - Which modules depend on which
  - Identify circular dependencies
  - Calculate coupling metrics

### 5. Assess Coupling and Cohesion
- **Afferent Coupling (Ca)**: Number of modules that depend on this module
- **Efferent Coupling (Ce)**: Number of modules this module depends on
- **Instability (I)**: Ce / (Ca + Ce) - how likely to change
- **Cohesion**: Are module responsibilities tightly related?
  - High cohesion: Single, focused responsibility
  - Low cohesion: Unrelated functionality mixed together
- Calculate metrics per module
- Identify problematic modules:
  - God modules: Very high Ca (everyone depends on it)
  - Highly unstable: Very high I
  - Low cohesion: Mixed responsibilities

### 6. Identify Communication Patterns
- **Synchronous**:
  - Direct function calls
  - REST API calls
  - GraphQL queries
  - gRPC calls
- **Asynchronous**:
  - Event emitters
  - Message queues (RabbitMQ, Kafka)
  - Webhooks
  - WebSockets
- **Data Flow**:
  - Unidirectional (Redux, Flux)
  - Bidirectional (two-way binding)
  - Props drilling depth
  - Global state vs. local state

### 7. Analyze Data Architecture
- **Database Architecture**:
  - Relational schemas: Tables, relationships, indexes
  - Document structures: Collections, schemas
  - Key-value patterns: Cache keys, session storage
- **Data Access Patterns**:
  - ORM usage (Prisma, TypeORM, Sequelize)
  - Raw SQL queries
  - Stored procedures
  - Query builders
- **Caching Strategy**:
  - In-memory caching (Redis, Memcached)
  - HTTP caching (Cache-Control headers)
  - Client-side caching (React Query, SWR)
- **Data Flow**:
  - How data moves from database to UI
  - Transformation layers
  - Validation points

### 8. Document API Architecture
- **API Style**: REST, GraphQL, gRPC, tRPC
- **Endpoint Organization**:
  - Resource-based routing
  - Action-based routing
  - Versioning strategy (URL, header, none)
- **Authentication/Authorization**:
  - JWT, OAuth, API keys, sessions
  - Permission models
  - Role-based access control
- **API Contracts**:
  - OpenAPI/Swagger specs
  - GraphQL schema
  - TypeScript types
  - Request/response validation

### 9. Identify Cross-Cutting Concerns
- **Logging**: Where and how logging happens
- **Error Handling**: Centralized vs. distributed, error boundaries
- **Authentication**: Implementation approach, where enforced
- **Authorization**: Permission checking points
- **Validation**: Input validation strategy
- **Configuration**: Environment variables, config files, feature flags
- **Monitoring**: Performance tracking, error tracking
- **Internationalization**: i18n implementation if present

### 10. Generate Architecture Diagram (Text-Based)
Create ASCII/text representation of architecture:
- Layer diagram showing vertical layers
- Component diagram showing major components
- Data flow diagram showing request/response flow
- Dependency graph showing module relationships

## Decision Points
- **Multiple Architectures**: If different parts use different patterns (e.g., legacy MVC + new React), ask which should be considered "canonical"
- **Ambiguous Patterns**: If pattern is unclear, present 2-3 possibilities and ask for user confirmation
- **Missing Documentation**: If no architecture docs exist, ask if user wants detailed analysis or high-level overview

## Error Handling
- **Inaccessible Code**: If source code cannot be read, work with available information from discovery
- **Obfuscated Code**: If code is minified or obfuscated, note limitation and skip detailed analysis
- **Inconsistent Patterns**: If multiple patterns detected for same concern, document all and flag inconsistency
- **Complex Dependencies**: If dependency graph is too complex (>100 modules), provide summary statistics instead of full graph

## Output Format
```yaml
# architecture-map.yaml
timestamp: 2026-02-13T11:30:00Z
project_path: /Users/user/projects/legacy-app

primary_architecture: layered_architecture
secondary_patterns: [mvc, repository_pattern, event_driven]

layers:
  presentation:
    directories: [src/components, src/pages, src/views]
    frameworks: [React, Next.js]
    patterns: [component_composition, hooks, hoc]
    file_count: 243
    lines_of_code: 12456
  application:
    directories: [src/services, src/api]
    patterns: [service_layer, facade]
    file_count: 87
    lines_of_code: 8234
  domain:
    directories: [src/models, src/entities]
    patterns: [anemic_domain_model]
    file_count: 45
    lines_of_code: 3421
  data:
    directories: [src/repositories, src/db]
    patterns: [repository_pattern, orm]
    file_count: 34
    lines_of_code: 2876
  infrastructure:
    directories: [src/integrations, src/utils]
    patterns: [adapter_pattern]
    file_count: 56
    lines_of_code: 4123

design_patterns:
  creational:
    - pattern: factory
      locations: [src/services/ServiceFactory.ts]
      usage: Creating service instances with dependencies
    - pattern: singleton
      locations: [src/db/connection.ts]
      usage: Database connection pool
  structural:
    - pattern: adapter
      locations: [src/integrations/paymentAdapter.ts]
      usage: Wrapping third-party payment APIs
    - pattern: decorator
      locations: [src/components/withAuth.tsx]
      usage: Higher-order component for authentication
  behavioral:
    - pattern: observer
      locations: [src/events/EventEmitter.ts]
      usage: Event-driven updates across modules
    - pattern: middleware
      locations: [src/api/middleware/]
      usage: Express middleware for logging, auth, validation

modules:
  - name: authentication
    path: src/features/auth
    purpose: User authentication and session management
    entry_points: [login, logout, register, validateToken]
    dependencies: [database, crypto, jwt]
    dependents: [user-management, api-middleware]
    files: 12
    lines_of_code: 1456
    coupling:
      afferent: 8
      efferent: 3
      instability: 0.27
    cohesion: high
  - name: user-management
    path: src/features/users
    purpose: User CRUD and profile management
    entry_points: [getUser, updateUser, deleteUser]
    dependencies: [database, authentication, validation]
    dependents: [api-routes]
    files: 15
    lines_of_code: 1876
    coupling:
      afferent: 4
      efferent: 3
      instability: 0.43
    cohesion: high
  - name: utils
    path: src/utils
    purpose: Shared utility functions (GOD MODULE WARNING)
    entry_points: [formatDate, validateEmail, generateId, parseJSON, httpRequest, etc]
    dependencies: []
    dependents: [authentication, user-management, dashboard, api-routes, etc]
    files: 23
    lines_of_code: 3421
    coupling:
      afferent: 34
      efferent: 0
      instability: 0.00
    cohesion: low

circular_dependencies:
  - modules: [api-routes, services, models]
    description: API routes import services, services import models, models import types from routes
    severity: medium
    recommendation: Extract shared types to separate module

communication_patterns:
  synchronous:
    - type: rest_api
      implementation: Express routes
      locations: [src/api/routes/]
    - type: direct_function_calls
      description: Modules call each other directly
  asynchronous:
    - type: event_emitter
      implementation: Node.js EventEmitter
      locations: [src/events/]
      usage: Background job triggers, cache invalidation

data_architecture:
  databases:
    - type: postgresql
      usage: Primary data store
      access_pattern: Prisma ORM
      schema_files: [prisma/schema.prisma]
    - type: redis
      usage: Session store, cache
      access_pattern: ioredis client
  caching:
    - layer: application
      implementation: Redis
      ttl: 300 seconds
      patterns: [cache-aside]
    - layer: client
      implementation: React Query
      stale_time: 60 seconds
  data_flow: |
    Request → Route Handler → Service Layer → Repository → Prisma → PostgreSQL
                                    ↓
                              Redis Cache (read-through)

api_architecture:
  style: REST
  versioning: none
  base_path: /api
  endpoints: 47
  authentication: JWT in Authorization header
  authorization: Role-based, checked in middleware
  validation: Zod schemas in middleware
  documentation: None (should add OpenAPI spec)

cross_cutting_concerns:
  logging:
    implementation: Winston
    locations: [src/utils/logger.ts]
    coverage: inconsistent (not all modules use it)
  error_handling:
    implementation: Express error middleware
    locations: [src/api/middleware/errorHandler.ts]
    coverage: centralized for API, scattered in frontend
  authentication:
    implementation: JWT + Passport
    enforcement: API middleware + React HOC
  validation:
    implementation: Zod
    locations: API request validation, form validation
  configuration:
    implementation: dotenv + environment variables
    locations: [src/config/index.ts]

architecture_diagram: |
  ┌─────────────────────────────────────────────────┐
  │         Presentation Layer (React/Next.js)      │
  │  Components │ Pages │ Hooks │ Context           │
  └──────────────────┬──────────────────────────────┘
                     │
  ┌──────────────────▼──────────────────────────────┐
  │         Application Layer (Services)            │
  │  AuthService │ UserService │ DashboardService   │
  └──────────────────┬──────────────────────────────┘
                     │
  ┌──────────────────▼──────────────────────────────┐
  │         Domain Layer (Models/Entities)          │
  │  User │ Session │ Dashboard                     │
  └──────────────────┬──────────────────────────────┘
                     │
  ┌──────────────────▼──────────────────────────────┐
  │         Data Layer (Repositories)               │
  │  UserRepo │ SessionRepo │ DashboardRepo         │
  └──────────────────┬──────────────────────────────┘
                     │
  ┌──────────────────▼──────────────────────────────┐
  │         Infrastructure Layer                    │
  │  PostgreSQL (Prisma) │ Redis │ External APIs    │
  └─────────────────────────────────────────────────┘

issues:
  - Circular dependency between api-routes, services, models
  - God module: utils (low cohesion, 34 dependents)
  - Inconsistent error handling between frontend and backend
  - No API documentation
  - Anemic domain models (all logic in services)
  - Mixed authentication patterns (JWT + Passport, needs consolidation)

recommendations:
  - Break up utils module into focused modules (date-utils, validation-utils, http-utils)
  - Resolve circular dependency by extracting shared types
  - Standardize error handling across all layers
  - Add OpenAPI/Swagger documentation for API
  - Consider enriching domain models with business logic
  - Consolidate authentication to single approach
  - Add architecture decision records (ADRs) for future changes
```
