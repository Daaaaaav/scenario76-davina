'use strict';

const logger = require('../utils/logger');
const config = require('../config');

/**
 * Express error-handling middleware.
 * Must have exactly 4 arguments to be recognised by Express.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(`Unhandled error: ${err.message}`);

  const status = err.status || err.statusCode || 500;

  const body = {
    error: true,
    message: err.message || 'Internal Server Error',
  };

  // Do not leak stack traces in production
  if (config.NODE_ENV !== 'production' && err.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = errorHandler;
