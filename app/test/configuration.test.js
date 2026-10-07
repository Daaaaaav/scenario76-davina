'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// Save original env values to restore after each test
const origNodeEnv = process.env.NODE_ENV;
const origHost = process.env.HOST;
const origInContainer = process.env.IN_CONTAINER;

function clearConfigCache() {
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('config')) { delete require.cache[key]; }
  });
}

test('config exports expected keys', (_t) => {
  delete process.env.HOST;
  delete process.env.PORT;
  delete process.env.LOG_LEVEL;
  delete process.env.IN_CONTAINER;
  process.env.NODE_ENV = 'test';

  clearConfigCache();

  const config = require('../src/config');
  assert.ok('NODE_ENV' in config, 'config should have NODE_ENV');
  assert.ok('HOST' in config, 'config should have HOST');
  assert.ok('PORT' in config, 'config should have PORT');
  assert.ok('LOG_LEVEL' in config, 'config should have LOG_LEVEL');

  // Restore
  process.env.NODE_ENV = origNodeEnv || 'test';
});

test('HOST defaults to 127.0.0.1', (_t) => {
  delete process.env.HOST;
  delete process.env.IN_CONTAINER;
  process.env.NODE_ENV = 'test';

  clearConfigCache();
  const config = require('../src/config');
  assert.equal(config.HOST, '127.0.0.1');

  // Restore
  process.env.NODE_ENV = origNodeEnv || 'test';
});

test('PORT defaults to 3075', (_t) => {
  delete process.env.PORT;
  process.env.NODE_ENV = 'test';

  clearConfigCache();
  const config = require('../src/config');
  assert.equal(config.PORT, 3075);

  // Restore
  process.env.NODE_ENV = origNodeEnv || 'test';
});

test('HOST validation rejects 0.0.0.0 outside a container', (_t) => {
  process.env.HOST = '0.0.0.0';
  delete process.env.IN_CONTAINER; // ensure we are NOT in container mode
  process.env.NODE_ENV = 'test';

  clearConfigCache();
  assert.throws(
    () => require('../src/config'),
    /IN_CONTAINER=true/  // message: only permitted when IN_CONTAINER=true
  );

  // Restore
  delete process.env.HOST;
  if (origHost !== undefined) { process.env.HOST = origHost; }
  process.env.NODE_ENV = origNodeEnv || 'test';
});

test('HOST is 0.0.0.0 when IN_CONTAINER=true', (_t) => {
  process.env.IN_CONTAINER = 'true';
  delete process.env.HOST;
  process.env.NODE_ENV = 'test';

  clearConfigCache();
  const config = require('../src/config');
  assert.equal(config.HOST, '0.0.0.0', 'HOST should be 0.0.0.0 when IN_CONTAINER=true');

  // Restore
  delete process.env.IN_CONTAINER;
  if (origInContainer !== undefined) { process.env.IN_CONTAINER = origInContainer; }
  process.env.NODE_ENV = origNodeEnv || 'test';
});
