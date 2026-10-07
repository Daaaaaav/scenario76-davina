#!/usr/bin/env bash
set -euo pipefail

echo "==> Scenario75 Cyber Range — Deployment Script"
echo "    Safe for local development only."
echo ""

# Validate Docker availability
if ! command -v docker &>/dev/null; then
  echo "[ERROR] Docker is not installed or not on PATH."
  exit 1
fi
echo "[OK] Docker found: $(docker --version)"

# Validate Docker Compose
if docker compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
else
  echo "[ERROR] Docker Compose not found (tried 'docker compose' and 'docker-compose')."
  exit 1
fi
echo "[OK] Docker Compose found: $($COMPOSE_CMD version)"

# Create required directories
mkdir -p logs
echo "[OK] logs/ directory ready."

# Build images
echo "==> Building images..."
$COMPOSE_CMD build

# Start stack
echo "==> Starting Docker Compose stack..."
$COMPOSE_CMD up -d

# Health check
echo "==> Waiting for application to become healthy..."
for i in $(seq 1 15); do
  if curl -sf http://127.0.0.1:3075/health > /dev/null 2>&1; then
    echo "[OK] Application is healthy at http://127.0.0.1:3075"
    exit 0
  fi
  echo "    Attempt $i/15 — waiting 3s..."
  sleep 3
done

echo "[ERROR] Application did not become healthy within 45s."
exit 1
