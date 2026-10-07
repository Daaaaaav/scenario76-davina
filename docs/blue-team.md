# Blue Team Guide — Scenario75 Cyber Range

> This guide documents the investigation areas for Blue Team students.
> No fabricated telemetry is included at this scaffolding stage.
> Log data will be generated deterministically at CTF implementation stage.

## Investigation Areas

### 1. Access Logs

**Log path (VM deployment):** `/opt/admin/logs/access.log`

Look for:
- Reconnaissance patterns: repeated requests to robots.txt, /dashboard
- Unusual HTTP methods or paths
- Bursts of 403 responses (WAF blocks)
- Successful 200 responses following WAF probes (bypass indicator)

**TODO:** Log data will be populated at CTF implementation stage.

### 2. Error Logs

**Log path (VM deployment):** `/opt/admin/logs/error.log`

Look for:
- Application errors following unusual input
- Middleware exceptions
- Session errors

**TODO:** Log data will be populated at CTF implementation stage.

### 3. Attacker IP and Baseline Traffic

Establish baseline:
- Normal traffic pattern: occasional POST to /api/feedback, GET to /
- Anomalies: repeated requests, scanning patterns, encoded payloads

**TODO:** Simulated attacker IP and baseline will be defined at CTF implementation stage.

### 4. WAF Events

WAF middleware (`app/src/middleware/waf.js`) logs inspection events.
Look for:
- Series of 403 responses indicating WAF probes
- A successful request immediately after failed WAF probes (bypass)
- Unusual Content-Type or encoding in POST bodies

### 5. Dashboard Access

Any access to GET /dashboard that did not follow a valid auth flow is suspicious.
Look for:
- Dashboard access without a preceding MFA verification
- Session tokens appearing in multiple concurrent requests

### 6. Suspicious Headers

Look for:
- Unexpected X-Forwarded-For values
- Cookie headers containing both pre_mfa_session and adm_sess
- Requests with adm_sess but no preceding MFA event

### 7. Authentication Anomalies

Look for:
- POST /api/verify-mfa responses returning 200 without a preceding login
- adm_sess cookies issued outside normal authentication flow

### 8. Encoded Data

Look for:
- URL-encoded or Base64 payloads in POST bodies
- Unicode escape sequences in feedback submissions
- SVG or data: URI schemes in the message field

## Investigation Checklist (TODO — CTF implementation stage)

- [ ] Identify attacker IP from access logs
- [ ] Determine first reconnaissance request timestamp
- [ ] Identify the WAF bypass payload used
- [ ] Determine the XSS payload execution timestamp
- [ ] Confirm session cookie capture event
- [ ] Confirm MFA bypass via session replay
- [ ] Confirm dashboard access with stolen session
- [ ] Calculate time from first recon to flag capture
