'use strict';

/**
 * Application configuration.
 *
 * HOST BINDING MODEL
 * ──────────────────
 * Inside a Docker container, Node must listen on 0.0.0.0 (all container
 * interfaces) so that Nginx — running in a separate container on the same
 * Docker bridge network — can reach it via the service name "app".
 *
 * Binding to 127.0.0.1 inside a container only exposes the loopback
 * interface of that container; other containers on the bridge cannot
 * connect to it, so Nginx would get ECONNREFUSED.
 *
 * WHY THIS IS SAFE
 * ────────────────
 * The security boundary is NOT the bind address — it is Docker's host port
 * publication.  docker-compose.yml uses `expose` (not `ports`) for the app
 * service, so port 3075 is NEVER reachable from the host or the internet.
 * The only published port is 127.0.0.1:3075:80 on the Nginx service, which
 * is itself bound only to the host loopback.  A client outside the host
 * cannot reach either service.
 *
 * In local development (outside Docker, NODE_ENV=development) we still
 * default to 127.0.0.1 to avoid accidentally exposing the dev server on
 * the host network.
 */

const IN_CONTAINER = process.env.IN_CONTAINER === 'true';
const DEFAULT_HOST  = IN_CONTAINER ? '0.0.0.0' : '127.0.0.1';
const HOST          = process.env.HOST || DEFAULT_HOST;

// Guard: never allow 0.0.0.0 outside a container environment.
// This preserves the safe default for local development while permitting
// the correct container-internal bind address when explicitly opted in.
if (HOST === '0.0.0.0' && !IN_CONTAINER) {
  throw new Error(
    'HOST=0.0.0.0 is only permitted when IN_CONTAINER=true. ' +
    'Running with 0.0.0.0 outside a container would expose the server ' +
    'on all host interfaces.  Set HOST=127.0.0.1 for local development.'
  );
}

const config = {
  NODE_ENV:     process.env.NODE_ENV || 'development',
  HOST,
  PORT:         parseInt(process.env.PORT, 10) || 3075,
  LOG_LEVEL:    process.env.LOG_LEVEL || 'info',
  APP_NAME:     process.env.APP_NAME || 'Scenario75 Cyber Range',
  IN_CONTAINER,
};

module.exports = config;
