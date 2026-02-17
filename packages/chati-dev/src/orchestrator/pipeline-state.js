/**
 * @fileoverview Pipeline state persistence layer.
 * Handles reading/writing pipeline state to session.yaml.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import yaml from 'js-yaml';

/**
 * Default session file path relative to project root.
 */
const SESSION_PATH = '.chati/session.yaml';

/**
 * Get full path to session file.
 *
 * @param {string} projectDir - Project root directory
 * @returns {string}
 */
function getSessionPath(projectDir) {
  return join(projectDir, SESSION_PATH);
}

/**
 * Load pipeline state from session.yaml.
 *
 * @param {string} projectDir
 * @returns {{ loaded: boolean, state: object|null }}
 */
export function loadPipelineState(projectDir) {
  const sessionPath = getSessionPath(projectDir);

  if (!existsSync(sessionPath)) {
    return {
      loaded: false,
      state: null,
    };
  }

  try {
    const content = readFileSync(sessionPath, 'utf8');
    const session = yaml.load(content);

    // Extract pipeline-relevant fields
    const state = {
      phase: session.mode || 'discover',
      isGreenfield: session.project_type === 'greenfield',
      startedAt: session.started_at || null,
      completedAt: session.completed_at || null,
      agents: session.agents || {},
      completedAgents: session.completed_agents || [],
      currentAgent: session.current_agent || null,
      modeTransitions: session.mode_transitions || [],
      history: session.history || [],
    };

    return {
      loaded: true,
      state,
    };
  } catch (error) {
    console.error(`Failed to load pipeline state: ${error.message}`);
    return {
      loaded: false,
      state: null,
    };
  }
}

/**
 * Save pipeline state to session.yaml.
 *
 * @param {string} projectDir
 * @param {object} state
 * @returns {{ saved: boolean }}
 */
export function savePipelineState(projectDir, state) {
  const sessionPath = getSessionPath(projectDir);

  // Ensure .chati directory exists
  const chatDir = dirname(sessionPath);
  if (!existsSync(chatDir)) {
    mkdirSync(chatDir, { recursive: true });
  }

  try {
    // Convert pipeline state to session format
    const session = {
      mode: state.phase,
      project_type: state.isGreenfield ? 'greenfield' : 'brownfield',
      started_at: state.startedAt,
      completed_at: state.completedAt,
      agents: state.agents,
      completed_agents: state.completedAgents,
      current_agent: state.currentAgent,
      mode_transitions: state.modeTransitions,
      history: state.history,
      updated_at: new Date().toISOString(),
    };

    const content = yaml.dump(session, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    writeFileSync(sessionPath, content, 'utf8');

    return { saved: true };
  } catch (error) {
    console.error(`Failed to save pipeline state: ${error.message}`);
    return { saved: false };
  }
}

/**
 * Merge pipeline state into existing session.yaml (preserving other fields).
 *
 * @param {string} projectDir
 * @param {object} updates - Partial pipeline state updates
 * @returns {{ saved: boolean }}
 */
export function updatePipelineState(projectDir, updates) {
  const sessionPath = getSessionPath(projectDir);

  // Load existing session or start with empty object
  let session = {};
  if (existsSync(sessionPath)) {
    try {
      const content = readFileSync(sessionPath, 'utf8');
      session = yaml.load(content) || {};
    } catch (error) {
      console.error(`Failed to load existing session: ${error.message}`);
      // Continue with empty session
    }
  }

  // Ensure .chati directory exists
  const chatDir = dirname(sessionPath);
  if (!existsSync(chatDir)) {
    mkdirSync(chatDir, { recursive: true });
  }

  try {
    // Apply updates to session
    if (updates.phase !== undefined) {
      session.mode = updates.phase;
    }
    if (updates.isGreenfield !== undefined) {
      session.project_type = updates.isGreenfield ? 'greenfield' : 'brownfield';
    }
    if (updates.startedAt !== undefined) {
      session.started_at = updates.startedAt;
    }
    if (updates.completedAt !== undefined) {
      session.completed_at = updates.completedAt;
    }
    if (updates.agents !== undefined) {
      session.agents = updates.agents;
    }
    if (updates.completedAgents !== undefined) {
      session.completed_agents = updates.completedAgents;
    }
    if (updates.currentAgent !== undefined) {
      session.current_agent = updates.currentAgent;
    }
    if (updates.modeTransitions !== undefined) {
      session.mode_transitions = updates.modeTransitions;
    }
    if (updates.history !== undefined) {
      session.history = updates.history;
    }

    session.updated_at = new Date().toISOString();

    const content = yaml.dump(session, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    writeFileSync(sessionPath, content, 'utf8');

    return { saved: true };
  } catch (error) {
    console.error(`Failed to update pipeline state: ${error.message}`);
    return { saved: false };
  }
}

/**
 * Check if session file exists.
 *
 * @param {string} projectDir
 * @returns {boolean}
 */
export function sessionExists(projectDir) {
  const sessionPath = getSessionPath(projectDir);
  return existsSync(sessionPath);
}

/**
 * Delete session file.
 *
 * @param {string} projectDir
 * @returns {{ deleted: boolean }}
 */
export function deleteSession(projectDir) {
  const sessionPath = getSessionPath(projectDir);

  if (!existsSync(sessionPath)) {
    return { deleted: true };
  }

  try {
    unlinkSync(sessionPath);
    return { deleted: true };
  } catch (error) {
    console.error(`Failed to delete session: ${error.message}`);
    return { deleted: false };
  }
}
