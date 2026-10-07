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
 */

// Log path configuration — local dev uses relative path; VM uses /opt/admin/logs/
const LOG_DIR = process.env.LOG_DIR ||
  (process.env.NODE_ENV === 'production'
    ? '/opt/admin/logs'
    : path.join(process.cwd(), 'logs'));

const KNOWN_EVENTS = [
  'request_received',
  'feedback_submitted',
  'login_attempted',
  'mfa_attempted',
  'mfa_bypassed',
  'dashboard_accessed',
  'dashboard_denied_no_session',
  'dashboard_denied_invalid_session',
  'waf_blocked',
  'waf_bypass',
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
