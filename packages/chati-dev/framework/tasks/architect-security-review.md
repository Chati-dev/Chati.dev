---
id: architect-security-review
agent: architect
trigger: architect-db-design
phase: plan
requires_input: false
parallelizable: false
outputs: [security-review.yaml]
handoff_to: architect-consolidate
autonomous_gate: true
criteria:
  - OWASP Top 10 threats addressed
  - Authentication and authorization design reviewed
  - Data protection measures defined
---
# Security Architecture Review

## Purpose
Review architecture for security vulnerabilities and define protection measures.

## Steps
Address OWASP Top 10:
1. Injection: Parameterized queries (Supabase handles)
2. Broken Auth: JWT with expiration, bcrypt password hashing
3. Sensitive Data Exposure: HTTPS, encrypted passwords
4. XML External Entities: N/A (no XML)
5. Broken Access Control: Authorization checks in API
6. Security Misconfiguration: Security headers, CSP
7. XSS: Content sanitization, CSP headers
8. Insecure Deserialization: N/A (JSON only)
9. Using Components with Known Vulnerabilities: Dependency scanning
10. Insufficient Logging: Structured logging, audit trail

Document authentication flow, authorization matrix, data encryption.

## Output Format
```yaml
# security-review.yaml
owasp_top_10:
  injection:
    mitigation: Supabase uses parameterized queries
  broken_auth:
    mitigation: JWT with 7-day expiry, bcrypt hashing (12 rounds)
  sensitive_data:
    mitigation: HTTPS only, passwords hashed, no plaintext secrets
  xss:
    mitigation: React escapes by default, CSP headers
  broken_access_control:
    mitigation: Authorization middleware checks user_id match
authentication_flow:
  - User submits credentials
  - Server validates against database
  - JWT issued with user_id claim
  - Client stores in localStorage
  - Client includes in Authorization header
  - Server validates signature and expiration
authorization_matrix:
  create_post: authenticated user
  edit_post: post owner only
  delete_post: post owner only
  view_post: anyone (if published)
```
