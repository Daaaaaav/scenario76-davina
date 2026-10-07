'use strict';

const express = require('express');
const telemetry = require('../services/telemetryService');

const router = express.Router();

/**
 * POST /api/verify-mfa
 *
 * SCAFFOLDING STAGE: Returns a safe placeholder response.
 *
 * TODO (CTF IMPLEMENTATION STAGE — isolated cyber-range only):
 *   TODO-MFA-1: Implement the MFA bypass simulation:
 *               accept pre_mfa_session cookie, issue adm_sess cookie
 *               WITHOUT actually verifying the MFA code, to simulate
 *               the session replay / MFA bypass vulnerability.
 *   TODO-MFA-2: Set pre_mfa_session with HttpOnly=false so it is
 *               accessible to JavaScript (intentional CTF vulnerability).
 *   TODO-MFA-3: Allow session replay — accepting a previously-seen
 *               pre_mfa_session token to gain adm_sess.
 *
 * These TODO items MUST remain unimplemented until the application is
 * deployed inside an isolated cyber-range VM.
 */
router.post('/api/verify-mfa', (req, res) => {
  telemetry.logEvent('mfa_attempted', { url: req.url });

  return res.status(200).json({
    exists: true,
    message: 'MFA verification endpoint — CTF simulation pending',
  });
});

module.exports = router;
