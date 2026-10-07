'use strict';

const http = require('http');
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const { HOST, PORT } = config;

// Safety assertion: never bind to 0.0.0.0 in local development
if (HOST === '0.0.0.0') {
  logger.error('HOST is set to 0.0.0.0 — this is not allowed. Aborting.');
  process.exit(1);
}

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  logger.info(`Scenario75 Cyber Range listening on http://${HOST}:${PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
});

server.on('error', (err) => {
  logger.error('Server error:', err.message);
  process.exit(1);
});

module.exports = server;
