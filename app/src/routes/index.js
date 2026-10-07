'use strict';

const path = require('path');
const express = require('express');
const feedbackRouter = require('./feedback');
const authRouter = require('./auth');
const dashboardRouter = require('./dashboard');

const router = express.Router();

// Serve the main application UI
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

// /health — used by Docker health check and verify_lab.sh
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'scenario75-cyber-range' });
});

/**
 * robots.txt — intentional CTF reconnaissance clues.
 * The disallowed paths hint at interesting endpoints for Red Team students.
 * NOTE: This is a deliberate part of the CTF scenario design.
 */
router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    'User-agent: *\n' +
    'Disallow: /api/verify-mfa\n' +
    'Disallow: /dashboard\n'
  );
});

// Sub-routers
router.use('/', feedbackRouter);
router.use('/', authRouter);
router.use('/', dashboardRouter);

module.exports = router;
