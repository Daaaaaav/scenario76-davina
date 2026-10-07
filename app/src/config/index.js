'use strict';

/**
 * Application configuration.
 * Reads from process.env with safe defaults for local development.
 * HOST is validated to prevent accidental 0.0.0.0 binding.
 */

const HOST = process.env.HOST || '127.0.0.1';

// Safety: reject 0.0.0.0 at config load time
if (HOST === '0.0.0.0') {
  throw new Error(
    'HOST=0.0.0.0 is not permitted. ' +
    'This application must not be exposed to the network during local development. ' +
    'Set HOST=127.0.0.1 or leave HOST unset.'
  );
}

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST,
  PORT: parseInt(process.env.PORT, 10) || 3075,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  APP_NAME: process.env.APP_NAME || 'Scenario75 Cyber Range',
};

module.exports = config;
