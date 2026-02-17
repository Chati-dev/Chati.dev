/**
 * @fileoverview Session timeline manager.
 *
 * Maintains a chronological record of all significant events
 * during a session: agent activations, mode transitions, gate
 * results, handoffs, and deviations.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * @typedef {object} TimelineEvent
 * @property {string} id - Unique event ID
 * @property {string} type - Event type
 * @property {string} agent - Agent involved (or 'orchestrator')
 * @property {object} data - Event-specific data
 * @property {string} timestamp - ISO timestamp
 */

/**
 * Event type constants.
 */
export const EventType = {
  AGENT_ACTIVATED: 'agent_activated',
  AGENT_COMPLETED: 'agent_completed',
  MODE_TRANSITION: 'mode_transition',
  PROFILE_TRANSITION: 'profile_transition',
  GATE_EVALUATED: 'gate_evaluated',
  HANDOFF_CREATED: 'handoff_created',
  DEVIATION_DETECTED: 'deviation_detected',
  ERROR_OCCURRED: 'error_occurred',
  PROVIDER_SELECTED: 'provider_selected',
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
};

const TIMELINE_FILE = '.chati/timeline.json';
let _counter = 0;

/**
 * Load the timeline from disk.
 *
 * @param {string} projectDir
 * @returns {TimelineEvent[]}
 */
export function loadTimeline(projectDir) {
  const timelinePath = join(projectDir, TIMELINE_FILE);
  if (!existsSync(timelinePath)) return [];
  try {
    return JSON.parse(readFileSync(timelinePath, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Save the timeline to disk.
 *
 * @param {string} projectDir
 * @param {TimelineEvent[]} timeline
 */
function saveTimeline(projectDir, timeline) {
  const timelinePath = join(projectDir, TIMELINE_FILE);
  mkdirSync(dirname(timelinePath), { recursive: true });
  writeFileSync(timelinePath, JSON.stringify(timeline, null, 2));
}

/**
 * Record a new event on the timeline.
 *
 * @param {string} projectDir
 * @param {string} type - Event type from EventType
 * @param {string} agent - Agent name
 * @param {object} [data={}] - Event-specific data
 * @returns {TimelineEvent}
 */
export function recordEvent(projectDir, type, agent, data = {}) {
  const timeline = loadTimeline(projectDir);
  _counter++;

  const event = {
    id: `evt-${Date.now()}-${_counter}`,
    type,
    agent,
    data,
    timestamp: new Date().toISOString(),
  };

  timeline.push(event);
  saveTimeline(projectDir, timeline);
  return event;
}

/**
 * Get events filtered by type.
 *
 * @param {string} projectDir
 * @param {string} type
 * @returns {TimelineEvent[]}
 */
export function getEventsByType(projectDir, type) {
  return loadTimeline(projectDir).filter((e) => e.type === type);
}

/**
 * Get events filtered by agent.
 *
 * @param {string} projectDir
 * @param {string} agent
 * @returns {TimelineEvent[]}
 */
export function getEventsByAgent(projectDir, agent) {
  return loadTimeline(projectDir).filter((e) => e.agent === agent);
}

/**
 * Get the most recent event of a given type.
 *
 * @param {string} projectDir
 * @param {string} type
 * @returns {TimelineEvent|null}
 */
export function getLatestEvent(projectDir, type) {
  const events = getEventsByType(projectDir, type);
  return events.length > 0 ? events[events.length - 1] : null;
}

/**
 * Clear the timeline (used for session reset).
 *
 * @param {string} projectDir
 */
export function clearTimeline(projectDir) {
  saveTimeline(projectDir, []);
  _counter = 0;
}

/**
 * Reset counter (for tests).
 */
export function _resetCounter() {
  _counter = 0;
}
