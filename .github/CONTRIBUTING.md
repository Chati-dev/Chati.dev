# Contributing to Chati.dev

Thank you for your interest in contributing to Chati.dev. This guide covers everything you need to know — from setting up your environment to submitting a pull request.

---

## Table of Contents

- [Quick Start](#quick-start)
- [What You Can Contribute](#what-you-can-contribute)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Contributing Agents](#contributing-agents)
- [Contributing to the Intelligence Layer](#contributing-to-the-intelligence-layer)
- [Contributing Templates & Workflows](#contributing-templates--workflows)
- [Contributing Translations (i18n)](#contributing-translations-i18n)
- [Contributing to the CLI](#contributing-to-the-cli)
- [Code Standards](#code-standards)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Constitution Compliance](#constitution-compliance)
- [Getting Help](#getting-help)

---

## Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/Chati.dev.git
cd Chati.dev
git remote add upstream https://github.com/Chati-dev/Chati.dev.git

# 2. Install CLI dependencies
cd packages/chati-dev && npm install && cd ../..

# 3. Create a feature branch
git checkout -b feat/your-feature-name

# 4. Make changes, test locally
npx chati-dev init /tmp/test-project

# 5. Commit and push
git add .
git commit -m "feat: description of your change"
git push origin feat/your-feature-name
```

Then open a Pull Request on GitHub.

---

## What You Can Contribute

| Area | Location | Description |
|------|----------|-------------|
| **Agents** | `chati.dev/agents/` | Agent definitions (mission, execution, self-validation) |
| **Templates** | `chati.dev/templates/` | Artifact templates (PRD, architecture, task, QA gate) |
| **Workflows** | `chati.dev/workflows/` | Pipeline blueprints for different project types |
| **Intelligence** | `chati.dev/intelligence/` | Context Engine, Memory Layer, Decision Engine specs |
| **Schemas** | `chati.dev/schemas/` | JSON schemas for session, config, context, memory |
| **i18n** | `chati.dev/i18n/` | Translations (currently EN, PT, ES, FR) |
| **CLI** | `packages/chati-dev/` | Installer wizard, dashboard, upgrade system |
| **Constitution** | `chati.dev/constitution.md` | Governance rules (requires maintainer approval) |
| **Documentation** | `README.md`, `chati.dev/docs/` | Guides, specs, upgrade documents |

---

## Development Setup

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 9.0.0
- **Git**

### Project Structure

```
Chati.dev/
├── chati.dev/                # System core
│   ├── orchestrator/         # Main orchestrator
│   ├── agents/               # 13 agent definitions
│   ├── intelligence/         # Context Engine, Memory Layer, Decision Engine
│   ├── schemas/              # JSON schemas
│   ├── templates/            # Artifact templates
│   ├── workflows/            # Pipeline blueprints
│   ├── data/                 # Entity registry
│   └── constitution.md       # 17 Articles + Preamble
├── packages/
│   └── chati-dev/            # CLI + runtime engine (npm package)
│       ├── bin/              # Entry point
│       ├── src/              # Source code (ESM)
│       ├── test/             # Unit tests (node:test)
│       └── framework/        # Bundled framework (auto-generated)
├── docs/                     # Changelog, upgrade specs
└── .github/                  # GitHub templates and config
```

### Testing Changes Locally

```bash
# Run unit tests (944 tests)
cd packages/chati-dev
npm test

# Lint
npm run lint

# Test the installer
node bin/chati.js init /tmp/test-project

# Test the dashboard
node bin/chati.js status /tmp/test-project

# Test upgrade
node bin/chati.js upgrade /tmp/test-project

# Test health check
node bin/chati.js health /tmp/test-project

# Bundle framework (done automatically on publish)
npm run bundle

# Semantic lint (cross-reference validation)
node scripts/semantic-lint.js

# Package validation (after bundle)
node scripts/validate-package.js

# Full prepublishOnly pipeline
npm run bundle && node scripts/validate-package.js && node scripts/sign-manifest.js
```

---

## Contributing Agents

Agents live in `chati.dev/agents/{category}/`. Each agent is a Markdown file with a strict structure.

### Required Structure

```markdown
# {Name} Agent — {Subtitle}

## Identity
- **Role**: ...
- **Pipeline Position**: After {previous}, Before {next}
- **Category**: DISCOVER | PLAN | Quality | BUILD | DEPLOY

## Mission
One paragraph describing what this agent does and why.

## On Activation
1. Read handoff from previous agent
2. Read session context
3. ...

## Execution: N Steps
### Step 1: ...
### Step 2: ...

## Self-Validation (Protocol 5.1)
Define binary pass/fail criteria specific to THIS agent.

## Output
What artifacts this agent produces and where they go.

## Input
$ARGUMENTS
```

### Agent Checklist

- [ ] Follows all 8 Universal Protocols (5.1-5.8)
- [ ] Self-validation criteria are binary (pass/fail), not subjective
- [ ] Handoff format matches the Two-Layer Protocol (Article VIII)
- [ ] Uses `$ARGUMENTS` as input placeholder
- [ ] Language Protocol: interaction in user lang, artifacts in English
- [ ] Includes `*help` power user table
- [ ] Updated in entity registry (`chati.dev/data/entity-registry.yaml`)

---

## Contributing to the Intelligence Layer

The Intelligence Layer has three systems. See the individual spec files below.

### Context Engine (`chati.dev/intelligence/context-engine.md`)

- 4 brackets: FRESH, MODERATE, DEPLETED, CRITICAL
- 5 injection layers: L0 (Constitution) through L4 (Task)
- Changes must respect Article XII (Context Bracket Governance)

### Memory Layer (`chati.dev/intelligence/memory-layer.md`)

- 4 cognitive sectors: Episodic, Semantic, Procedural, Reflective
- 3 retrieval levels: Metadata, Chunks, Full
- Changes must respect Article XIII (Memory Governance)

### Decision Engine (`chati.dev/intelligence/decision-engine.md`)

- REUSE/ADAPT/CREATE decision framework
- Jaccard similarity + purpose matching
- Changes must respect Article XIV (Framework Registry Governance)

---

## Contributing Templates & Workflows

### Templates (`chati.dev/templates/`)

Templates are YAML files that define artifact structure. They are filled in by agents during execution.

```yaml
# Example: task-tmpl.yaml
metadata:
  name: Task Template
  version: "1.0"
  used_by: tasks-agent
sections:
  - id: ...
    title: ...
    content: ...
```

### Workflows (`chati.dev/workflows/`)

Workflows define agent sequences for different project types.

```yaml
# Example: greenfield-fullstack.yaml
metadata:
  name: Greenfield Fullstack
  type: greenfield
pipeline:
  - agent: greenfield-wu
  - agent: brief
  - agent: detail
  # ...
```

---

## Contributing Translations (i18n)

Translation files live in `chati.dev/i18n/`. Each language has a YAML file with all user-facing strings.

### Adding a New Language

1. Copy `chati.dev/i18n/en.yaml` to `chati.dev/i18n/{code}.yaml`
2. Translate all string values (keys remain in English)
3. Add the language code to `chati.dev/schemas/session.schema.json` in the `language` enum
4. Add CLI translations in `packages/chati-dev/src/wizard/i18n.js`
5. Update the README language table

### Translation Rules

- Keys are always in English
- Values follow the target language's grammar and conventions
- Technical terms (agent names, pipeline names) stay in English
- Error messages should be constructive: what failed + how to fix

---

## Contributing to the CLI

The CLI package lives in `packages/chati-dev/`. It's a pure ESM Node.js package.

### Key Files

| File | Purpose |
|------|---------|
| `bin/chati.js` | Entry point, command routing |
| `src/wizard/` | Installation wizard (questions, i18n, feedback) |
| `src/installer/` | Core installer logic, templates, validator |
| `src/dashboard/` | TUI dashboard (data reader, layout, renderer) |
| `src/upgrade/` | Upgrade system (checker, backup, migrator) |
| `src/config/` | IDE and MCP configurations |
| `src/terminal/` | Multi-terminal spawner, monitor, collector, prompt builder, handoff parser |
| `src/context/` | PRISM context engine (5-layer injection pipeline) |
| `src/tasks/` | Handoff management (build, save, load, format) |
| `src/utils/` | Colors, logger, detector |

### Guidelines

- ESM modules only (`import`/`export`)
- No TypeScript — plain JavaScript for simplicity
- Use `join()` from `path` — never hardcode paths
- Error handling with try/catch at system boundaries
- No external HTTP calls in core logic

---

## Code Standards

### Markdown (Agents, Templates, Docs)

- ATX headers (`#`, `##`, `###`)
- Fenced code blocks with language identifiers
- Tables properly aligned
- No trailing whitespace
- Max line length: 120 characters (soft limit)

### JavaScript (CLI Package)

- ESM modules (`import`/`export`)
- `const` by default, `let` when needed, never `var`
- Descriptive function names
- JSDoc comments for exported functions
- Error messages: `"Failed to {action}: {reason}"`

### YAML (Templates, Workflows, i18n)

- 2-space indentation
- Quoted strings for values with special characters
- Comments for non-obvious fields

---

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new API testing agent
fix: correct handoff format in Brief agent
docs: update README with Intelligence Layer
chore: update dependencies
refactor: simplify dashboard layout logic
i18n: add Japanese translations
```

### Scope (optional)

```
feat(agent): add API testing agent
fix(cli): correct version display
docs(intelligence): update context engine spec
```

---

## Pull Request Process

### Before Submitting

1. Ensure your changes don't break existing functionality
2. Test locally with `npx chati-dev init /tmp/test-project`
3. Verify the bundler works: `cd packages/chati-dev && npm run bundle`
4. Update documentation if your change affects user-facing behavior

### PR Template

Your PR should include:

- **Summary**: What changed and why (1-3 sentences)
- **Type**: Agent / Template / Workflow / Intelligence / CLI / Docs / i18n
- **Constitution compliance**: Which articles apply to your change
- **Testing**: How you verified the change works

### PR Checklist

- [ ] Follows code standards above
- [ ] Agent changes include self-validation criteria
- [ ] New features have corresponding documentation
- [ ] No hardcoded secrets or environment-specific paths
- [ ] Commit messages follow conventional format
- [ ] Entity registry updated (if adding new artifacts)
- [ ] Constitution articles respected

### Review Process

- Maintainers will respond within 48 hours
- Constitution changes require explicit maintainer approval
- Agent changes are validated against quality standards (Article II)

---

## Constitution Compliance

All contributions must comply with the [Constitution](chati.dev/constitution.md). Key articles for contributors:

| Article | Relevant To | Rule |
|---------|------------|------|
| **I** | Agents | Must have defined mission, scope, success criteria |
| **II** | All | Quality >= 95% self-validation |
| **VII** | All | Documentation and artifacts in English only |
| **VIII** | Agents | Must generate Two-Layer Handoff documents |
| **X** | Agents | Binary pass/fail criteria, not subjective |
| **XII** | Intelligence | Context brackets are calculated, not hardcoded |
| **XIII** | Intelligence | Memory capture is automatic, never modify user files |
| **XIV** | Intelligence | REUSE > ADAPT > CREATE preference |
| **XV** | All | Session lock is mandatory when session is active |
| **XVI** | All | Model governance — respect per-agent model assignments |

---

## License

This project is licensed under the [Business Source License 1.1](../LICENSE). By contributing, you agree that your contributions will be licensed under the same terms. The license converts to Apache 2.0 on 2030-02-16.

---

## Getting Help

- **Issues**: [github.com/Chati-dev/Chati.dev/issues](https://github.com/Chati-dev/Chati.dev/issues)
- **Discussions**: [github.com/Chati-dev/Chati.dev/discussions](https://github.com/Chati-dev/Chati.dev/discussions)
- **Examples**: Read existing agent files in `chati.dev/agents/` for reference
- **Intelligence**: See `chati.dev/intelligence/` for Context Engine, Memory Layer, and Decision Engine specs

---

<p align="center">
  <sub>Every contribution makes the pipeline smarter.</sub><br>
  <sub>Chati.dev &copy; 2026</sub>
</p>
