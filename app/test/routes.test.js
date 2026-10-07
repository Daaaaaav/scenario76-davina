'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

// A well-formed adm_sess token (64 lowercase hex chars) — the format that a
// legitimately-issued token has.  The scaffolding validator accepts any token
// matching this pattern; the CTF implementation will additionally cross-check
// against the in-memory session store.
const VALID_ADM_SESS = 'a'.repeat(64); // 64 × 'a' — valid hex, correct length

test('GET /robots.txt returns 200 and contains Disallow', async (_t) => {
  const res = await request(app).get('/robots.txt');
  assert.equal(res.status, 200);
  assert.ok(res.text.includes('Disallow'), 'robots.txt should contain Disallow directives');
});

// ── Dashboard authentication ──────────────────────────────────────────────

test('GET /dashboard without adm_sess returns 401', async (_t) => {
  const res = await request(app).get('/dashboard');
  assert.equal(res.status, 401, 'unauthenticated request should be denied with 401');
});

test('GET /dashboard with an invalid adm_sess value returns 403', async (_t) => {
  const res = await request(app)
    .get('/dashboard')
    .set('Cookie', 'adm_sess=notavalidsession');
  assert.equal(res.status, 403, 'malformed session token should be denied with 403');
});

test('GET /dashboard with a valid adm_sess cookie returns 200 and contains the flag', async (_t) => {
  const res = await request(app)
    .get('/dashboard')
    .set('Cookie', `adm_sess=${VALID_ADM_SESS}`);
  assert.equal(res.status, 200, 'valid session should be granted access');
  assert.ok(
    res.text.includes('SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}'),
    'authenticated response must contain the CTF flag'
  );
});

test('GET /dashboard with a valid adm_sess cookie returns the xss-payload container', async (_t) => {
  const res = await request(app)
    .get('/dashboard')
    .set('Cookie', `adm_sess=${VALID_ADM_SESS}`);
  assert.equal(res.status, 200);
  assert.ok(res.text.includes('xss-payload'), 'authenticated dashboard must include the XSS reflection container');
});

// ── Feedback ─────────────────────────────────────────────────────────────

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

// ── MFA endpoint ──────────────────────────────────────────────────────────

test('POST /api/verify-mfa returns 200', async (_t) => {
  const res = await request(app)
    .post('/api/verify-mfa')
    .send({})
    .set('Content-Type', 'application/json');
  assert.equal(res.status, 200);
  assert.equal(res.body.exists, true);
});

// ── Miscellaneous ─────────────────────────────────────────────────────────

test('GET / cannot be used for feedback submission (method not allowed)', async (_t) => {
  const res = await request(app)
    .post('/')
    .send({ message: 'test' })
    .set('Content-Type', 'application/json');
  // POST / should not 200 — it's not a feedback route
  assert.notEqual(res.status, 200);
});
