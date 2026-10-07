'use strict';

const express = require('express');
const telemetry = require('../services/telemetryService');

const router = express.Router();

/**
 * The training flag is only returned inside the authenticated dashboard
 * response.  It must never appear in static HTML served to unauthenticated
 * requests.
 */
const CTF_FLAG = 'SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}';

/**
 * requireAdmSession
 *
 * Gate that enforces the adm_sess cookie.  Returns 401 when the cookie is
 * absent and 403 when the value is present but invalid.
 *
 * CTF context: the intended attack path is to obtain adm_sess by exploiting
 * the MFA bypass (session replay via a stolen pre_mfa_session).  A student
 * who supplies a valid adm_sess cookie reaches the authenticated dashboard
 * and reads the flag; everyone else is denied here.
 */
function requireAdmSession(req, res, next) {
  const admSess = req.cookies && req.cookies.adm_sess;

  if (!admSess) {
    telemetry.logEvent('dashboard_denied_no_session', { url: req.url });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'A valid adm_sess cookie is required to access this resource.',
    });
  }

  // Validate the token against the session store.
  // In the CTF implementation stage (TODO-SESSION-3) the session store will
  // be populated by the MFA-bypass route.  For now we accept any non-empty
  // token that was legitimately issued by the auth route so tests can work
  // with a known value, and reject obviously forged or empty strings.
  if (!isValidAdmSess(admSess)) {
    telemetry.logEvent('dashboard_denied_invalid_session', { url: req.url });
    return res.status(403).json({
      error: 'Forbidden',
      message: 'The supplied adm_sess cookie is not valid.',
    });
  }

  next();
}

/**
 * Validate an adm_sess token.
 *
 * SCAFFOLDING STAGE: accepts any hex string of the correct length (64 chars,
 * 32 random bytes).  The CTF implementation stage will cross-check against an
 * in-memory session store populated by the MFA endpoint.
 *
 * A token is rejected if:
 *   - it is not exactly 64 hex characters, OR
 *   - it contains characters outside [0-9a-f]
 *
 * This rejects empty strings, UUIDs, and obviously crafted values while
 * allowing any properly-issued token to pass.
 *
 * @param {string} token
 * @returns {boolean}
 */
function isValidAdmSess(token) {
  return typeof token === 'string' && /^[0-9a-f]{64}$/.test(token);
}

/**
 * GET /dashboard
 *
 * Returns the admin dashboard HTML with the CTF flag and the XSS reflection
 * container embedded.  The flag is only present in this authenticated response
 * — it is NOT in the static dashboard.html file served to unauthenticated
 * visitors.
 *
 * Attack path for students:
 *   1. Submit a feedback payload that steals the victim's pre_mfa_session
 *      via XSS (the session cookie is intentionally not HttpOnly in CTF mode).
 *   2. Replay pre_mfa_session to /api/verify-mfa to obtain adm_sess without
 *      completing MFA (the MFA bypass vulnerability).
 *   3. Present adm_sess here to reach this handler and read the flag.
 */
router.get('/dashboard', requireAdmSession, (req, res) => {
  telemetry.logEvent('dashboard_accessed', { url: req.url });

  // Reflect the query-string `xss` parameter inside the .xss-payload element.
  // This is the intentional XSS reflection point for the CTF training scenario.
  // The value is inserted as raw HTML — deliberately unsafe — so that a crafted
  // payload submitted via the feedback form and echoed back here demonstrates
  // stored/reflected XSS combined with cookie theft and session replay.
  //
  // TODO (CTF IMPLEMENTATION STAGE): wire this to the last stored feedback
  //   message so the stored-XSS demo works end-to-end without a query param.
  const xssPayload = (req.query.xss || '') + '';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin Dashboard — Scenario75 Cyber Range</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; background: #f5f5f5; }
    h1 { color: #1a1a2e; }
    .panel { background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.1); margin-bottom: 20px; }
    .flag { font-family: monospace; font-size: 1.1em; background: #eef; padding: 8px 12px; border-radius: 4px; border: 1px solid #99c; }
  </style>
</head>
<body>
  <h1>Admin Dashboard</h1>

  <div class="panel">
    <h2>System Status</h2>
    <p>Service: <strong>Scenario75 Cyber Range</strong></p>
    <p>Status: <strong>Operational</strong></p>
  </div>

  <div class="panel">
    <h2>Assessment Flag</h2>
    <p class="flag">${CTF_FLAG}</p>
  </div>

  <div class="panel">
    <h2>Feedback Output</h2>
    <!-- XSS reflection point — intentional CTF vulnerability -->
    <div class="xss-payload">${xssPayload}</div>
  </div>
</body>
</html>`);
});

module.exports = router;
