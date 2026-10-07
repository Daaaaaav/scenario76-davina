#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# setup_ssh.sh — Blue Team SSH access configuration
#
# PURPOSE: Configure SSH access for Blue Team analysts on the isolated
#          cyber-range Linux VM ONLY.
#
# SAFETY:
#   - NEVER run this script on a Windows development host.
#   - NEVER run this script automatically during local development.
#   - This script targets an isolated Proxmox-deployed Ubuntu VM.
#   - It does NOT modify firewall rules beyond configuring sshd.
#   - Assessment credentials MUST be set via environment variables.
#     Never hard-code passwords or keys in this file.
#
# USAGE (on isolated lab VM only):
#   ANALYST_PASSWORD="<secure-random-password>" bash setup_ssh.sh
# =============================================================================

# Guard: refuse to run on non-Linux systems
if [[ "$(uname -s)" != "Linux" ]]; then
  echo "[ERROR] This script is intended for Linux (isolated lab VM) only."
  echo "        Do not run on macOS or Windows."
  exit 1
fi

# Guard: refuse to run if isolation marker is absent
if [[ ! -f /etc/cyberrange-isolated ]]; then
  echo "[ERROR] /etc/cyberrange-isolated not found."
  echo "        This script must only run inside the isolated cyber-range VM."
  echo "        Create /etc/cyberrange-isolated on the target VM to proceed."
  exit 1
fi

# Detect Ubuntu/Debian
if ! command -v apt-get &>/dev/null; then
  echo "[ERROR] apt-get not found. This script requires Ubuntu/Debian."
  exit 1
fi

# Credential check — NEVER hard-code passwords
if [[ -z "${ANALYST_PASSWORD:-}" ]]; then
  echo "[ERROR] ANALYST_PASSWORD environment variable is required."
  echo "        Set it before running this script. Do not hard-code it."
  exit 1
fi

SSH_PORT=2275
ANALYST_USER=analyst

echo "==> Installing openssh-server if missing..."
apt-get update -qq
apt-get install -y openssh-server

echo "==> Configuring SSH on port $SSH_PORT..."
sed -i "s/^#\?Port .*/Port $SSH_PORT/" /etc/ssh/sshd_config
systemctl restart sshd

echo "==> Creating analyst user..."
if ! id "$ANALYST_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$ANALYST_USER"
fi
echo "$ANALYST_USER:$ANALYST_PASSWORD" | chpasswd
echo "[OK] Analyst user configured on port $SSH_PORT."

echo "==> Setup complete. SSH available on port $SSH_PORT."
