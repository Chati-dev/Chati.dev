---
id: detail-nfr-extraction
agent: detail
trigger: detail-expand-prd
phase: plan
requires_input: false
parallelizable: true
outputs: [nfr.yaml]
handoff_to: detail-edge-case-analysis
autonomous_gate: true
criteria:
  - All NFR categories covered (performance, security, scalability, usability, reliability)
  - Measurable metrics defined for each NFR
  - Implementation approach outlined
---
# Extract and Detail Non-Functional Requirements

## Purpose
Expand high-level NFRs from brief into detailed, measurable technical specifications.

## Prerequisites
- `brief.yaml` with initial NFRs
- `prd-draft.yaml` for context

## Steps

### 1. Analyze Brief NFRs
Load and categorize existing NFRs into standard categories.

### 2. Define Performance NFRs
- **Response Time**: API endpoints <200ms p50, <500ms p95
- **Page Load**: Initial load <2s, subsequent <1s
- **Time to Interactive**: <3s on 3G network
- **Database Queries**: <100ms for simple queries, <500ms for complex
- **Search**: Results in <1s for 100k posts
- **Concurrent Users**: 10k concurrent without degradation

### 3. Define Security NFRs
- **Authentication**: JWT with 7-day expiration, refresh token support
- **Password Storage**: Bcrypt with 12 rounds
- **HTTPS**: All traffic encrypted (TLS 1.3)
- **XSS Protection**: Content Security Policy headers
- **SQL Injection**: Parameterized queries only
- **CSRF**: Token-based protection
- **Rate Limiting**: 100 req/min per IP, 1000 req/min per user
- **GDPR**: Data export, deletion, consent management

### 4. Define Scalability NFRs
- **Horizontal Scaling**: Stateless API for easy scaling
- **Database**: Connection pooling, read replicas (future)
- **Caching**: Redis for frequently accessed data
- **CDN**: Static assets served from CDN
- **Data Growth**: Support 1M posts, 100k users

### 5. Define Usability NFRs
- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile**: Responsive design, works on screens ≥320px
- **Browser Support**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Internationalization**: UI prepared for i18n (future)
- **Error Messages**: Clear, actionable, user-friendly

### 6. Define Reliability NFRs
- **Uptime**: 99.5% (43 hours downtime/year)
- **Backup**: Daily automated backups, 30-day retention
- **Error Recovery**: Graceful degradation, retry logic
- **Data Integrity**: Transactions for critical operations
- **Monitoring**: Uptime checks every minute

### 7. Define Maintainability NFRs
- **Code Coverage**: >80% test coverage
- **Documentation**: API docs, README, architecture docs
- **Logging**: Structured logging with correlation IDs
- **Deployment**: Zero-downtime deployments
- **Observability**: Metrics, traces, logs

### 8. Add Measurable Metrics
For each NFR, define:
- Metric name (response_time_p95)
- Target value (500ms)
- Measurement method (APM tool)
- Acceptance criteria (pass/fail threshold)

### 9. Outline Implementation Approaches
For each NFR category, suggest technical approaches.

### 10. Generate NFR Document
Comprehensive, measurable NFR specifications.

## Decision Points
None - autonomous based on best practices.

## Error Handling
- **Conflicting NFRs**: Note conflict and recommend resolution

## Output Format
```yaml
# nfr.yaml
timestamp: 2026-02-13T15:00:00Z

performance:
  - id: NFR-PERF-001
    requirement: API response time <200ms (p50), <500ms (p95)
    metric: api_response_time
    target_p50: 200ms
    target_p95: 500ms
    measurement: APM tool (Datadog, New Relic, or Prometheus)
    implementation:
      - Optimize database queries with indexes
      - Use connection pooling
      - Implement caching for frequently accessed data
      - Use efficient data serialization (JSON)
  - id: NFR-PERF-002
    requirement: Initial page load <2s, subsequent <1s
    metric: page_load_time
    target_initial: 2s
    target_subsequent: 1s
    measurement: Lighthouse, WebPageTest
    implementation:
      - Code splitting and lazy loading
      - Image optimization and lazy loading
      - Asset minification and compression (gzip/brotli)
      - CDN for static assets
      - Service Worker caching

security:
  - id: NFR-SEC-001
    requirement: All connections use HTTPS with TLS 1.3
    implementation: Configure hosting provider for HTTPS, redirect HTTP → HTTPS
  - id: NFR-SEC-002
    requirement: Passwords hashed with bcrypt (12 rounds)
    implementation: Use bcrypt library, never store plaintext passwords
  - id: NFR-SEC-003
    requirement: JWT authentication with 7-day expiration
    implementation: Use jsonwebtoken library, include expiration claim
  - id: NFR-SEC-004
    requirement: Rate limiting (100 req/min per IP, 1000/min per user)
    implementation: Use express-rate-limit middleware
  - id: NFR-SEC-005
    requirement: GDPR compliance (data export, deletion, consent)
    implementation:
      - API endpoint for data export (JSON format)
      - Soft delete with cascading to related data
      - Consent management UI
      - Cookie banner for analytics (future)

scalability:
  - id: NFR-SCALE-001
    requirement: Support 10,000 concurrent users
    metric: concurrent_users
    target: 10000
    implementation:
      - Stateless API design
      - Database connection pooling (max 100 connections)
      - Horizontal scaling via load balancer
  - id: NFR-SCALE-002
    requirement: Handle 1M posts, 100k users
    metric: data_volume
    target: 1M posts, 100k users
    implementation:
      - Database indexing on frequently queried columns
      - Pagination for list endpoints
      - Archive old data (posts >3 years)

usability:
  - id: NFR-USA-001
    requirement: WCAG 2.1 AA accessibility compliance
    measurement: Lighthouse accessibility score >90, manual testing
    implementation:
      - Semantic HTML
      - ARIA labels on interactive elements
      - Keyboard navigation support
      - Sufficient color contrast (4.5:1)
      - Alt text for all images
  - id: NFR-USA-002
    requirement: Mobile responsive (320px+)
    measurement: Test on real devices and browser DevTools
    implementation:
      - Mobile-first CSS
      - Responsive breakpoints (320, 768, 1024, 1440)
      - Touch-friendly targets (44×44px minimum)

reliability:
  - id: NFR-REL-001
    requirement: 99.5% uptime (max 43 hours downtime/year)
    metric: uptime_percentage
    target: 99.5%
    measurement: Uptime monitoring service (UptimeRobot, Pingdom)
    implementation:
      - Health check endpoint (/api/health)
      - Automated failover
      - Zero-downtime deployments
  - id: NFR-REL-002
    requirement: Daily automated backups with 30-day retention
    implementation: Supabase automated backups, test recovery quarterly

maintainability:
  - id: NFR-MAINT-001
    requirement: >80% test coverage
    metric: code_coverage
    target: 80%
    measurement: Coverage tool (Istanbul, c8)
  - id: NFR-MAINT-002
    requirement: Zero-downtime deployments
    implementation: Blue-green deployment or rolling updates

implementation_priority:
  p0_must_have:
    - HTTPS encryption
    - Password hashing
    - JWT authentication
    - Rate limiting
    - WCAG compliance
    - Mobile responsive
  p1_should_have:
    - Performance targets
    - Backup strategy
    - Monitoring
    - Test coverage
  p2_nice_to_have:
    - Advanced caching
    - CDN
    - Read replicas
```
