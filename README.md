# Scenario75 Cyber Range — Isolated CTF Training Lab

> **Isolated Training Environment — NOT for production use.**
> This is intentionally vulnerable training software.
> Deploy and exploit only inside an isolated cyber-range environment with explicit written authorization.
> Never deploy on public networks, production systems, or without authorization.

---

## Purpose

This lab implements a fully functional **Cookies Reuse & MFA Bypass** CTF assessment scenario for cybersecurity engineer practical training. It provides:

- A realistic vulnerable Admin Feedback System with live exploit paths
- Red Team objectives: XSS, cookie theft, MFA bypass, session replay
- Blue Team objectives: log analysis, anomaly detection, WAF review
- Deterministic attack telemetry for Blue Team analysis
- Automated deployment and verification scripts

---

## Architecture

```
          Local Client
               |
               v
    localhost:3075 (host loopback only)
               |
               v
          +--------+
          | Nginx  |  127.0.0.1:3075 -> container:80
          +--------+
               |  Docker bridge network (cyberrange)
               v
          +--------+
          | Node.js|  container:3075 (not published to host)
          +--------+
               |
               v
        Telemetry / in-memory session store
```

Nginx (bound to `127.0.0.1:3075`) is the **only host-published service**.
The Node.js app is reachable only from within the Docker bridge network.

---

## Proxmox Deployment Assumptions

This lab is designed for deployment on a Proxmox VM in an isolated lab network:

- The VM runs Docker and Docker Compose
- Required ports exposed on the VM: **3075** (web), **2275** (SSH)
- No external internet connectivity required or assumed
- All traffic stays inside the isolated lab network

---

## Quick Start

Prerequisites:
- Docker Desktop (or Docker Engine + Compose plugin)
- Bash (for scripts — use Git Bash or WSL on Windows)

```bash
# 1. Start the stack
docker compose up -d

# 2. Wait for health check (~10s), then verify
bash scripts/verify_lab.sh

# 3. Generate deterministic attack logs for Blue Team
bash scripts/generate_logs.sh
```

Access: [http://127.0.0.1:3075](http://127.0.0.1:3075)

---

## Red Team Objectives

| Phase | Objective | Flag |
|-------|-----------|------|
| Reconnaissance | Find hidden paths in robots.txt | `SCENARIO75{R3c0n_F1ag_R0b0ts_D1sc0v3r3d}` |
| WAF bypass | Bypass script-tag filter with SVG payload | — |
| XSS + cookie theft | Steal pre_mfa_session via stored XSS | — |
| MFA bypass | Replay pre_mfa_session to get adm_sess | — |
| Dashboard access | Read final flag on /dashboard | `SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}` |

See [docs/red-team.md](docs/red-team.md) for detailed walkthrough.

---

## Blue Team Objectives

| Task | Log path |
|------|----------|
| Identify attacker IP and timeline | `/opt/admin/logs/access.log` |
| Find WAF block/bypass sequence | `/opt/admin/logs/access.log` |
| Identify cookie replay anomaly | `/opt/admin/logs/error.log` |
| Decode X-Forwarded-For Blue Team flag | access.log line 18:49:30 |

Blue Team flag: Base64-decode the `X-Forwarded-For` value in the logs → `SCENARIO75{BLUE_L0G_HUnt3r_M4st3r}`

See [docs/blue-team.md](docs/blue-team.md) for investigation checklist.

---

## Deterministic Log Generation

```bash
bash scripts/generate_logs.sh
```

Writes simulated attack telemetry to `/opt/admin/logs/` (or `./logs/` if not writable):
- `access.log` — full attack timeline with embedded Blue Team flag
- `error.log` — WAF events, cookie replay, auth bypass anomalies

No real network traffic is generated. All data is written locally.

---

## Security Boundary

| Boundary | Status |
|----------|--------|
| Nginx binds to 127.0.0.1 only | Enforced |
| App port not published to host | Enforced |
| No host networking mode | Enforced |
| No external API calls | Enforced |
| No real credential theft or persistence | Enforced |
| No internet-facing deployment | Assumed (Proxmox isolated VM) |

---

## Local Development

```bash
# Install dependencies
cd app && npm install

# Run tests
npm test

# Run lint
npm run lint
```

---

## Directory Structure

```
scenario76-davina/
├── app/              Node.js Express application
│   ├── src/          Application source
│   └── test/         Test suite
├── nginx/            Nginx reverse proxy config
├── scripts/          generate_logs.sh, verify_lab.sh
├── logs/             Local log output (fallback from /opt/admin/logs)
├── docs/             red-team.md, blue-team.md
└── docker-compose.yml
```
