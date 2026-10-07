'use strict';

const express = require('express');
const telemetry = require('../services/telemetryService');
const sessionService = require('../services/sessionService');

const router = express.Router();

// CTF training credentials — intentionally weak (required for scenario)
const CTF_USERNAME = 'admin';
const CTF_PASSWORD = 'admin123';

/**
 * POST /api/login
 * Accept CTF training credentials, issue pre_mfa_session.
 * pre_mfa_session is intentionally NOT HttpOnly — required for XSS training scenario.
 */
router.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  telemetry.logEvent('login_attempted', { url: req.url });

  if (username === CTF_USERNAME && password === CTF_PASSWORD) {
    const token = sessionService.createPreMfaSession(username);
    // Intentionally NOT HttpOnly — CTF XSS training scenario requires JS cookie access
    res.cookie('pre_mfa_session', token, {
      path: '/',
      sameSite: 'Lax',
      httpOnly: false,
    });
    return res.status(200).json({
      message: 'Credentials accepted. MFA required.',
      mfa_required: true,
    });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

/**
 * POST /api/verify-mfa
 * Exchange a valid pre_mfa_session for an adm_sess.
 * This is the MFA bypass vulnerability: no actual MFA code is checked.
 * The simulated attacker path does NOT reach this endpoint (enforced by
 * the deterministic log timeline, not application logic).
 */
router.post('/api/verify-mfa', (req, res) => {
  const preMfaToken = req.cookies && req.cookies.pre_mfa_session;
  telemetry.logEvent('mfa_attempted', { url: req.url });

  if (!preMfaToken) {
    return res.status(401).json({ error: 'No active session' });
  }

  const session = sessionService.validatePreMfaSession(preMfaToken);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // Issue adm_sess — intentional MFA bypass (no code verification)
  const admToken = sessionService.createAdmSession(session.username);
  sessionService.clearPreMfaSession(preMfaToken);

  res.cookie('adm_sess', admToken, {
    httpOnly: true,
    path: '/',
    sameSite: 'Strict',
  });

  telemetry.logEvent('mfa_bypassed', { url: req.url });

  return res.status(200).json({
    message: 'MFA verified. Session established.',
    authenticated: true,
  });
});

module.exports = router;
