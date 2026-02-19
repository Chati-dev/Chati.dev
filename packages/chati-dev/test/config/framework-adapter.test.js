import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adaptFrameworkFile, ADAPTABLE_FILES } from '../../src/config/framework-adapter.js';
import { PROVIDER_MODEL_MAPS } from '../../src/installer/templates.js';

// ---------------------------------------------------------------------------
// ADAPTABLE_FILES metadata
// ---------------------------------------------------------------------------

describe('ADAPTABLE_FILES', () => {
  it('contains exactly 16 files', () => {
    assert.equal(ADAPTABLE_FILES.size, 16);
  });

  it('includes the orchestrator', () => {
    assert.ok(ADAPTABLE_FILES.has('orchestrator/chati.md'));
  });

  it('includes all 12 agent files', () => {
    const agents = [
      'agents/discover/greenfield-wu.md',
      'agents/discover/brownfield-wu.md',
      'agents/discover/brief.md',
      'agents/plan/detail.md',
      'agents/plan/architect.md',
      'agents/plan/ux.md',
      'agents/plan/phases.md',
      'agents/plan/tasks.md',
      'agents/quality/qa-planning.md',
      'agents/quality/qa-implementation.md',
      'agents/build/dev.md',
      'agents/deploy/devops.md',
    ];
    for (const agent of agents) {
      assert.ok(ADAPTABLE_FILES.has(agent), `Missing: ${agent}`);
    }
  });

  it('includes context files', () => {
    assert.ok(ADAPTABLE_FILES.has('context/governance.md'));
    assert.ok(ADAPTABLE_FILES.has('context/root.md'));
  });

  it('includes constitution', () => {
    assert.ok(ADAPTABLE_FILES.has('constitution.md'));
  });

  it('does NOT include non-adaptable files', () => {
    assert.ok(!ADAPTABLE_FILES.has('config.yaml'));
    assert.ok(!ADAPTABLE_FILES.has('domains/global.yaml'));
    assert.ok(!ADAPTABLE_FILES.has('hooks/prism-engine.js'));
    assert.ok(!ADAPTABLE_FILES.has('templates/prd-tmpl.yaml'));
  });
});

// ---------------------------------------------------------------------------
// Claude passthrough (no changes)
// ---------------------------------------------------------------------------

describe('adaptFrameworkFile — claude passthrough', () => {
  it('returns identical content for claude provider', () => {
    const content = 'Read CLAUDE.md and use opus model via Claude Code';
    assert.equal(adaptFrameworkFile(content, 'orchestrator/chati.md', 'claude'), content);
  });

  it('returns empty string unchanged', () => {
    assert.equal(adaptFrameworkFile('', 'orchestrator/chati.md', 'claude'), '');
  });

  it('returns null/undefined unchanged', () => {
    assert.equal(adaptFrameworkFile(null, 'orchestrator/chati.md', 'claude'), null);
    assert.equal(adaptFrameworkFile(undefined, 'orchestrator/chati.md', 'claude'), undefined);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('adaptFrameworkFile — edge cases', () => {
  it('handles empty content for non-claude provider', () => {
    assert.equal(adaptFrameworkFile('', 'orchestrator/chati.md', 'gemini'), '');
  });

  it('handles null content for non-claude provider', () => {
    assert.equal(adaptFrameworkFile(null, 'orchestrator/chati.md', 'gemini'), null);
  });

  it('throws for unknown provider', () => {
    assert.throws(
      () => adaptFrameworkFile('content', 'orchestrator/chati.md', 'unknown-provider'),
      /Unknown provider/
    );
  });
});

// ---------------------------------------------------------------------------
// Gemini provider adaptations
// ---------------------------------------------------------------------------

describe('adaptFrameworkFile — gemini', () => {
  const provider = 'gemini';

  it('replaces CLAUDE.local.md with .chati/session.yaml', () => {
    const content = 'Read CLAUDE.local.md for session state';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', provider);
    assert.ok(result.includes('.chati/session.yaml'));
    assert.ok(!result.includes('CLAUDE.local.md'));
  });

  it('replaces CLAUDE.md with GEMINI.md', () => {
    const content = 'Read CLAUDE.md for project context';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', provider);
    assert.ok(result.includes('GEMINI.md'));
    assert.ok(!result.includes('CLAUDE.md'));
  });

  it('replaces .claude/rules/chati/ with chati.dev/context/', () => {
    const content = 'Rules loaded from .claude/rules/chati/ directory';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', provider);
    assert.ok(result.includes('chati.dev/context/'));
    assert.ok(!result.includes('.claude/rules/chati/'));
  });

  it('replaces Claude Code with Gemini CLI', () => {
    const content = 'All other agents run in separate Claude Code processes';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', provider);
    assert.ok(result.includes('Gemini CLI'));
    assert.ok(!result.includes('Claude Code'));
  });

  it('replaces "generic Claude" with "generic AI assistant"', () => {
    const content = 'NEVER act as generic Claude — you ARE the orchestrator';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', provider);
    assert.ok(result.includes('generic AI assistant'));
    assert.ok(!result.includes('generic Claude'));
  });

  it('replaces /model commands', () => {
    const content = '/model opus\n/model sonnet\n/model haiku';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', provider);
    assert.ok(result.includes('/model pro'));
    assert.ok(result.includes('/model flash'));
    assert.ok(!result.includes('/model opus'));
    assert.ok(!result.includes('/model sonnet'));
    assert.ok(!result.includes('/model haiku'));
  });

  // Regex pattern tests
  it('replaces **Model**: opus in identity sections', () => {
    const content = '- **Model**: opus | upgrade: opus if complex';
    const result = adaptFrameworkFile(content, 'agents/build/dev.md', provider);
    assert.ok(result.includes('**Model**: pro'));
    assert.ok(!result.includes('**Model**: opus'));
  });

  it('replaces model names in table cells', () => {
    const content = '| opus | sonnet | haiku |';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', provider);
    assert.ok(result.includes('| pro |'));
    assert.ok(result.includes('| flash |'));
    assert.ok(!result.includes('| opus |'));
    assert.ok(!result.includes('| sonnet |'));
    assert.ok(!result.includes('| haiku |'));
  });

  it('replaces model names in YAML-like blocks', () => {
    const content = 'default: sonnet\nupgrade_to: opus\ndowngrade_to: haiku';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', provider);
    assert.ok(result.includes('default: flash'));
    assert.ok(result.includes('upgrade_to: pro'));
    assert.ok(result.includes('downgrade_to: flash'));
  });

  it('replaces bold model tier definitions', () => {
    const content = '**opus**: deep reasoning\n**sonnet**: structured\n**haiku**: lightweight';
    const result = adaptFrameworkFile(content, 'constitution.md', provider);
    assert.ok(result.includes('**pro**:'));
    assert.ok(result.includes('**flash**:'));
  });

  it('replaces provider field in agent Identity', () => {
    const content = '- **Provider**: claude (default) | gemini (when gemini-cli selected)';
    const result = adaptFrameworkFile(content, 'agents/build/dev.md', provider);
    assert.ok(result.includes('gemini (default)'));
    assert.ok(!result.includes('claude (default)'));
  });

  it('replaces PRIMARY provider display', () => {
    const content = 'claude    PRIMARY   Enabled   Claude Code CLI';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', provider);
    assert.ok(result.includes('gemini    PRIMARY   Enabled   Gemini CLI'), 'Should have gemini as PRIMARY');
    assert.ok(!result.includes('claude    PRIMARY'));
  });

  it('replaces CLAUDE.md Update section headers', () => {
    const content = '### CLAUDE.md Update\nUpdate CLAUDE.md with current state';
    const result = adaptFrameworkFile(content, 'agents/discover/brief.md', provider);
    assert.ok(result.includes('### GEMINI.md Update'));
    assert.ok(result.includes('Update GEMINI.md'));
  });
});

// ---------------------------------------------------------------------------
// Codex provider adaptations
// ---------------------------------------------------------------------------

describe('adaptFrameworkFile — codex', () => {
  const provider = 'codex';

  it('replaces CLAUDE.local.md with .chati/session.yaml', () => {
    const content = 'Read CLAUDE.local.md for session state';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', provider);
    assert.ok(result.includes('.chati/session.yaml'));
    assert.ok(!result.includes('CLAUDE.local.md'));
  });

  it('replaces CLAUDE.md with AGENTS.md', () => {
    const content = 'Read CLAUDE.md for project context';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', provider);
    assert.ok(result.includes('AGENTS.md'));
    assert.ok(!result.includes('CLAUDE.md'));
  });

  it('replaces Claude Code with Codex CLI', () => {
    const content = 'All agents run in Claude Code processes';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', provider);
    assert.ok(result.includes('Codex CLI'));
    assert.ok(!result.includes('Claude Code'));
  });

  it('maps opus to codex model tier', () => {
    const content = '- **Model**: opus\n/model opus';
    const result = adaptFrameworkFile(content, 'agents/build/dev.md', provider);
    assert.ok(result.includes('**Model**: codex'));
    assert.ok(result.includes('/model codex'));
  });

  it('maps sonnet to mini model tier', () => {
    const content = '- **Model**: sonnet\ndefault: sonnet\n/model sonnet';
    const result = adaptFrameworkFile(content, 'agents/discover/brief.md', provider);
    assert.ok(result.includes('**Model**: mini'));
    assert.ok(result.includes('default: mini'));
    assert.ok(result.includes('/model mini'));
  });

  it('maps haiku to mini model tier', () => {
    const content = '- **Model**: haiku\n/model haiku';
    const result = adaptFrameworkFile(content, 'agents/discover/greenfield-wu.md', provider);
    assert.ok(result.includes('**Model**: mini'));
    assert.ok(result.includes('/model mini'));
  });

  it('replaces table cells with codex model tiers', () => {
    const content = '| opus | sonnet | haiku |';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', provider);
    assert.ok(result.includes('| codex |'));
    assert.ok(result.includes('| mini |'));
  });

  it('replaces model tier descriptions', () => {
    const content = 'opus (deep reasoning)\nsonnet (structured)\nhaiku (lightweight)';
    const result = adaptFrameworkFile(content, 'constitution.md', provider);
    assert.ok(result.includes('codex (deep reasoning)'));
    assert.ok(result.includes('mini (structured)'));
    assert.ok(result.includes('mini (lightweight)'));
  });
});

// ---------------------------------------------------------------------------
// String replacement ordering (most specific first)
// ---------------------------------------------------------------------------

describe('adaptFrameworkFile — replacement ordering', () => {
  it('replaces CLAUDE.local.md before CLAUDE.md (no partial match)', () => {
    const content = 'CLAUDE.local.md state and CLAUDE.md context';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', 'gemini');
    assert.ok(result.includes('.chati/session.yaml'));
    assert.ok(result.includes('GEMINI.md'));
    // Make sure CLAUDE.local.md wasn't partially replaced as GEMINI.md.local.md
    assert.ok(!result.includes('GEMINI.md.local.md'));
    assert.ok(!result.includes('.chati/session.yaml.md'));
  });

  it('replaces "Claude Code CLI" before "Claude Code"', () => {
    const content = 'Claude Code CLI and Claude Code processes';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', 'codex');
    assert.ok(result.includes('Codex CLI'));
    assert.ok(!result.includes('Claude Code'));
    // Make sure it didn't produce "Codex CLI CLI"
    assert.ok(!result.includes('Codex CLI CLI'));
  });

  it('replaces "Claude Code processes" before "Claude Code"', () => {
    const content = 'Claude Code processes in separate terminals';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', 'gemini');
    assert.ok(result.includes('Gemini CLI processes'));
    // Make sure it didn't produce "Gemini CLI processes" twice or partial
    assert.ok(!result.includes('Claude Code'));
  });
});

// ---------------------------------------------------------------------------
// All providers: comprehensive model mapping via PROVIDER_MODEL_MAPS
// ---------------------------------------------------------------------------

describe('adaptFrameworkFile — model maps consistency', () => {
  for (const provider of ['gemini', 'codex']) {
    const map = PROVIDER_MODEL_MAPS[provider];

    it(`${provider}: deep model maps from opus`, () => {
      const content = '- **Model**: opus';
      const result = adaptFrameworkFile(content, 'agents/build/dev.md', provider);
      assert.ok(result.includes(`**Model**: ${map.deep}`));
    });

    it(`${provider}: light model maps from sonnet`, () => {
      const content = '- **Model**: sonnet';
      const result = adaptFrameworkFile(content, 'agents/discover/brief.md', provider);
      assert.ok(result.includes(`**Model**: ${map.light}`));
    });

    it(`${provider}: minimal model maps from haiku`, () => {
      const content = '- **Model**: haiku';
      const result = adaptFrameworkFile(content, 'agents/discover/greenfield-wu.md', provider);
      assert.ok(result.includes(`**Model**: ${map.minimal}`));
    });
  }
});

// ---------------------------------------------------------------------------
// Real-world content patterns (from actual orchestrator)
// ---------------------------------------------------------------------------

describe('adaptFrameworkFile — real-world patterns', () => {
  it('adapts Step 1 Load Context block', () => {
    const content = `### Step 1: Load Context
\`\`\`
1. Read .chati/session.yaml
2. Read CLAUDE.md (root)
3. Read chati.dev/constitution.md (if first run)
\`\`\``;
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', 'codex');
    assert.ok(result.includes('AGENTS.md'));
    assert.ok(!result.includes('CLAUDE.md'));
  });

  it('adapts session lock block references', () => {
    const content = `### Session Lock Block (CLAUDE.local.md)
When the session is active, CLAUDE.local.md MUST contain this block:
CLAUDE.local.md is auto-gitignored`;
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', 'gemini');
    assert.ok(result.includes('.chati/session.yaml'));
    assert.ok(!result.includes('CLAUDE.local.md'));
  });

  it('adapts provider display table', () => {
    const content = 'claude    PRIMARY   Enabled   Claude Code CLI';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', 'codex');
    assert.ok(result.includes('codex    PRIMARY   Enabled   Codex CLI'), 'Should have codex as PRIMARY');
  });

  it('adapts multi-terminal agent spawn instructions', () => {
    const content = 'All other agents run in separate Claude Code processes with the correct model:';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', 'gemini');
    assert.ok(result.includes('Gemini CLI processes'));
    assert.ok(!result.includes('Claude Code'));
  });

  it('adapts "NEVER act as generic Claude"', () => {
    const content = '4. NEVER act as generic Claude — you ARE the Chati.dev orchestrator';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', 'codex');
    assert.ok(result.includes('NEVER act as generic AI assistant'));
    assert.ok(!result.includes('generic Claude'));
  });

  it('adapts conditional model expressions', () => {
    const content = '- **Model**: sonnet | upgrade: opus if complex routing or deviation handling';
    const result = adaptFrameworkFile(content, 'orchestrator/chati.md', 'gemini');
    assert.ok(result.includes('flash'));
    assert.ok(result.includes('pro if complex'));
  });

  it('adapts fallback provider references', () => {
    const content = 'fallback_provider: claude\nprimary provider: claude';
    const result = adaptFrameworkFile(content, 'constitution.md', 'codex');
    assert.ok(result.includes('fallback_provider: codex'));
    assert.ok(result.includes('primary provider: codex'));
  });
});
