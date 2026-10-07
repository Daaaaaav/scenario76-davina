'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('GET /robots.txt returns 200 and contains Disallow', async (_t) => {
  const res = await request(app).get('/robots.txt');
  assert.equal(res.status, 200);
  assert.ok(res.text.includes('Disallow'), 'robots.txt should contain Disallow directives');
});

test('GET /dashboard returns 200', async (_t) => {
  const res = await request(app).get('/dashboard');
  assert.equal(res.status, 200);
});

test('POST /api/feedback with valid body returns 200 and success', async (_t) => {
  const res = await request(app)
    .post('/api/feedback')
    .send({ message: 'Test feedback message' })
    .set('Content-Type', 'application/json');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test('POST /api/feedback with missing body returns 400', async (_t) => {
  const res = await request(app)
    .post('/api/feedback')
    .send({})
    .set('Content-Type', 'application/json');
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('POST /api/feedback with empty message returns 400', async (_t) => {
  const res = await request(app)
    .post('/api/feedback')
    .send({ message: '   ' })
    .set('Content-Type', 'application/json');
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('POST /api/verify-mfa returns 200', async (_t) => {
  const res = await request(app)
    .post('/api/verify-mfa')
    .send({})
    .set('Content-Type', 'application/json');
  assert.equal(res.status, 200);
  assert.equal(res.body.exists, true);
});

test('GET / cannot be used for feedback submission (method not allowed)', async (_t) => {
  const res = await request(app)
    .post('/')
    .send({ message: 'test' })
    .set('Content-Type', 'application/json');
  // POST / should not 200 — it's not a feedback route
  assert.notEqual(res.status, 200);
});
