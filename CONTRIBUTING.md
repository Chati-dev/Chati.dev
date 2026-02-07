# Contributing to chati.dev

Welcome! Thank you for your interest in contributing to chati.dev. This guide will help you understand how to contribute effectively.

## Table of Contents

- [Quick Start](#quick-start)
- [Types of Contributions](#types-of-contributions)
- [Development Setup](#development-setup)
- [Contributing Agents](#contributing-agents)
- [Contributing Templates](#contributing-templates)
- [Contributing Workflows](#contributing-workflows)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [Getting Help](#getting-help)

---

## Quick Start

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/chati-dev.git
cd chati-dev
git remote add upstream https://github.com/ogabrielalonso/chati-dev.git
```

### 2. Create a Branch

```bash
git checkout -b feat/your-feature-name
```

### 3. Make Changes and Test

```bash
# Install CLI dependencies
cd packages/chati-dev && npm install && cd ../..

# Test your changes locally
npx chati-dev init /tmp/test-project
```

### 4. Submit a Pull Request

```bash
git add .
git commit -m "feat: description of your change"
git push origin feat/your-feature-name
```

Then open a Pull Request on GitHub.

---

## Types of Contributions

### Agents
Agent definitions live in `chati.dev/agents/`. Each agent is a Markdown file that defines the agent's identity, mission, execution steps, self-validation criteria, and output format.

### Templates
Artifact templates in `chati.dev/templates/`. YAML files that define the structure for PRDs, architectures, tasks, etc.

### Workflows
Pipeline blueprints in `chati.dev/workflows/`. YAML files that define the sequence of agents for different project types.

### Intelligence
Gotchas, patterns, and confidence data in `chati.dev/intelligence/`. Help the framework learn from common mistakes and successful strategies.

### i18n
Translations in `chati.dev/i18n/`. Currently supporting EN, PT, ES, FR.

### CLI Installer
The `packages/chati-dev/` package. ESM Node.js code for the installation wizard, dashboard, and upgrade system.

---

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Project Structure

```
chati-dev/
├── chati.dev/          # Framework core (agents, templates, workflows)
├── packages/
│   └── chati-dev/      # CLI installer package
├── .claude/
│   └── commands/       # Thin router for Claude Code
└── .github/            # GitHub templates and workflows
```

---

## Contributing Agents

When creating or modifying an agent:

1. Follow the standard agent structure (Identity, Mission, On Activation, Execution, Self-Validation, Output)
2. Include all 8 Universal Protocols (5.1-5.8)
3. Define binary pass/fail self-validation criteria
4. Include the `*help` power user table
5. Define clear handoff format for the next agent
6. Use `$ARGUMENTS` as the input placeholder

### Agent Template

```markdown
# {Name} Agent — {Subtitle}

## Identity
- **Role**: ...
- **Pipeline Position**: ...
- **Category**: CLARITY | Quality | BUILD | DEPLOY

## Mission
...

## On Activation
1. Read handoff from previous agent
2. Read session context
3. ...

## Execution: N Steps
...

## Self-Validation (Protocol 5.1)
...

## Output
...

## Input
$ARGUMENTS
```

---

## Code Standards

### Commit Messages

Use conventional commits:

```
feat: add new agent for API testing
fix: correct handoff format in Brief agent
docs: update README with new workflow
chore: update dependencies
```

### Markdown

- Use ATX headers (`#`, `##`, `###`)
- Use fenced code blocks with language identifiers
- Tables must be properly aligned
- No trailing whitespace

### JavaScript (CLI Package)

- ESM modules (`import`/`export`)
- No TypeScript (plain JS for simplicity)
- Error handling with try/catch at boundaries
- No hardcoded paths — use `join()` from `path`

---

## Pull Request Process

1. Ensure your changes don't break existing functionality
2. Update documentation if your change affects user-facing behavior
3. Fill out the PR template completely
4. Wait for review — maintainers will respond within 48 hours

### PR Checklist

- [ ] Changes follow the code standards above
- [ ] Agent changes include self-validation criteria
- [ ] New features have corresponding documentation
- [ ] No hardcoded secrets or environment-specific paths
- [ ] Commit messages follow conventional format

---

## Getting Help

- Open an [issue](https://github.com/ogabrielalonso/chati-dev/issues) for bugs or feature requests
- Start a [discussion](https://github.com/ogabrielalonso/chati-dev/discussions) for questions
- Read the existing agent files for examples of the expected format
