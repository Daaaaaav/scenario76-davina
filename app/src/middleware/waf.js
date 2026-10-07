'use strict';

const logger = require('../utils/logger');

/**
 * WAF (Web Application Firewall) middleware.
 *
 * SCAFFOLDING STAGE: This is a SAFE placeholder only.
 * It inspects request bodies and logs that inspection occurred,
 * but does not block, modify, or exploit any input.
 *
 * TODO (CTF IMPLEMENTATION STAGE — isolated cyber-range only):
 *   TODO-WAF-1: Block a basic <script> payload with HTTP 403 to establish
 *               a detectable baseline that defenders can observe in logs.
 *   TODO-WAF-2: Intentionally demonstrate an HTML5/SVG WAF bypass inside
 *               the isolated CTF to show how naive keyword filtering fails
 *               (e.g. <svg onload=...>, <img src=x onerror=...>).
 *   TODO-WAF-3: Demonstrate weak keyword filtering — the filter catches
 *               '<script>' but misses obfuscated variants, teaching
 *               defenders that signature-only WAFs are insufficient.
 *   TODO-WAF-4: Provide a controlled test case for the vulnerability so
 *               Blue Team students can observe WAF evasion in telemetry.
 *
 * These TODO items MUST remain unimplemented until the application is
 * deployed inside an isolated cyber-range VM with no external connectivity.
 */
function waf(req, res, next) {
  // Log that WAF inspection is occurring (safe, no side-effects)
  if (req.body !== undefined) {
    logger.debug(`WAF: inspected request body for ${req.method} ${req.url}`);
  }

  // SCAFFOLDING: pass all requests through without modification
  next();
}

module.exports = waf;
