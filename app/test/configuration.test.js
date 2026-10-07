'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('config exports expected keys', (_t) => {
  // Reset module registry to get a clean config load with default env
  delete process.env.HOST;
  delete process.env.PORT;
  delete process.env.LOG_LEVEL;
  delete process.env.NODE_ENV;

  // Clear require cache to re-evaluate config with clean env
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('config')) { delete require.cache[key]; }
  });

  const config = require('../src/config');
  assert.ok('NODE_ENV' in config, 'config should have NODE_ENV');
  assert.ok('HOST' in config, 'config should have HOST');
  assert.ok('PORT' in config, 'config should have PORT');
  assert.ok('LOG_LEVEL' in config, 'config should have LOG_LEVEL');
});

test('HOST defaults to 127.0.0.1', (_t) => {
  delete process.env.HOST;
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('config')) { delete require.cache[key]; }
  });
  const config = require('../src/config');
  assert.equal(config.HOST, '127.0.0.1');
});

test('PORT defaults to 3075', (_t) => {
  delete process.env.PORT;
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('config')) { delete require.cache[key]; }
  });
  const config = require('../src/config');
  assert.equal(config.PORT, 3075);
});

test('HOST validation rejects 0.0.0.0', (_t) => {
  process.env.HOST = '0.0.0.0';
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('config')) { delete require.cache[key]; }
  });
  assert.throws(
    () => require('../src/config'),
    /0\.0\.0\.0 is not permitted/
  );
  delete process.env.HOST;
});
