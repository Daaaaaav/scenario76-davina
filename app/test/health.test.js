'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('GET /health returns 200 with ok status', async (_t) => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('GET / returns 200', async (_t) => {
  const res = await request(app).get('/');
  assert.equal(res.status, 200);
});
