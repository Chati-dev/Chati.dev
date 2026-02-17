/**
 * Task Loader — Parses task definition files (YAML frontmatter + markdown body).
 *
 * Task files live in chati.dev/tasks/{agent}-{action}.md and contain:
 * - YAML frontmatter: id, agent, trigger, phase, requires_input, parallelizable, outputs, handoff_to, autonomous_gate, criteria
 * - Markdown body: Step-by-step instructions for the agent
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Parse a single task definition file.
 * @param {string} filePath - Absolute path to .md file with YAML frontmatter
 * @returns {{ loaded: boolean, task: object|null, error: string|null }}
 */
export function loadTask(filePath) {
  if (!existsSync(filePath)) {
    return { loaded: false, task: null, error: `Task file not found: ${filePath}` };
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    return parseTaskContent(raw, filePath);
  } catch (err) {
    return { loaded: false, task: null, error: `Failed to read ${filePath}: ${err.message}` };
  }
}

/**
 * Parse task content string (YAML frontmatter + markdown body).
 * @param {string} content - Raw file content
 * @param {string} [source] - Source file path for error messages
 * @returns {{ loaded: boolean, task: object|null, error: string|null }}
 */
export function parseTaskContent(content, source = 'unknown') {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { loaded: false, task: null, error: `No YAML frontmatter found in ${source}` };
  }

  const yamlStr = frontmatterMatch[1];
  const body = frontmatterMatch[2].trim();

  try {
    const meta = parseSimpleYaml(yamlStr);

    if (!meta.id) {
      return { loaded: false, task: null, error: `Missing required field 'id' in ${source}` };
    }
    if (!meta.agent) {
      return { loaded: false, task: null, error: `Missing required field 'agent' in ${source}` };
    }

    return {
      loaded: true,
      task: {
        id: meta.id,
        agent: meta.agent,
        trigger: meta.trigger || 'orchestrator',
        phase: meta.phase || 'plan',
        requires_input: meta.requires_input === true || meta.requires_input === 'true',
        parallelizable: meta.parallelizable === true || meta.parallelizable === 'true',
        outputs: parseArray(meta.outputs),
        handoff_to: meta.handoff_to || null,
        autonomous_gate: meta.autonomous_gate !== false && meta.autonomous_gate !== 'false',
        criteria: parseArray(meta.criteria),
        instructions: body,
        source,
      },
      error: null,
    };
  } catch (err) {
    return { loaded: false, task: null, error: `YAML parse error in ${source}: ${err.message}` };
  }
}

/**
 * Load all task definitions from a directory.
 * @param {string} tasksDir - Path to chati.dev/tasks/
 * @returns {{ tasks: Map<string, object>, errors: string[] }}
 */
export function loadAllTasks(tasksDir) {
  const tasks = new Map();
  const errors = [];

  if (!existsSync(tasksDir)) {
    errors.push(`Tasks directory not found: ${tasksDir}`);
    return { tasks, errors };
  }

  const files = readdirSync(tasksDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const result = loadTask(join(tasksDir, file));
    if (result.loaded) {
      tasks.set(result.task.id, result.task);
    } else {
      errors.push(result.error);
    }
  }

  return { tasks, errors };
}

/**
 * Get all tasks for a specific agent.
 * @param {Map<string, object>} taskMap - Map from loadAllTasks
 * @param {string} agentName - Agent name to filter by
 * @returns {object[]}
 */
export function getAgentTasks(taskMap, agentName) {
  const result = [];
  for (const task of taskMap.values()) {
    if (task.agent === agentName) {
      result.push(task);
    }
  }
  return result;
}

/**
 * Get a task's info summary (without instructions body).
 * @param {object} task - Task object from loadTask
 * @returns {object}
 */
export function getTaskSummary(task) {
  return {
    id: task.id,
    agent: task.agent,
    phase: task.phase,
    parallelizable: task.parallelizable,
    outputs: task.outputs,
    handoff_to: task.handoff_to,
    criteria_count: task.criteria.length,
  };
}

/**
 * Simple YAML parser for frontmatter (no external deps).
 * Handles key: value, key: [array], and key: true/false.
 */
function parseSimpleYaml(str) {
  const result = {};
  let currentKey = null;
  let currentArray = null;

  for (const line of str.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Array item under current key
    if (trimmed.startsWith('- ') && currentKey && currentArray) {
      currentArray.push(trimmed.slice(2).trim());
      continue;
    }

    // Key: value pair
    const kvMatch = trimmed.match(/^(\w[\w_-]*):\s*(.*)$/);
    if (kvMatch) {
      // Save previous array if any
      if (currentKey && currentArray) {
        result[currentKey] = currentArray;
      }

      const key = kvMatch[1];
      const val = kvMatch[2].trim();

      if (val === '') {
        // Could be start of an array
        currentKey = key;
        currentArray = [];
      } else if (val.startsWith('[') && val.endsWith(']')) {
        // Inline array: [a, b, c]
        result[key] = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
        currentKey = null;
        currentArray = null;
      } else if (val === 'true') {
        result[key] = true;
        currentKey = null;
        currentArray = null;
      } else if (val === 'false') {
        result[key] = false;
        currentKey = null;
        currentArray = null;
      } else {
        result[key] = val;
        currentKey = null;
        currentArray = null;
      }
    }
  }

  // Save trailing array
  if (currentKey && currentArray) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Ensure a value is an array.
 */
function parseArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return [val];
  return [];
}
