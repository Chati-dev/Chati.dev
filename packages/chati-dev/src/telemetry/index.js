/**
 * @fileoverview Telemetry public API.
 *
 * Provides track(), flush(), and configuration utilities.
 * All telemetry is opt-in and anonymous.
 */

export { TELEMETRY_EVENTS, validateEvent, EVENT_PROPERTY_RULES } from './schema.js';
export { getTelemetryConfig, isEnabled, setEnabled, getAnonymousId } from './config.js';
export { initCollector, track, flush, getBufferSize, getStatus } from './collector.js';
export { sendEvents, DEFAULT_ENDPOINT } from './sender.js';
