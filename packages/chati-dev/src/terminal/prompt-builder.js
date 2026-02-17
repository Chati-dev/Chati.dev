/**
 * @fileoverview Prompt builder for multi-terminal agent execution.
 *
 * Builds a complete, self-contained prompt for spawned agent terminals.
 * When an agent runs in a separate `claude -p` process, it has zero
 * conversation history — the prompt must contain everything: PRISM
 * context, agent definition, previous handoff, write scope, and
 * output format instructions.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { runPrism } from '../context/engine.js';
import { loadHandoff, formatHandoff } from '../tasks/handoff.js';
import { getWriteScope } from './isolation.js';

// Import AGENT_MODELS from model-governance (safe — named export,
// does not trigger main() which is guarded by fileURLToPath check).
import { AGENT_MODELS } from '../../framework/hooks/model-governance.js';

/**
 * Map of agent names to their definition file paths (relative to project root).
 */
export const AGENT_FILE_MAP = {
  'greenfield-wu': 'chati.dev/agents/discover/greenfield-wu.md',
  'brownfield-wu': 'chati.dev/agents/discover/brownfield-wu.md',
  brief: 'chati.dev/agents/discover/brief.md',
  detail: 'chati.dev/agents/plan/detail.md',
  architect: 'chati.dev/agents/plan/architect.md',
  ux: 'chati.dev/agents/plan/ux.md',
  phases: 'chati.dev/agents/plan/phases.md',
  tasks: 'chati.dev/agents/plan/tasks.md',
  'qa-planning': 'chati.dev/agents/quality/qa-planning.md',
  dev: 'chati.dev/agents/build/dev.md',
  'qa-implementation': 'chati.dev/agents/quality/qa-implementation.md',
  devops: 'chati.dev/agents/deploy/devops.md',
};

/**
 * @typedef {object} PromptBuildConfig
 * @property {string} agent           - Agent name (e.g. 'detail')
 * @property {string} taskId          - Task identifier
 * @property {string} projectDir      - Project root (absolute path)
 * @property {string} [previousAgent] - Agent that produced the handoff
 * @property {string} [workflow]      - Active workflow name
 * @property {object} [sessionState]  - Parsed session.yaml fields
 * @property {string[]} [writeScope]  - Override write scope
 * @property {string} [additionalContext] - Extra context (e.g. user answer to needs_input)
 */

/**
 * Build a complete, self-contained prompt for a spawned agent terminal.
 *
 * @param {PromptBuildConfig} config
 * @returns {{ prompt: string, model: string, metadata: { agent: string, layers: number, promptSize: number } }}
 */
export function buildAgentPrompt(config) {
  if (!config || !config.agent) {
    throw new Error('buildAgentPrompt requires config.agent');
  }
  if (!config.projectDir) {
    throw new Error('buildAgentPrompt requires config.projectDir');
  }

  const sections = [];

  // 1. PRISM Context (L0-L4) — spawned terminals always start FRESH
  const prismResult = buildPrismSection(config);
  if (prismResult.xml) {
    sections.push(prismResult.xml);
  }

  // 2. Agent definition (.md file)
  const agentDef = loadAgentDefinition(config.agent, config.projectDir);
  if (agentDef) {
    sections.push('<!-- AGENT DEFINITION -->\n' + agentDef);
  }

  // 3. Previous handoff
  const handoffSection = buildHandoffSection(config);
  if (handoffSection) {
    sections.push(handoffSection);
  }

  // 4. Additional context (user input relay for needs_input)
  if (config.additionalContext) {
    sections.push(
      '<!-- ADDITIONAL CONTEXT -->\n' +
      '## Additional Context from User\n\n' +
      config.additionalContext
    );
  }

  // 5. Write scope instructions
  sections.push(buildWriteScopeSection(config));

  // 6. Session context
  sections.push(buildSessionSection(config));

  // 7. Output format instructions (handoff template)
  sections.push(buildOutputInstructions());

  const prompt = sections.join('\n\n---\n\n');
  const assignment = AGENT_MODELS[config.agent] || { provider: 'claude', model: 'sonnet', tier: 'sonnet' };
  const model = assignment.model || assignment;

  return {
    prompt,
    model,
    provider: assignment.provider || 'claude',
    metadata: {
      agent: config.agent,
      layers: prismResult.layerCount || 0,
      promptSize: prompt.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Run the PRISM context engine for the agent.
 * Spawned terminals always start FRESH (remainingPercent: 100).
 */
function buildPrismSection(config) {
  const domainsDir = join(config.projectDir, 'chati.dev', 'domains');

  if (!existsSync(domainsDir)) {
    return { xml: null, layerCount: 0 };
  }

  const state = config.sessionState || {};

  // Load handoff data for PRISM L3
  let handoff = {};
  if (config.previousAgent) {
    const loaded = loadHandoff(config.projectDir, config.previousAgent);
    if (loaded.loaded && loaded.handoff) {
      handoff = loaded.handoff;
    }
  }

  const result = runPrism({
    domainsDir,
    remainingPercent: 100, // Spawned terminals are always FRESH
    mode: state.project?.state || 'discover',
    agent: config.agent,
    workflow: config.workflow || null,
    pipelinePosition: config.agent,
    taskId: config.taskId || null,
    handoff,
    artifacts: state.artifacts || [],
    taskCriteria: [],
  });

  return {
    xml: result.xml || null,
    layerCount: result.layerCount || 0,
  };
}

/**
 * Load the agent's full .md definition file.
 */
function loadAgentDefinition(agent, projectDir) {
  const relativePath = AGENT_FILE_MAP[agent];
  if (!relativePath) return null;

  const fullPath = join(projectDir, relativePath);
  if (!existsSync(fullPath)) return null;

  return readFileSync(fullPath, 'utf-8');
}

/**
 * Build the previous handoff section for the prompt.
 */
function buildHandoffSection(config) {
  if (!config.previousAgent) return null;

  const result = loadHandoff(config.projectDir, config.previousAgent);
  if (!result.loaded || !result.handoff) return null;

  return (
    '<!-- PREVIOUS HANDOFF -->\n' +
    `## Handoff from ${config.previousAgent}\n\n` +
    formatHandoff({
      from: {
        agent: result.handoff.from_agent || config.previousAgent,
        task_id: result.handoff.from_task || 'unknown',
        phase: result.handoff.from_phase || 'unknown',
      },
      to: config.agent,
      timestamp: result.handoff.timestamp || new Date().toISOString(),
      status: result.handoff.status || 'unknown',
      score: result.handoff.score,
      summary: result.handoff.summary || '',
      outputs: result.handoff.outputs || [],
      decisions: result.handoff.decisions || {},
      blockers: result.handoff.blockers || [],
      criteria_met: result.handoff.criteria_met || [],
      criteria_unmet: result.handoff.criteria_unmet || [],
    })
  );
}

/**
 * Build write scope instructions embedded in the prompt.
 * This is the primary enforcement mechanism — env vars alone are not
 * respected by the spawned Claude process.
 */
function buildWriteScopeSection(config) {
  const scope = config.writeScope || getWriteScope(config.agent);

  if (scope.length === 0) {
    return (
      '<!-- WRITE SCOPE -->\n' +
      '## Write Scope (MANDATORY)\n\n' +
      'You have NO write access. This is a read-only execution.\n' +
      'Do NOT use Write, Edit, or any file-modifying tool.'
    );
  }

  const paths = scope.map(p => `- \`${p}\``).join('\n');

  return (
    '<!-- WRITE SCOPE -->\n' +
    '## Write Scope (MANDATORY)\n\n' +
    'You may ONLY write to these paths:\n' +
    paths + '\n\n' +
    '**All other write operations are BLOCKED.** Do NOT attempt to write, edit, or create files outside these paths. ' +
    'Read access is unrestricted — you may read any file in the project.'
  );
}

/**
 * Build session context section.
 */
function buildSessionSection(config) {
  const state = config.sessionState || {};
  const project = state.project || {};

  const lines = [
    '<!-- SESSION CONTEXT -->',
    '## Session Context',
    '',
    `- **Project**: ${project.name || '(unnamed)'}`,
    `- **Type**: ${project.type || 'greenfield'}`,
    `- **Mode**: ${project.state || 'discover'}`,
    `- **Language**: ${state.language || 'en'} (interaction) / English (artifacts)`,
    `- **User Level**: ${state.user_level || 'auto'}`,
    `- **Execution Mode**: ${state.execution_mode || 'autonomous'}`,
    `- **Your Agent**: ${config.agent}`,
    `- **Your Model**: ${(AGENT_MODELS[config.agent]?.model) || 'sonnet'}`,
    `- **Your Provider**: ${(AGENT_MODELS[config.agent]?.provider) || 'claude'}`,
  ];

  return lines.join('\n');
}

/**
 * Build output format instructions so the agent produces a parseable handoff.
 */
function buildOutputInstructions() {
  return `<!-- OUTPUT INSTRUCTIONS -->
## Output Instructions (MANDATORY)

When you complete your work, you MUST include a structured handoff block at the END of your response.
This block is how the orchestrator reads your results. Without it, your work cannot be collected.

\`\`\`
<chati-handoff>
status: complete
score: 95
summary: One to three sentence summary of what was accomplished.
outputs:
  - path/to/artifact1.md
  - path/to/artifact2.md
decisions:
  key1: value1
  key2: value2
blockers:
  - Description of any unresolved blocker
needs_input_question: null
</chati-handoff>
\`\`\`

### Status values:
- **complete**: All work finished successfully (score >= 95 required)
- **partial**: Some work done but not all criteria met
- **needs_input**: You need information from the user to continue. Set \`needs_input_question\` to your question.
- **error**: Something went wrong that you cannot recover from

### Important:
- The \`<chati-handoff>\` block MUST appear in your response
- Score must be 0-100 (95+ to pass quality gate)
- List ALL artifacts you created/modified in outputs
- If you need user input, set status to "needs_input" and write your question in needs_input_question`;
}
