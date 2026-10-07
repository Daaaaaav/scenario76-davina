#!/usr/bin/env bash
# =============================================================================
# generate_logs.sh — Deterministic simulated attack telemetry generator
# Scenario75 Cyber Range — isolated CTF training lab
# =============================================================================
set -euo pipefail

# Determine log directory: try /opt/admin/logs/ first, fall back to ./logs/
if mkdir -p /opt/admin/logs 2>/dev/null && [ -w /opt/admin/logs ]; then
  LOG_DIR="/opt/admin/logs"
else
  LOG_DIR="$(dirname "$0")/../logs"
  mkdir -p "$LOG_DIR"
fi

ACCESS_LOG="${LOG_DIR}/access.log"
ERROR_LOG="${LOG_DIR}/error.log"

DATE=$(date +"%d/%b/%Y")

# X-Forwarded-For Blue Team flag (Base64 encoded SCENARIO75{BLUE_L0G_HUnt3r_M4st3r})
XFF_FLAG="UEhBTlRPTUdSSUR7QkxVRV9MMGdfSHVudDNyX000c3Qzcn0="

echo "[*] Writing simulated attack telemetry to ${LOG_DIR}"

# ─── access.log ────────────────────────────────────────────────────────────
cat > "${ACCESS_LOG}" << EOF
192.168.1.100 - - [${DATE} 18:45:00 +0000] "GET / HTTP/1.1" 200 1234 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
10.10.14.50 - - [${DATE} 18:49:30 +0000] "GET /robots.txt HTTP/1.1" 200 89 "-" "Mozilla/5.0" X-Forwarded-For: ${XFF_FLAG}
10.10.14.50 - - [${DATE} 18:49:45 +0000] "GET /dashboard HTTP/1.1" 401 67 "-" "Mozilla/5.0"
10.10.14.50 - - [${DATE} 18:50:00 +0000] "POST /api/login HTTP/1.1" 200 45 "-" "Mozilla/5.0"
10.10.14.50 - - [${DATE} 18:50:15 +0000] "POST /api/feedback HTTP/1.1" 403 78 "-" "Mozilla/5.0" [WAF_BLOCK: script_tag]
10.10.14.50 - - [${DATE} 18:51:10 +0000] "POST /api/feedback HTTP/1.1" 200 92 "-" "Mozilla/5.0" [WAF_BYPASS: svg_event_handler]
10.10.14.50 - - [${DATE} 18:51:55 +0000] "GET /dashboard HTTP/1.1" 200 4521 "-" "Mozilla/5.0" [COOKIE_REPLAY: adm_sess]
192.168.1.100 - - [${DATE} 18:53:10 +0000] "GET /dashboard HTTP/1.1" 200 4521 "-" "Mozilla/5.0 (Windows NT 10.0)" [ANOMALY: auth_bypass_detected]
EOF

# ─── error.log ────────────────────────────────────────────────────────────
cat > "${ERROR_LOG}" << EOF
[${DATE} 18:50:15] [WARN] WAF blocked request from 10.10.14.50: script tag injection attempt on /api/feedback
[${DATE} 18:51:10] [INFO] WAF: SVG event handler payload allowed (intentional bypass): /api/feedback from 10.10.14.50
[${DATE} 18:51:30] [WARN] Pre-MFA session cookie accessed from suspicious origin: 10.10.14.50
[${DATE} 18:51:55] [CRITICAL] Cookie replay detected: adm_sess reused from 10.10.14.50 - SCENARIO75 training event
[${DATE} 18:53:10] [CRITICAL] Authentication bypass anomaly: session replayed at 10.10.14.50 - flagging for Blue Team analysis
EOF

echo "[+] access.log written: ${ACCESS_LOG}"
echo "[+] error.log written: ${ERROR_LOG}"
echo "[+] Blue Team XFF flag embedded (Base64): ${XFF_FLAG}"
echo "[+] Decode: echo ${XFF_FLAG} | base64 -d"
echo "[*] Done."
