---
id: ux-component-map
agent: ux
trigger: ux-user-flow
phase: plan
requires_input: false
parallelizable: false
outputs: [component-map.yaml]
handoff_to: ux-a11y-check
autonomous_gate: true
criteria:
  - Component hierarchy documented
  - Reusable components identified
  - Component props defined
---
# Map UI Component Hierarchy

## Purpose
Define reusable UI components and their hierarchy.

## Steps
Identify components:
- Atoms: Button, Input, Label, Icon
- Molecules: FormField (Label + Input + Error), PostCard
- Organisms: Header, PostList, PostForm
- Templates: AuthLayout, DashboardLayout
- Pages: HomePage, LoginPage, CreatePostPage

Document props and composition.

## Output Format
```yaml
# component-map.yaml
components:
  atoms:
    - name: Button
      props: [variant, size, onClick, children, disabled]
    - name: Input
      props: [type, value, onChange, error, placeholder]
  molecules:
    - name: FormField
      props: [label, type, value, onChange, error]
      composition: [Label, Input, ErrorMessage]
    - name: PostCard
      props: [title, excerpt, author, date, tags]
      composition: [Card, Heading, Text, TagList]
  organisms:
    - name: Header
      props: [isAuthenticated, user]
      composition: [Logo, Nav, SearchBar, UserMenu]
  pages:
    - name: HomePage
      layout: MainLayout
      components: [Header, PostList, Pagination, Footer]
```
