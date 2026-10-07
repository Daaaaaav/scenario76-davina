'use strict';

const logger = require('../utils/logger');

/**
 * WAF middleware — intentionally weak filtering for CTF training.
 *
 * BLOCKS: basic <script> tags (HTTP 403) — detectable baseline
 * ALLOWS: HTML5/SVG event-handler payloads (e.g. <svg onload=...>) — intended WAF bypass
 * BLOCKS: direct document.cookie access — exact string only
 * ALLOWS: split-string cookie access (e.g. "cook"+"ie") — intended training bypass
 *
 * This intentional weakness is part of the CTF scenario: students learn
 * that signature-only WAFs are insufficient.
 */
function waf(req, res, next) {
  // Collect strings to check: body fields, query params, User-Agent
  const toCheck = [];

  if (req.body) {
    if (typeof req.body === 'object') {
      Object.values(req.body).forEach(v => {
        if (typeof v === 'string') { toCheck.push(v); }
      });
    } else if (typeof req.body === 'string') {
      toCheck.push(req.body);
    }
  }

  // Check query params
  if (req.query) {
    Object.values(req.query).forEach(v => {
      if (typeof v === 'string') { toCheck.push(v); }
    });
  }

  // Check User-Agent
  const ua = req.headers['user-agent'];
  if (ua) { toCheck.push(ua); }

  for (const value of toCheck) {
    // Block basic <script> tags (case-insensitive)
    if (/<script[\s>]/i.test(value) || /<\/script>/i.test(value)) {
      logger.warn(`WAF: blocked script tag from ${req.ip} on ${req.url}`);
      return res.status(403).json({
        error: 'WAF: Blocked',
        reason: 'Malicious script tag detected',
      });
    }

    // Block direct document.cookie access (exact pattern)
    // Allow split-string patterns like "cook"+"ie" or document["coo"+"kie"]
    if (/document\.cookie(?!["'\]])/.test(value)) {
      logger.warn(`WAF: blocked document.cookie access from ${req.ip} on ${req.url}`);
      return res.status(403).json({
        error: 'WAF: Blocked',
        reason: 'Direct cookie access attempt detected',
      });
    }

    // SVG/HTML5 event-handler payloads are intentionally allowed (WAF bypass training)
    // <svg onload=...>, <img onerror=...>, etc. pass through
  }

  next();
}

module.exports = waf;
