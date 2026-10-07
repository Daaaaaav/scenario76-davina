#!/usr/bin/env bash
# =============================================================================
# verify_lab.sh — Scenario75 Cyber Range lab verification
# Tests all required security behaviors.
# =============================================================================
set -uo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3075}"
PASS_COUNT=0
FAIL_COUNT=0
TOTAL=14

# Temp cookie jar
COOKIE_JAR=$(mktemp /tmp/ctf_cookies_XXXXXX)
trap 'rm -f "$COOKIE_JAR"' EXIT

check_pass() { echo "[PASS] $1"; PASS_COUNT=$((PASS_COUNT+1)); }
check_fail() { echo "[FAIL] $1"; FAIL_COUNT=$((FAIL_COUNT+1)); }

# Check server reachability first
if ! curl -sf "${BASE_URL}/" -o /dev/null 2>/dev/null; then
  echo "ERROR: Cannot reach ${BASE_URL} — is the Docker Compose stack running?"
  echo "Run: docker compose up -d"
  exit 1
fi

echo "=== Scenario75 Cyber Range — Lab Verification ==="
echo "Base URL: ${BASE_URL}"
echo ""

# CHECK 1: GET /dashboard without auth -> 401 or 403
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/dashboard")
if [[ "$STATUS" == "401" || "$STATUS" == "403" ]]; then
  check_pass "CHECK 1: GET /dashboard without auth returns 401/403 (got ${STATUS})"
else
  check_fail "CHECK 1: GET /dashboard without auth should be 401/403 (got ${STATUS})"
fi

# CHECK 2: GET /robots.txt -> 200 with both Disallow paths and recon flag
ROBOTS=$(curl -sf "${BASE_URL}/robots.txt" 2>/dev/null || echo "FAILED")
if echo "$ROBOTS" | grep -q 'Disallow: /api/verify-mfa' && \
   echo "$ROBOTS" | grep -q 'Disallow: /dashboard' && \
   echo "$ROBOTS" | grep -q 'SCENARIO75{R3c0n_F1ag_R0b0ts_D1sc0v3r3d}'; then
  check_pass "CHECK 2: /robots.txt has both Disallow paths and recon flag"
else
  check_fail "CHECK 2: /robots.txt missing required content (got: $(echo "$ROBOTS" | head -c 200))"
fi

# CHECK 3: X-Powered-By header
XPB=$(curl -sf -I "${BASE_URL}/" 2>/dev/null | grep -i 'x-powered-by' | tr -d '\r' || echo "")
if echo "$XPB" | grep -q 'SCENARIO75{Node.js}'; then
  check_pass "CHECK 3: X-Powered-By: SCENARIO75{Node.js}"
else
  check_fail "CHECK 3: X-Powered-By header incorrect (got: ${XPB})"
fi

# CHECK 4: POST /api/login with admin/admin123 -> 200 and sets pre_mfa_session cookie
LOGIN_STATUS=$(curl -sf -c "$COOKIE_JAR" -o /tmp/ctf_login_resp.json \
  -w '%{http_code}' \
  -X POST "${BASE_URL}/api/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null || echo "000")
if [[ "$LOGIN_STATUS" == "200" ]] && grep -q 'pre_mfa_session' "$COOKIE_JAR" 2>/dev/null; then
  check_pass "CHECK 4: POST /api/login with admin/admin123 returns 200 and sets pre_mfa_session"
else
  check_fail "CHECK 4: POST /api/login failed (status=${LOGIN_STATUS}, cookie=$(grep pre_mfa "$COOKIE_JAR" 2>/dev/null || echo none))"
fi

# CHECK 5: POST /api/verify-mfa with pre_mfa_session -> 200 and sets adm_sess cookie
MFA_STATUS=$(curl -sf -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -o /tmp/ctf_mfa_resp.json \
  -w '%{http_code}' \
  -X POST "${BASE_URL}/api/verify-mfa" \
  -H 'Content-Type: application/json' \
  -d '{}' 2>/dev/null || echo "000")
if [[ "$MFA_STATUS" == "200" ]] && grep -q 'adm_sess' "$COOKIE_JAR" 2>/dev/null; then
  check_pass "CHECK 5: POST /api/verify-mfa returns 200 and sets adm_sess cookie"
else
  check_fail "CHECK 5: POST /api/verify-mfa failed (status=${MFA_STATUS})"
fi

# CHECK 6: GET /dashboard with valid adm_sess -> 200
DASH_AUTH_STATUS=$(curl -sf -b "$COOKIE_JAR" -o /tmp/ctf_dash_resp.html \
  -w '%{http_code}' \
  "${BASE_URL}/dashboard" 2>/dev/null || echo "000")
if [[ "$DASH_AUTH_STATUS" == "200" ]]; then
  check_pass "CHECK 6: GET /dashboard with valid adm_sess returns 200"
else
  check_fail "CHECK 6: GET /dashboard with valid adm_sess failed (status=${DASH_AUTH_STATUS})"
fi

# CHECK 7: Authenticated dashboard contains .xss-payload
if grep -q 'xss-payload' /tmp/ctf_dash_resp.html 2>/dev/null; then
  check_pass "CHECK 7: Authenticated dashboard contains .xss-payload class"
else
  check_fail "CHECK 7: Authenticated dashboard missing .xss-payload class"
fi

# CHECK 8: POST /api/feedback with <script> -> 403 (WAF blocked)
# Use -s only (no -f) so curl does not treat 4xx as failure; capture only
# the status code via -w so we always get the real HTTP status.
WAF_BLOCK_STATUS=$(curl -s -o /dev/null \
  -w '%{http_code}' \
  -X POST "${BASE_URL}/api/feedback" \
  -H 'Content-Type: application/json' \
  -d '{"message":"<script>alert(1)</script>"}')
if [ "$WAF_BLOCK_STATUS" = "403" ]; then
  check_pass "CHECK 8: POST /api/feedback with <script> blocked by WAF (403)"
else
  check_fail "CHECK 8: WAF should block <script> with 403 (got ${WAF_BLOCK_STATUS})"
fi

# CHECK 9: POST /api/feedback with SVG payload -> 200 (WAF bypass allowed)
WAF_BYPASS_STATUS=$(curl -sf -o /dev/null \
  -w '%{http_code}' \
  -X POST "${BASE_URL}/api/feedback" \
  -H 'Content-Type: application/json' \
  -d '{"message":"<svg onload=alert(1)>"}' 2>/dev/null || echo "000")
if [[ "$WAF_BYPASS_STATUS" == "200" ]]; then
  check_pass "CHECK 9: POST /api/feedback with SVG payload allowed (WAF bypass, 200)"
else
  check_fail "CHECK 9: SVG WAF bypass should return 200 (got ${WAF_BYPASS_STATUS})"
fi

# CHECK 10: App port not directly published on host.
# `docker compose port` exits 0 and prints "HOST:PORT" when published,
# or exits non-zero (or prints nothing) when the port is only exposed
# internally via `expose:` (no `ports:` mapping).
# We capture stdout; a non-empty result means the port IS published.
published=$(docker compose port app 3075 2>/dev/null || true)
if [ -z "$published" ]; then
  check_pass "CHECK 10: App port is not directly published to host"
else
  check_fail "CHECK 10: App port appears to be directly published: ${published}"
fi

# CHECK 11: No service uses host networking
if docker compose config 2>/dev/null | grep -q 'network_mode.*host'; then
  check_fail "CHECK 11: A service is using host networking mode"
else
  check_pass "CHECK 11: No service uses host networking"
fi

# CHECK 12: generate_logs.sh produces required log files
bash "$(dirname "$0")/generate_logs.sh" > /dev/null 2>&1 || true
LOG_DIR=""
if [ -f /opt/admin/logs/access.log ]; then
  LOG_DIR="/opt/admin/logs"
elif [ -f "$(dirname "$0")/../logs/access.log" ]; then
  LOG_DIR="$(dirname "$0")/../logs"
fi

if [ -n "$LOG_DIR" ] && \
   grep -q '18:50:15' "${LOG_DIR}/access.log" 2>/dev/null && \
   grep -q '18:51:55' "${LOG_DIR}/access.log" 2>/dev/null && \
   grep -q '18:53:10' "${LOG_DIR}/access.log" 2>/dev/null && \
   grep -q 'CRITICAL' "${LOG_DIR}/error.log" 2>/dev/null && \
   grep -q 'UEhBTlRPTUdSSUR7QkxVRV9MMGdfSHVudDNyX000c3Qzcn0=' "${LOG_DIR}/access.log" 2>/dev/null; then
  check_pass "CHECK 12: generate_logs.sh produces required log files and events"
else
  check_fail "CHECK 12: Log files missing or incomplete (LOG_DIR=${LOG_DIR:-not found})"
fi

# CHECK 13: POST /api/feedback basic functionality
FEEDBACK_STATUS=$(curl -sf -o /dev/null \
  -w '%{http_code}' \
  -X POST "${BASE_URL}/api/feedback" \
  -H 'Content-Type: application/json' \
  -d '{"message":"verify lab test"}' 2>/dev/null || echo "000")
if [[ "$FEEDBACK_STATUS" == "200" ]]; then
  check_pass "CHECK 13: POST /api/feedback with valid body returns 200"
else
  check_fail "CHECK 13: POST /api/feedback failed (got ${FEEDBACK_STATUS})"
fi

# CHECK 14: GET /health -> 200
HEALTH_STATUS=$(curl -sf -o /dev/null \
  -w '%{http_code}' \
  "${BASE_URL}/api/health" 2>/dev/null || echo "000")
# Also try /health (the route is at /health not /api/health)
if [[ "$HEALTH_STATUS" != "200" ]]; then
  HEALTH_STATUS=$(curl -sf -o /dev/null -w '%{http_code}' "${BASE_URL}/health" 2>/dev/null || echo "000")
fi
if [[ "$HEALTH_STATUS" == "200" ]]; then
  check_pass "CHECK 14: GET /health returns 200"
else
  check_fail "CHECK 14: GET /health failed (got ${HEALTH_STATUS})"
fi

echo ""
echo "================================================"
echo "PASSED: ${PASS_COUNT}/${TOTAL}"
echo "FAILED: ${FAIL_COUNT}/${TOTAL}"
echo "================================================"

if [[ $FAIL_COUNT -eq 0 ]]; then
  echo "All checks passed."
  exit 0
else
  exit 1
fi
