'use strict';

const http = require('http');
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const { HOST, PORT, IN_CONTAINER } = config;

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  logger.info(`Scenario75 Cyber Range listening on http://${HOST}:${PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  if (IN_CONTAINER) {
    logger.info(
      'Container mode: Node is bound to 0.0.0.0 (all container interfaces). ' +
      'The app port is not published to the host — Nginx is the only published endpoint.'
    );
  }
});

server.on('error', (err) => {
  logger.error('Server error:', err.message);
  process.exit(1);
});

module.exports = server;
