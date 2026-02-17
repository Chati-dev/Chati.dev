---
id: architect-db-design
agent: architect
trigger: architect-api-design
phase: plan
requires_input: false
parallelizable: false
outputs: [db-design.yaml]
handoff_to: architect-security-review
autonomous_gate: true
criteria:
  - Database schema defined with all tables and relationships
  - Indexes specified for query optimization
  - Constraints documented
---
# Design Database Schema

## Purpose
Create complete database schema with tables, relationships, indexes, and constraints.

## Steps
Define tables:
- users (id, email, password_hash, created_at, updated_at)
- posts (id, user_id, title, content, tags, image_urls, published_at, created_at, updated_at)

Define indexes:
- users.email (unique)
- posts.user_id (foreign key, indexed)
- posts.published_at (for sorting)
- posts.tags (GIN index for array search in PostgreSQL)

Document relationships and cascade rules.

## Output Format
```yaml
# db-design.yaml
tables:
  users:
    columns:
      id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
      email: text UNIQUE NOT NULL
      password_hash: text NOT NULL
      created_at: timestamp with time zone DEFAULT now()
      updated_at: timestamp with time zone DEFAULT now()
    indexes:
      - name: idx_users_email
        columns: [email]
        unique: true
  posts:
    columns:
      id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
      user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
      title: text NOT NULL CHECK (length(title) <= 200)
      content: text NOT NULL
      tags: text[] DEFAULT '{}'
      image_urls: text[] DEFAULT '{}'
      published_at: timestamp with time zone
      created_at: timestamp with time zone DEFAULT now()
      updated_at: timestamp with time zone DEFAULT now()
    indexes:
      - name: idx_posts_user_id
        columns: [user_id]
      - name: idx_posts_published_at
        columns: [published_at]
      - name: idx_posts_tags
        columns: [tags]
        type: GIN
relationships:
  - from: posts.user_id
    to: users.id
    type: many_to_one
    on_delete: CASCADE
```
