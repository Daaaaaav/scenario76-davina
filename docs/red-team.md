# Red Team Guide — Scenario75 Cyber Range

> **Authorization required.** All activities documented here are only
> permitted inside the isolated cyber-range VM, with explicit written
> authorization. Do not perform these steps on any system outside the lab.

## Phase 1: Reconnaissance

**TODO — isolated CTF implementation**

Objective: Enumerate the target to identify attack surface.

Expected findings:
- robots.txt reveals disallowed paths: /api/verify-mfa, /dashboard
- HTTP response headers may reveal server version information
- Directory enumeration may surface the feedback form

Tools: curl, nmap (lab VM only), browser developer tools

## Phase 2: WAF and XSS Behavior

**TODO — isolated CTF implementation**

Objective: Probe the WAF and identify bypass vectors.

Expected steps:
1. Submit a basic `<script>alert(1)</script>` payload to /api/feedback
2. Observe the WAF response (expected: HTTP 403)
3. Identify WAF keyword filtering weaknesses
4. Craft an HTML5/SVG payload that bypasses the keyword filter
5. Confirm XSS execution in the dashboard feedback container

All steps are TODO until CTF implementation stage.

## Phase 3: Session Replay and MFA Bypass

**TODO — isolated CTF implementation**

Objective: Capture and replay the pre-MFA session cookie to bypass authentication.

Expected steps:
1. Trigger XSS payload to capture pre_mfa_session cookie value
   (This is possible because pre_mfa_session is set with HttpOnly=false)
2. Replay the captured pre_mfa_session token to /api/verify-mfa
3. Receive adm_sess without completing MFA
4. Access /dashboard with adm_sess to retrieve the CTF flag

All steps are TODO until CTF implementation stage.

## Flag Location

**TODO — CTF implementation stage**

The flag will be displayed on /dashboard after successful authentication.
Format: `CTF{...}` (exact format TBD at CTF implementation stage)
