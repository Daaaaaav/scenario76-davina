'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

// Helper: perform login + MFA to get a real adm_sess token
async function getValidAdmSess() {
  // Step 1: login
  const loginRes = await request(app)
    .post('/api/login')
    .send({ username: 'admin', password: 'admin123' })
    .set('Content-Type', 'application/json');

  assert.equal(loginRes.status, 200, 'login should return 200');

  // Extract pre_mfa_session from Set-Cookie header
  const setCookieHeader = loginRes.headers['set-cookie'];
  assert.ok(setCookieHeader, 'login response must set a cookie');
  const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader;
  const preMfaMatch = cookieStr.match(/pre_mfa_session=([^;]+)/);
  assert.ok(preMfaMatch, 'pre_mfa_session cookie must be set');
  const preMfaToken = preMfaMatch[1];

  // Step 2: verify-mfa with the pre_mfa_session cookie
  const mfaRes = await request(app)
    .post('/api/verify-mfa')
    .set('Cookie', `pre_mfa_session=${preMfaToken}`)
    .send({})
    .set('Content-Type', 'application/json');

  assert.equal(mfaRes.status, 200, 'verify-mfa should return 200');

  const mfaCookieHeader = mfaRes.headers['set-cookie'];
  assert.ok(mfaCookieHeader, 'verify-mfa must set adm_sess cookie');
  const mfaCookieStr = Array.isArray(mfaCookieHeader) ? mfaCookieHeader.join('; ') : mfaCookieHeader;
  const admSessMatch = mfaCookieStr.match(/adm_sess=([^;]+)/);
  assert.ok(admSessMatch, 'adm_sess cookie must be set after MFA');
  return admSessMatch[1];
}

// ── robots.txt ─────────────────────────────────────────────────────────────

test('GET /robots.txt returns 200 with both Disallow paths and recon flag', async (_t) => {
  const res = await request(app).get('/robots.txt');
  assert.equal(res.status, 200);
  assert.ok(res.text.includes('Disallow: /api/verify-mfa'), 'robots.txt must disallow /api/verify-mfa');
  assert.ok(res.text.includes('Disallow: /dashboard'), 'robots.txt must disallow /dashboard');
  assert.ok(res.text.includes('SCENARIO75{R3c0n_F1ag_R0b0ts_D1sc0v3r3d}'), 'robots.txt must contain recon flag');
});

// ── X-Powered-By ─────────────────────────────────────────────────────────

test('X-Powered-By header is SCENARIO75{Node.js}', async (_t) => {
  const res = await request(app).get('/');
  assert.equal(res.headers['x-powered-by'], 'SCENARIO75{Node.js}', 'X-Powered-By must be SCENARIO75{Node.js}');
});

// ── Dashboard authentication ─────────────────────────────────────────────

test('GET /dashboard without adm_sess returns 401', async (_t) => {
  const res = await request(app).get('/dashboard');
  assert.equal(res.status, 401);
});

test('GET /dashboard with invalid adm_sess returns 403', async (_t) => {
  const res = await request(app)
    .get('/dashboard')
    .set('Cookie', 'adm_sess=notavalidsession');
  assert.equal(res.status, 403);
});

test('GET /dashboard with valid adm_sess (via login+MFA flow) returns 200 with flag and xss-payload', async (_t) => {
  const admSess = await getValidAdmSess();
  const res = await request(app)
    .get('/dashboard')
    .set('Cookie', `adm_sess=${admSess}`);
  assert.equal(res.status, 200);
  assert.ok(res.text.includes('SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}'), 'dashboard must contain CTF flag');
  assert.ok(res.text.includes('xss-payload'), 'dashboard must contain xss-payload class');
});

// ── Login endpoint ────────────────────────────────────────────────────────

test('POST /api/login with admin/admin123 returns 200 and sets pre_mfa_session', async (_t) => {
  const res = await request(app)
    .post('/api/login')
    .send({ username: 'admin', password: 'admin123' })
    .set('Content-Type', 'application/json');
  assert.equal(res.status, 200);
  assert.equal(res.body.mfa_required, true);
  const cookies = res.headers['set-cookie'];
  assert.ok(cookies, 'must set a cookie');
  const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  assert.ok(cookieStr.includes('pre_mfa_session='), 'pre_mfa_session cookie must be set');
  // Intentionally NOT HttpOnly
  assert.ok(!cookieStr.includes('HttpOnly'), 'pre_mfa_session must NOT be HttpOnly (CTF XSS requirement)');
});

test('POST /api/login with wrong credentials returns 401', async (_t) => {
  const res = await request(app)
    .post('/api/login')
    .send({ username: 'admin', password: 'wrongpassword' })
    .set('Content-Type', 'application/json');
  assert.equal(res.status, 401);
});

// ── MFA endpoint ─────────────────────────────────────────────────────────

test('POST /api/verify-mfa without pre_mfa_session returns 401', async (_t) => {
  const res = await request(app)
    .post('/api/verify-mfa')
    .send({})
    .set('Content-Type', 'application/json');
  assert.equal(res.status, 401);
});

test('POST /api/verify-mfa with valid pre_mfa_session returns 200 and sets adm_sess', async (_t) => {
  // First login to get pre_mfa_session
  const loginRes = await request(app)
    .post('/api/login')
    .send({ username: 'admin', password: 'admin123' })
    .set('Content-Type', 'application/json');
  const cookieHeader = loginRes.headers['set-cookie'];
  const cookieStr = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
  const match = cookieStr.match(/pre_mfa_session=([^;]+)/);
  assert.ok(match, 'pre_mfa_session must be set after login');
  const preMfaToken = match[1];

  const res = await request(app)
    .post('/api/verify-mfa')
    .set('Cookie', `pre_mfa_session=${preMfaToken}`)
    .send({})
    .set('Content-Type', 'application/json');
  assert.equal(res.status, 200);
  assert.equal(res.body.authenticated, true);
  const mfaCookies = res.headers['set-cookie'];
  assert.ok(mfaCookies, 'must set adm_sess cookie');
  const mfaCookieStr = Array.isArray(mfaCookies) ? mfaCookies.join('; ') : mfaCookies;
  assert.ok(mfaCookieStr.includes('adm_sess='), 'adm_sess cookie must be set');
});

// ── WAF ───────────────────────────────────────────────────────────────────

test('POST /api/feedback with <script> tag is blocked by WAF (403)', async (_t) => {
  const res = await request(app)
    .post('/api/feedback')
    .send({ message: '<script>alert(1)</script>' })
    .set('Content-Type', 'application/json');
  assert.equal(res.status, 403);
  assert.ok(res.body.error && res.body.error.includes('WAF'), 'WAF block response expected');
});

test('POST /api/feedback with SVG event-handler payload is allowed (WAF bypass)', async (_t) => {
  const res = await request(app)
    .post('/api/feedback')
    .send({ message: '<svg onload=alert(1)>' })
    .set('Content-Type', 'application/json');
  assert.equal(res.status, 200);
});

// ── Feedback basic ────────────────────────────────────────────────────────

test('POST /api/feedback with valid body returns 200', async (_t) => {
  const res = await request(app)
    .post('/api/feedback')
    .send({ message: 'Test feedback message' })
    .set('Content-Type', 'application/json');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test('POST /api/feedback with missing message returns 400', async (_t) => {
  const res = await request(app)
    .post('/api/feedback')
    .send({})
    .set('Content-Type', 'application/json');
  assert.equal(res.status, 400);
});
