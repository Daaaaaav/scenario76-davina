# Architecture — Scenario75 Cyber Range

## Local Development Architecture

```
          Local Client
               |
               v
       localhost:3075
               |
               v
          +--------+
          | Nginx  |   (port 80 internal, proxies to app)
          +--------+
               |
               v
          +--------+
          | Node.js|   (port 3075 internal, NOT published to host)
          +--------+
               |
               v
        Telemetry layer
        (stdout/stderr logs)
```

All traffic enters via Nginx bound to `127.0.0.1:3075` on the host.
The Node.js app is NOT directly reachable from outside Docker.
Both containers communicate over the internal `cyberrange` Docker bridge network.

## Component Responsibilities

| Component | Role |
|-----------|------|
| Nginx     | Reverse proxy, TLS termination (future), access logging |
| Node.js   | Express application, business logic, session management |
| Telemetry | Structured event logging for Blue Team investigation |

## Future Proxmox VM Deployment Architecture

In the isolated cyber-range assessment, the application runs inside a Proxmox VM
with no external network connectivity.

```
   Assessment Workstation
           |
           | (isolated lab network)
           v
      VM: 10.x.x.x
           |
           v
      +----------+
      |  Nginx   |   port 3075 (HTTP, isolated network only)
      +----------+
           |
           v
      +----------+
      | Node.js  |
      +----------+
           |
           v
  /opt/admin/logs/
   access.log
   error.log
```

- SSH access for Blue Team on port 2275
- Analyst user provisioned by setup_ssh.sh
- Logs at /opt/admin/logs/ for investigation
- No Internet connectivity from the VM
