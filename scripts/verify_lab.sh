#!/usr/bin/env bash
# =============================================================================
# verify_lab.sh — Lab verification script
# Checks that all required services and endpoints are functional.
# Outputs [PASS] or [FAIL] for each check.
# Exits with non-zero code if any required check fails.
# =============================================================================

set -euo pipefail

BASE_URL="http://127.0.0.1:3075"
FAIL=0

check() {
  local desc="$1"
  local result="$2"
  if [[ "$result" == "pass" ]]; then
    echo "[PASS] $desc"
  else
    echo "[FAIL] $desc"
    FAIL=1
  fi
}

# --- Infrastructure checks ---
if command -v docker &>/dev/null; then
  check "Docker is available" pass
else
  check "Docker is available" fail
fi

if docker compose version &>/dev/null 2>&1 || command -v docker-compose &>/dev/null; then
  check "Docker Compose is available" pass
else
  check "Docker Compose is available" fail
fi

# Check containers running (if compose stack is up)
if docker compose ps 2>/dev/null | grep -q "Up\|running" || docker-compose ps 2>/dev/null | grep -q "Up\|running"; then
  check "Docker Compose stack is running" pass
else
  check "Docker Compose stack is running" fail
fi

# --- Endpoint checks ---
http_check() {
  local desc="$1"
  local method="$2"
  local url="$3"
  local data="${4:-}"
  local expected_status="${5:-200}"

  if [[ "$method" == "POST" && -n "$data" ]]; then
    status=$(curl -sf -o /dev/null -w "%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d "$data" "$url" 2>/dev/null || echo "000")
  else
    status=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  fi

  if [[ "$status" == "$expected_status" ]]; then
    check "$desc" pass
  else
    check "$desc (got HTTP $status)" fail
  fi
}

if curl -sf "$BASE_URL" -o /dev/null 2>/dev/null; then
  check "localhost:3075 is reachable" pass
else
  check "localhost:3075 is reachable" fail
fi

http_check "GET / returns 200"            GET  "$BASE_URL/"
http_check "GET /robots.txt returns 200"  GET  "$BASE_URL/robots.txt"
http_check "GET /dashboard returns 200"   GET  "$BASE_URL/dashboard"
http_check "POST /api/feedback returns 200" POST "$BASE_URL/api/feedback" '{"message":"verify"}' 200
http_check "POST /api/verify-mfa returns 200" POST "$BASE_URL/api/verify-mfa" '{}' 200

# Verify app port NOT published to host directly
# (docker-compose should only publish nginx:80 as 127.0.0.1:3075, not app:3075)
echo ""
echo "--- Security checks ---"
if docker compose ps 2>/dev/null | grep -q "3075->3075" || docker-compose ps 2>/dev/null | grep -q "3075->3075"; then
  check "App port NOT directly published to host" fail
else
  check "App port NOT directly published to host" pass
fi

# Check no host networking mode
if docker inspect scenario75-cyber-range-app-1 2>/dev/null | grep -q '"NetworkMode": "host"'; then
  check "No service using host networking" fail
else
  check "No service using host networking" pass
fi

echo ""
if [[ $FAIL -eq 0 ]]; then
  echo "All checks passed."
  exit 0
else
  echo "One or more checks failed. Review output above."
  exit 1
fi
