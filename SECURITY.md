# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in chati.dev, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email your findings to **security@chati.dev**
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 5 business days
- **Resolution**: Depends on severity, typically within 30 days

### Scope

The following are in scope:

- Agent prompt injection vulnerabilities
- CLI installer security issues (path traversal, command injection)
- Credential exposure in generated files
- Insecure default configurations

### Out of Scope

- Vulnerabilities in third-party dependencies (report to upstream)
- Issues requiring physical access to the machine
- Social engineering attacks

## Security Best Practices

When using chati.dev:

1. Never commit `.env` files or secrets to git
2. Review generated `CLAUDE.md` before sharing projects
3. Keep your Node.js and npm versions up to date
4. Use `npx chati-dev check-update` regularly
