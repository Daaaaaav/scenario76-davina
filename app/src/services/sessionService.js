'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');

const preMfaSessions = new Map(); // token -> { username, created_at }
const admSessions = new Map();    // token -> { username, created_at }

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createPreMfaSession(username) {
  const token = generateToken();
  preMfaSessions.set(token, { username, created_at: Date.now() });
  logger.debug('pre_mfa_session created for user: ' + username);
  return token;
}

function createAdmSession(username) {
  const token = generateToken();
  admSessions.set(token, { username, created_at: Date.now() });
  logger.debug('adm_sess created for user: ' + username);
  return token;
}

function validatePreMfaSession(token) {
  return preMfaSessions.get(token) || null;
}

function validateAdmSession(token) {
  return admSessions.get(token) || null;
}

function clearPreMfaSession(token) {
  preMfaSessions.delete(token);
}

module.exports = {
  createPreMfaSession,
  createAdmSession,
  validatePreMfaSession,
  validateAdmSession,
  clearPreMfaSession,
  generateToken,
  // Expose maps for testing only
  _preMfaSessions: preMfaSessions,
  _admSessions: admSessions,
};
