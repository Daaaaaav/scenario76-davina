# Logs Directory

This directory holds application log files generated during development and deployment.

## Local Development

During local development, log output goes to stdout/stderr (visible via `docker compose logs`).
Log files are written here when `LOG_DIR` is set to point to this path.

## Cyber Range VM Deployment

In the isolated Proxmox VM deployment, logs are written to:

- `/opt/admin/logs/access.log` — HTTP access events
- `/opt/admin/logs/error.log`  — Application errors

These paths are the intended Blue Team investigation targets.

## .gitignore

`*.log` files in this directory are excluded from version control.
The `.gitkeep` file ensures the directory is tracked by git while keeping logs out.
