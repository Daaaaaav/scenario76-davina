'use strict';

const path = require('path');
const logger = require('../utils/logger');

/**
 * Telemetry Service
 *
 * Documents the log paths used in the cyber-range VM deployment:
 *   /opt/admin/logs/access.log  — HTTP access events
 *   /opt/admin/logs/error.log   — Application errors
 *
 * In local development, log paths are configurable via environment
 * variables or fall back to a local ./logs/ directory.
 *
 * SCAFFOLDING STAGE: Only structured event logging is implemented.
 * No fake attack telemetry is generated.
 *
 * TODO (CTF IMPLEMENTATION STAGE):
 *   TODO-TELEMETRY-1: Generate deterministic simulated attack timeline
 *                     (reconnaissance, WAF probe, XSS attempt, session replay)
 *                     so Blue Team students have realistic log data to analyze.
 *   TODO-TELEMETRY-2: Rotate logs on a schedule to simulate a live environment.
 *   TODO-TELEMETRY-3: Write structured JSON log entries to the VM log paths
 *                     (/opt/admin/logs/access.log, /opt/admin/logs/error.log).
 */

// Log path configuration — local dev uses relative path; VM uses /opt/admin/logs/
const LOG_DIR = process.env.LOG_DIR ||
  (process.env.NODE_ENV === 'production'
    ? '/opt/admin/logs'
    : path.join(process.cwd(), 'logs'));

const KNOWN_EVENTS = [
  'request_received',
  'feedback_submitted',
  'mfa_attempted',
  'dashboard_accessed',
];

/**
 * Log a named telemetry event.
 * @param {string} eventName - One of the known event names.
 * @param {object} [meta={}]  - Additional metadata (no PII).
 */
function logEvent(eventName, meta = {}) {
  if (!KNOWN_EVENTS.includes(eventName)) {
    logger.warn(`telemetry: unknown event "${eventName}"`);
  }
  logger.info(`telemetry: ${eventName}`, { ...meta, logDir: LOG_DIR });
}

module.exports = {
  logEvent,
  LOG_DIR,
  KNOWN_EVENTS,
};
