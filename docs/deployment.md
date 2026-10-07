# Deployment Guide — Scenario75 Cyber Range

## 1. Local Development

Prerequisites:
- Node.js 20+
- Docker Desktop

Steps:

```bash
# Clone the repository
git clone <repo-url>
cd scenario76-davina

# Copy environment configuration
cp .env.example .env
# (Leave HOST=127.0.0.1 — do not change)

# Install dependencies
cd app
npm install

# Run tests
npm test

# Start Node.js directly (no Docker)
npm start
# Application available at http://127.0.0.1:3075
```

## 2. Docker Compose Deployment

Prerequisites:
- Docker Desktop
- Docker Compose v2

Steps:

```bash
# From repository root
cp .env.example .env
bash scripts/deploy.sh

# Or manually:
docker compose up -d

# Verify
bash scripts/verify_lab.sh

# View logs
docker compose logs -f

# Stop
docker compose down
```

The application will be accessible at: http://127.0.0.1:3075

**Security note:** Nginx binds to 127.0.0.1:3075 only. The Node.js app
container does NOT publish any ports directly to the host.

## 3. Future Proxmox VM Deployment

**TODO — CTF implementation stage**

Overview:
1. Create a Proxmox VM with Ubuntu 22.04 LTS
2. Configure isolated network (no external Internet access)
3. Clone repository to VM
4. Copy .env and configure for VM environment
5. Run `bash scripts/setup_ssh.sh` (on the isolated VM only)
6. Run `bash scripts/deploy.sh`
7. Run `bash scripts/generate_logs.sh` to populate Blue Team telemetry
8. Distribute analyst SSH credentials to Blue Team students
9. Distribute target IP and scenario briefing to Red Team students

Network configuration (isolated lab only):
- VM IP: assigned by isolated lab network (e.g. 10.x.x.x)
- HTTP (via Nginx): port 3075
- SSH (Blue Team): port 2275
- No external connectivity

**NEVER deploy this application on a public network or production system.**
