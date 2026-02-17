---
id: architect-api-design
agent: architect
trigger: architect-stack-selection
phase: plan
requires_input: false
parallelizable: false
outputs: [api-design.yaml]
handoff_to: architect-db-design
autonomous_gate: true
criteria:
  - All API endpoints specified with request/response schemas
  - RESTful conventions followed
  - Error responses documented
---
# Design API Contracts

## Purpose
Design complete API contracts with detailed request/response specifications.

## Steps
Define endpoints:
- POST /api/auth/register
- POST /api/auth/login
- GET /api/posts
- POST /api/posts
- GET /api/posts/:id
- PUT /api/posts/:id
- DELETE /api/posts/:id
- GET /api/search

For each: method, path, auth required, request schema, response schema, error codes.

Use OpenAPI/Swagger format.

## Output Format
```yaml
# api-design.yaml
openapi: 3.0.0
paths:
  /api/auth/register:
    post:
      summary: Register new user
      requestBody:
        schema:
          type: object
          properties:
            email: {type: string, format: email}
            password: {type: string, minLength: 8}
          required: [email, password]
      responses:
        201:
          description: User created
          content:
            application/json:
              schema:
                type: object
                properties:
                  user: {type: object}
                  token: {type: string}
        400: {description: Validation error}
        409: {description: Email already exists}
```
