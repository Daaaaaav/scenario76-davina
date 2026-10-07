'use strict';

const express = require('express');
const logger = require('../utils/logger');
const telemetry = require('../services/telemetryService');

const router = express.Router();

/**
 * POST /api/feedback
 *
 * Accepts a feedback message.
 * Validates that the body contains a non-empty 'message' field.
 * Does NOT execute, render, or persist the input as HTML.
 * Does NOT forward data to any external service.
 *
 * CTF context: This endpoint will eventually be the injection point
 * for the XSS demonstration, but that behavior is NOT implemented here.
 */
router.post('/api/feedback', (req, res) => {
  const body = req.body;

  if (!body || typeof body.message !== 'string' || body.message.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Invalid request: "message" field is required and must be a non-empty string.',
    });
  }

  telemetry.logEvent('feedback_submitted', { url: req.url });
  logger.info('Feedback received (content not logged for privacy)');

  return res.status(200).json({
    success: true,
    message: 'Feedback received',
  });
});

module.exports = router;
