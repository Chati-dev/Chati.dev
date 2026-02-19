import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { generateSessionYaml, generateConfigYaml, generateClaudeMd, generateClaudeLocalMd, generateCodexSkill, generateGeminiRouter } from '../../src/installer/templates.js';

const testConfig = {
  projectName: 'test-project',
  projectType: 'greenfield',
  language: 'en',
  selectedIDEs: ['claude-code'],
  selectedMCPs: ['browser', 'context7'],
  version: '1.2.1',
};

describe('generateSessionYaml', () => {
  it('generates valid YAML', () => {
    const result = generateSessionYaml(testConfig);
    const parsed = yaml.load(result);
    assert.ok(parsed, 'should parse as YAML');
  });

  it('includes project info', () => {
    const parsed = yaml.load(generateSessionYaml(testConfig));
    assert.equal(parsed.project.name, 'test-project');
    assert.equal(parsed.project.type, 'greenfield');
    assert.equal(parsed.project.state, 'discover');
  });

  it('initializes all 12 agents', () => {
    const parsed = yaml.load(generateSessionYaml(testConfig));
    const agents = Object.keys(parsed.agents);
    assert.equal(agents.length, 12);
    assert.ok(agents.includes('brief'));
    assert.ok(agents.includes('dev'));
    assert.ok(agents.includes('devops'));
  });

  it('sets all agents to pending status', () => {
    const parsed = yaml.load(generateSessionYaml(testConfig));
    for (const agent of Object.values(parsed.agents)) {
      assert.equal(agent.status, 'pending');
      assert.equal(agent.score, 0);
    }
  });

  it('includes selected IDEs and MCPs', () => {
    const parsed = yaml.load(generateSessionYaml(testConfig));
    assert.deepEqual(parsed.ides, ['claude-code']);
    assert.deepEqual(parsed.mcps, ['browser', 'context7']);
  });
});

describe('generateConfigYaml', () => {
  it('generates valid YAML', () => {
    const result = generateConfigYaml(testConfig);
    const parsed = yaml.load(result);
    assert.ok(parsed);
  });

  it('includes version', () => {
    const parsed = yaml.load(generateConfigYaml(testConfig));
    assert.equal(parsed.version, '1.2.1');
  });

  it('includes timestamps', () => {
    const parsed = yaml.load(generateConfigYaml(testConfig));
    assert.ok(parsed.installed_at);
    assert.ok(parsed.updated_at);
  });
});

describe('generateClaudeMd', () => {
  it('includes project name', () => {
    const result = generateClaudeMd(testConfig);
    assert.ok(result.includes('test-project'));
  });

  it('references .claude/rules/chati/ for framework rules', () => {
    const result = generateClaudeMd(testConfig);
    assert.ok(result.includes('.claude/rules/chati/'));
  });

  it('references CLAUDE.local.md for runtime state', () => {
    const result = generateClaudeMd(testConfig);
    assert.ok(result.includes('CLAUDE.local.md'));
  });

  it('is minimal (no inline framework content)', () => {
    const result = generateClaudeMd(testConfig);
    // Should NOT contain session lock, pipeline details, or key files inline
    assert.ok(!result.includes('SESSION-LOCK'));
    assert.ok(!result.includes('constitution.md'));
    assert.ok(!result.includes('session.yaml'));
    // Should NOT use @ imports
    assert.ok(!result.includes('@chati.dev'));
  });

  it('includes project type', () => {
    const result = generateClaudeMd(testConfig);
    assert.ok(result.includes('Greenfield'));
  });

  it('includes brownfield type when configured', () => {
    const result = generateClaudeMd({ ...testConfig, projectType: 'brownfield' });
    assert.ok(result.includes('Brownfield'));
  });
});

describe('generateClaudeLocalMd', () => {
  it('includes session lock marker', () => {
    const result = generateClaudeLocalMd();
    assert.ok(result.includes('SESSION-LOCK:INACTIVE'));
  });

  it('includes runtime state fields', () => {
    const result = generateClaudeLocalMd();
    assert.ok(result.includes('Agent'));
    assert.ok(result.includes('Pipeline'));
    assert.ok(result.includes('Mode'));
  });

  it('starts with inactive session', () => {
    const result = generateClaudeLocalMd();
    assert.ok(result.includes('INACTIVE'));
  });
});

// ---------------------------------------------------------------------------
// Multi-CLI feature tests
// ---------------------------------------------------------------------------

describe('generateSessionYaml with llmProvider', () => {
  it('defaults providers_enabled to claude when llmProvider is undefined', () => {
    const config = { ...testConfig, llmProvider: undefined };
    const parsed = yaml.load(generateSessionYaml(config));
    assert.deepEqual(parsed.providers_enabled, ['claude']);
  });

  it('uses explicit llmProvider in providers_enabled', () => {
    const config = { ...testConfig, llmProvider: 'gemini' };
    const parsed = yaml.load(generateSessionYaml(config));
    assert.deepEqual(parsed.providers_enabled, ['gemini']);
  });

  it('includes execution_profile field', () => {
    const parsed = yaml.load(generateSessionYaml(testConfig));
    assert.equal(parsed.execution_profile, 'guided');
  });

  it('includes profile_transitions array', () => {
    const parsed = yaml.load(generateSessionYaml(testConfig));
    assert.ok(Array.isArray(parsed.profile_transitions));
    assert.equal(parsed.profile_transitions.length, 0);
  });
});

describe('generateConfigYaml with llmProvider', () => {
  it('defaults to claude provider when llmProvider is undefined', () => {
    const config = { ...testConfig, llmProvider: undefined };
    const parsed = yaml.load(generateConfigYaml(config));
    assert.equal(parsed.providers.claude.primary, true);
    assert.equal(parsed.providers.claude.enabled, true);
  });

  it('sets gemini as primary when selected', () => {
    const config = { ...testConfig, llmProvider: 'gemini' };
    const parsed = yaml.load(generateConfigYaml(config));
    assert.equal(parsed.providers.gemini.primary, true);
    assert.equal(parsed.providers.gemini.enabled, true);
    assert.equal(parsed.providers.claude.primary, false);
  });

  it('enables selected provider in providers block', () => {
    for (const provider of ['claude', 'gemini', 'codex']) {
      const config = { ...testConfig, llmProvider: provider };
      const parsed = yaml.load(generateConfigYaml(config));
      assert.equal(parsed.providers[provider].enabled, true, `${provider} should be enabled`);
      assert.equal(parsed.providers[provider].primary, true, `${provider} should be primary`);
    }
  });

  it('generates agent_overrides for non-claude providers', () => {
    for (const provider of ['gemini', 'codex']) {
      const config = { ...testConfig, llmProvider: provider };
      const parsed = yaml.load(generateConfigYaml(config));
      assert.ok(parsed.agent_overrides, `${provider} should have agent_overrides`);
      assert.ok(Object.keys(parsed.agent_overrides).length > 0, `${provider} agent_overrides should not be empty`);
    }
  });

  it('does not generate agent_overrides for claude', () => {
    const config = { ...testConfig, llmProvider: 'claude' };
    const parsed = yaml.load(generateConfigYaml(config));
    assert.equal(parsed.agent_overrides, undefined);
  });

  it('maps all 13 agents in agent_overrides for gemini', () => {
    const config = { ...testConfig, llmProvider: 'gemini' };
    const parsed = yaml.load(generateConfigYaml(config));
    const expectedAgents = [
      'orchestrator', 'greenfield-wu', 'brownfield-wu', 'brief', 'detail',
      'architect', 'ux', 'phases', 'tasks',
      'qa-planning', 'dev', 'qa-implementation', 'devops',
    ];
    const overriddenAgents = Object.keys(parsed.agent_overrides);
    assert.equal(overriddenAgents.length, expectedAgents.length);
    for (const agent of expectedAgents) {
      assert.ok(parsed.agent_overrides[agent], `Missing override for ${agent}`);
      assert.equal(parsed.agent_overrides[agent].provider, 'gemini');
      assert.ok(typeof parsed.agent_overrides[agent].model === 'string');
    }
  });

  it('uses correct tier names for codex (codex and mini)', () => {
    const config = { ...testConfig, llmProvider: 'codex' };
    const parsed = yaml.load(generateConfigYaml(config));
    const models = new Set(Object.values(parsed.agent_overrides).map(o => o.model));
    // codex provider should only use 'codex' and 'mini' tiers
    for (const model of models) {
      assert.ok(
        ['codex', 'mini'].includes(model),
        `Unexpected codex tier: ${model}. Expected "codex" or "mini".`
      );
    }
    // Both tiers should be present (deep agents get codex, light agents get mini)
    assert.ok(models.has('codex'), 'Should have "codex" tier');
    assert.ok(models.has('mini'), 'Should have "mini" tier');
  });

  it('enables gemini when gemini-cli is in selectedIDEs', () => {
    const config = { ...testConfig, selectedIDEs: ['gemini-cli'], llmProvider: 'gemini' };
    const parsed = yaml.load(generateConfigYaml(config));
    assert.equal(parsed.providers.gemini.enabled, true);
    assert.equal(parsed.providers.gemini.primary, true);
  });

  it('enables codex when codex-cli is in selectedIDEs', () => {
    const config = { ...testConfig, selectedIDEs: ['codex-cli'], llmProvider: 'codex' };
    const parsed = yaml.load(generateConfigYaml(config));
    assert.equal(parsed.providers.codex.enabled, true);
    assert.equal(parsed.providers.codex.primary, true);
  });

  it('does not enable gemini when only claude-code is in selectedIDEs', () => {
    const config = { ...testConfig, selectedIDEs: ['claude-code'], llmProvider: 'claude' };
    const parsed = yaml.load(generateConfigYaml(config));
    assert.equal(parsed.providers.gemini.enabled, false);
  });
});

// ---------------------------------------------------------------------------
// Provider-specific router/agent tests
// ---------------------------------------------------------------------------

describe('generateGeminiRouter', () => {
  it('returns valid TOML content', () => {
    const result = generateGeminiRouter();
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
    // TOML must have description and prompt fields
    assert.ok(result.includes('description ='), 'Should have TOML description field');
    assert.ok(result.includes('prompt ='), 'Should have TOML prompt field');
  });

  it('uses TOML triple-quoted string for prompt', () => {
    const result = generateGeminiRouter();
    assert.ok(result.includes('"""'), 'Should use TOML triple-quoted strings');
  });

  it('references the orchestrator', () => {
    const result = generateGeminiRouter();
    assert.ok(result.includes('chati.dev/orchestrator/chati.md'));
  });

  it('includes {{args}} for user input', () => {
    const result = generateGeminiRouter();
    assert.ok(result.includes('{{args}}'), 'Should include {{args}} placeholder');
  });

  it('includes language override', () => {
    const result = generateGeminiRouter();
    assert.ok(result.includes('language'));
    assert.ok(result.includes('session.yaml'));
  });

  it('states files are pre-configured for Gemini CLI', () => {
    const result = generateGeminiRouter();
    assert.ok(result.includes('pre-configured for Gemini CLI'), 'Should state pre-configured');
    assert.ok(result.includes('NEVER create or reference CLAUDE.md'), 'Should prohibit CLAUDE.md creation');
  });

  it('references GEMINI.md as context file', () => {
    const result = generateGeminiRouter();
    assert.ok(result.includes('GEMINI.md'), 'Should reference GEMINI.md');
  });

  it('does NOT contain runtime mapping tables', () => {
    const result = generateGeminiRouter();
    assert.ok(!result.includes('Model Name Mapping'), 'Should NOT have model mapping table');
    assert.ok(!result.includes('Provider Context Mapping'), 'Should NOT have context mapping table');
  });
});

describe('generateCodexSkill', () => {
  it('returns a non-empty string with YAML frontmatter', () => {
    const result = generateCodexSkill();
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
    assert.ok(result.startsWith('---'), 'Should start with YAML frontmatter delimiter');
  });

  it('has name and description in frontmatter', () => {
    const result = generateCodexSkill();
    assert.ok(result.includes('name: chati'), 'Should have skill name');
    assert.ok(result.includes('description:'), 'Should have skill description');
  });

  it('includes language override section', () => {
    const result = generateCodexSkill();
    assert.ok(result.includes('Language Override'));
    assert.ok(result.includes('session.yaml'));
  });

  it('references the orchestrator', () => {
    const result = generateCodexSkill();
    assert.ok(result.includes('chati.dev/orchestrator/chati.md'));
  });

  it('references AGENTS.md as context file', () => {
    const result = generateCodexSkill();
    assert.ok(result.includes('AGENTS.md'));
  });

  it('includes $ARGUMENTS placeholder', () => {
    const result = generateCodexSkill();
    assert.ok(result.includes('$ARGUMENTS'), 'Should include $ARGUMENTS for user input');
  });

  it('states files are pre-configured for Codex CLI', () => {
    const result = generateCodexSkill();
    assert.ok(result.includes('pre-configured for Codex CLI'), 'Should state pre-configured');
    assert.ok(result.includes('NEVER create or reference CLAUDE.md'), 'Should prohibit CLAUDE.md creation');
  });

  it('does NOT contain runtime mapping tables', () => {
    const result = generateCodexSkill();
    assert.ok(!result.includes('Model Name Mapping'), 'Should NOT have model mapping table');
    assert.ok(!result.includes('Provider Context Mapping'), 'Should NOT have context mapping table');
  });
});
