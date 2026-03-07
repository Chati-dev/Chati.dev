/**
 * @fileoverview Telemetry event schema and validation.
 *
 * Defines the 9 event types collected by telemetry.
 * Zero PII — only anonymous usage metrics.
 */

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

export const TELEMETRY_EVENTS = [
  'installation_completed',
  'agent_completed',
  'gate_evaluated',
  'pipeline_completed',
  'circuit_breaker_triggered',
  'error_occurred',
  'session_started',
  'session_completed',
  'token_usage',
];

// ---------------------------------------------------------------------------
// Property Schemas (allowed fields per event type)
// ---------------------------------------------------------------------------

const EVENT_PROPERTIES = {
  installation_completed: [
    'providers', 'editors', 'projectType', 'language',
    'primaryProvider', 'installDuration',
  ],
  agent_completed: [
    'agent', 'provider', 'model', 'duration', 'score',
    'retryCount', 'pipelineType',
  ],
  gate_evaluated: [
    'gate', 'result', 'score', 'blockers',
  ],
  pipeline_completed: [
    'pipelineType', 'totalDuration', 'agentsRun', 'finalStatus',
    'abandonedAt', 'totalCost', 'deviationCount',
  ],
  circuit_breaker_triggered: [
    'trigger', 'agent', 'provider',
  ],
  error_occurred: [
    'errorType', 'agent', 'provider', 'phase',
  ],
  session_started: [
    'sessionId', 'pipelineType', 'mode',
  ],
  session_completed: [
    'sessionId', 'pipelineType', 'mode', 'finalStage',
    'duration', 'agentCount', 'success',
  ],
  token_usage: [
    'sessionId', 'agent', 'provider', 'model',
    'inputTokens', 'outputTokens', 'totalTokens', 'estimatedCostUsd',
  ],
};

// ---------------------------------------------------------------------------
// Property Rules (required fields + numeric validation for structured types)
// ---------------------------------------------------------------------------

export const EVENT_PROPERTY_RULES = {
  session_started: {
    required: ['sessionId', 'pipelineType', 'mode'],
  },
  session_completed: {
    required: ['sessionId', 'pipelineType', 'mode', 'finalStage', 'duration', 'agentCount', 'success'],
    numeric: ['duration', 'agentCount'],
  },
  token_usage: {
    required: ['sessionId', 'agent', 'provider', 'model', 'inputTokens', 'outputTokens', 'totalTokens', 'estimatedCostUsd'],
    numeric: ['inputTokens', 'outputTokens', 'totalTokens', 'estimatedCostUsd'],
  },
};

// ---------------------------------------------------------------------------
// PII patterns — fields that MUST NEVER appear in telemetry
// Regex patterns aligned with chati-telemetry backend (case-insensitive)
// ---------------------------------------------------------------------------

const PII_PATTERNS = [
  /^(file_?)?path$/i, /^file_?name$/i, /^dir(ectory)?$/i, /^cwd$/i,
  /^api_?key$/i, /^(access_?)?token$/i, /^secret$/i, /^pass(word)?$/i,
  /^cred(ential)?s?$/i, /^e?mail$/i, /^user_?name$/i, /^(full_?)?name$/i,
  /^ip(_?addr(ess)?)?$/i, /^host_?name$/i, /^(source_?)?code$/i,
  /^prompt$/i, /^message$/i, /^content$/i, /^stack_?trace$/i,
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a telemetry event.
 *
 * @param {{ type: string, properties?: object }} event
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEvent(event) {
  const errors = [];

  if (!event || typeof event !== 'object') {
    return { valid: false, errors: ['Event must be an object'] };
  }

  if (!event.type || !TELEMETRY_EVENTS.includes(event.type)) {
    errors.push(`Unknown event type: "${event.type}". Valid: ${TELEMETRY_EVENTS.join(', ')}`);
  }

  const props = event.properties || {};

  // Check for PII field names (regex-based, aligned with backend)
  for (const key of Object.keys(props)) {
    if (PII_PATTERNS.some(pattern => pattern.test(key))) {
      errors.push(`PII field detected: "${key}" — must not be included in telemetry`);
    }
  }

  // Check for PII in values (paths, emails)
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string') {
      if (/\/users\//i.test(value) || /\\users\\/i.test(value) || /\/home\//i.test(value)) {
        errors.push(`PII detected in "${key}": value contains filesystem path`);
      }
      if (value.includes('@') && value.includes('.')) {
        errors.push(`PII detected in "${key}": value looks like an email`);
      }
    }
  }

  // Property-level validation for event types with rules
  const rules = EVENT_PROPERTY_RULES[event.type];
  if (rules && props) {
    const missing = rules.required.filter(key => !(key in props));
    if (missing.length > 0) {
      errors.push(`Missing required properties for "${event.type}": ${missing.join(', ')}`);
    }
    if (rules.numeric) {
      for (const key of rules.numeric) {
        if (key in props && (typeof props[key] !== 'number' || props[key] < 0)) {
          errors.push(`Property "${key}" must be a non-negative number`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
