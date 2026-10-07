# Scenario75 Cyber Range

A self-contained cybersecurity training laboratory for the **Cookies Reuse & MFA Bypass** practical assessment scenario.

> **Authorized Use Only.** This is intentionally vulnerable training software.
> Deploy and exploit only inside an isolated cyber-range environment with explicit written authorization.
> Never deploy on public networks, production systems, or without authorization.

---

## Purpose

This lab simulates a vulnerable corporate **Admin Feedback System** for cybersecurity engineer practical assessments. It provides:

- A realistic target application with documented (but not yet implemented) vulnerabilities
- Blue Team investigation artifacts (logs, telemetry)
- Automated deployment and verification scripts
- A Proxmox-compatible isolated VM deployment path

---

## Architecture

```
          Local Client
               |
               v
       localhost:3075
               |
               v
          +--------+
          | Nginx  |
          +--------+
               |
               v
          +--------+
          | Node.js|
          +--------+
               |
               v
        Telemetry layer
```

Nginx (bound to `127.0.0.1:3075`) proxies to Node.js (internal Docker network only).

---

## Local Development

Prerequisites:
- Node.js 20+
- Docker Desktop

```bash
# 1. Copy environment config
cp .env.example .env

# 2. Install dependencies
cd app && npm install

# 3. Run tests
npm test

# 4. Start with Docker Compose
cd .. && docker compose up -d

# 5. Access the application
open http://127.0.0.1:3075
```

---

## Security Boundary

| Boundary | Status |
|----------|--------|
| Binds to 127.0.0.1 only | Enforced |
| No real credentials | Enforced |
| No external API calls | Enforced |
| No persistence mechanisms | Enforced |
| Exploit behaviors | TODO (isolated CTF stage only) |

---

## Directory Structure

```
scenario76-davina/
├── app/              Node.js Express application
│   ├── src/          Application source
│   └── test/         Test suite
├── nginx/            Nginx reverse proxy config
├── scripts/          Deployment and verification scripts
├── logs/             Log output directory
├── docs/             Architecture, team guides, checklists
└── .github/          CI workflow
```

---

## Current Implementation Status

| Feature | Status |
|---------|--------|
| Express application scaffold | Scaffolded |
| Nginx reverse proxy | Scaffolded |
| Docker Compose stack | Scaffolded |
| Feedback form UI | Scaffolded |
| Admin dashboard UI | Scaffolded |
| Session service stubs | Scaffolded |
| Telemetry logging | Scaffolded |
| Test suite | Scaffolded |
| CI workflow | Scaffolded |
| XSS vulnerability | Not yet implemented |
| MFA bypass | Not yet implemented |
| Session replay | Not yet implemented |
| Attack telemetry | Not yet implemented |
| Proxmox deployment | Not yet implemented |

---

## Future CTF Components

These components are documented but NOT implemented at this stage:

- **Reconnaissance clues** — robots.txt disallows hint at interesting endpoints
- **WAF behavior** — a basic filter that blocks `<script>` but can be bypassed with HTML5/SVG payloads
- **Controlled XSS demonstration** — feedback form renders unsanitized input in the dashboard (isolated VM only)
- **Session replay simulation** — `pre_mfa_session` with `HttpOnly=false` enables JavaScript cookie access
- **MFA bypass** — replaying `pre_mfa_session` issues `adm_sess` without MFA verification
- **Blue Team telemetry** — deterministic attack timeline in `/opt/admin/logs/`
- **Proxmox deployment** — automated VM provisioning for the isolated cyber range

All CTF exploit behaviors will be implemented only inside the isolated cyber-range VM.
