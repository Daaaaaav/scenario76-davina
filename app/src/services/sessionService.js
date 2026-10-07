'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Session Service
 *
 * Documents the future CTF session model.
 *
 * SESSION MODEL (eventual CTF implementation):
 * ─────────────────────────────────────────────
 * pre_mfa_session
 *   Issued after username/password validation, before MFA completion.
 *   Eventually will be set with HttpOnly=false (intentional CTF vulnerability)
 *   so that it is accessible to JavaScript for the XSS/session-theft demo.
 *
 * adm_sess
 *   Issued after MFA verification to grant administrative access.
 *   Eventually the bypass will accept a replayed pre_mfa_session
 *   without checking MFA, simulating the session replay vulnerability.
 *
 * SCAFFOLDING STAGE BEHAVIOR:
 * ─────────────────────────────
 * - Tokens are cryptographically random (safe, not predictable).
 * - No cookies are set with HttpOnly=false.
 * - No session replay is possible.
 * - All CTF-vulnerable behavior is marked TODO below.
 *
 * TODO (CTF IMPLEMENTATION STAGE — isolated cyber-range only):
 *   TODO-SESSION-1: Set pre_mfa_session cookie with HttpOnly=false,
 *                   enabling JavaScript to read it for the XSS chain.
 *   TODO-SESSION-2: Implement session replay — allow a pre_mfa_session
 *                   to be exchanged for adm_sess without MFA verification.
 *   TODO-SESSION-3: Issue adm_sess without a proper MFA check to simulate
 *                   the authentication bypass vulnerability.
 *   TODO-SESSION-4: Make pre_mfa_session tokens guessable or short to
 *                   enable brute-force as an alternative attack path.
 */

/**
 * Generate a cryptographically random session token.
 * Safe for scaffolding stage — NOT intentionally weak.
 * @returns {string} hex token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a safe placeholder pre-MFA session.
 * In the final CTF this will be set as a cookie with HttpOnly=false.
 * @returns {{tokenName: string, token: string}}
 */
function createPreMfaSession() {
  const token = generateToken();
  logger.debug('pre_mfa_session placeholder created (safe scaffolding token)');
  // TODO-SESSION-1: set HttpOnly=false when issuing the real cookie
  return { tokenName: 'pre_mfa_session', token };
}

/**
 * Create a safe placeholder admin session.
 * In the final CTF this will be issued without proper MFA verification.
 * @returns {{tokenName: string, token: string}}
 */
function createAdminSession() {
  const token = generateToken();
  logger.debug('adm_sess placeholder created (safe scaffolding token)');
  // TODO-SESSION-3: issue without MFA check in CTF implementation
  return { tokenName: 'adm_sess', token };
}

module.exports = {
  createPreMfaSession,
  createAdminSession,
  generateToken,
};
