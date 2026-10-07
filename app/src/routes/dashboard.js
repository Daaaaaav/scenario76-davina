'use strict';

const path = require('path');
const express = require('express');
const telemetry = require('../services/telemetryService');

const router = express.Router();

/**
 * GET /dashboard
 *
 * Serves the admin dashboard view.
 * CTF context: this page will eventually display the captured flag
 * and the XSS payload container, but those are not implemented here.
 */
router.get('/dashboard', (req, res) => {
  telemetry.logEvent('dashboard_accessed', { url: req.url });
  res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

module.exports = router;
