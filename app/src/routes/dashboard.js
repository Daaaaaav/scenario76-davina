'use strict';

const express = require('express');
const telemetry = require('../services/telemetryService');
const sessionService = require('../services/sessionService');

const router = express.Router();

const CTF_FLAG = 'SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}';

function requireAdmSession(req, res, next) {
  const admSess = req.cookies && req.cookies.adm_sess;

  if (!admSess) {
    telemetry.logEvent('dashboard_denied_no_session', { url: req.url });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'A valid adm_sess cookie is required to access this resource.',
    });
  }

  const session = sessionService.validateAdmSession(admSess);
  if (!session) {
    telemetry.logEvent('dashboard_denied_invalid_session', { url: req.url });
    return res.status(403).json({
      error: 'Forbidden',
      message: 'The supplied adm_sess cookie is not valid.',
    });
  }

  req.ctfSession = session;
  next();
}

router.get('/dashboard', requireAdmSession, (req, res) => {
  telemetry.logEvent('dashboard_accessed', { url: req.url });

  const xssPayload = (req.query.msg || '') + '';
  const username = (req.ctfSession && req.ctfSession.username) || 'admin';

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
    .xss-payload { min-height: 24px; }
  </style>
</head>
<body>
  <script>var ctfFlag = '${CTF_FLAG}';</script>
  <h1>Admin Dashboard</h1>
  <div class="panel">
    <h2>System Status</h2>
    <p>Service: <strong>Scenario75 Cyber Range</strong></p>
    <p>Status: <strong>Operational</strong></p>
    <p>User: <strong>${username}</strong></p>
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
