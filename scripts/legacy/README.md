# scripts/legacy/

These scripts targeted the "Path B" deployment on a Windows laptop sitting at
the office. That path was abandoned 2026-05-16 in favour of a DigitalOcean
droplet + Cloudflare Tunnel deployment.

Kept here for reference only — don't run them.

- `bootstrap-laptop-1.ps1` — Windows 11 prep (Git, Docker Desktop, WSL2)
- `bootstrap-laptop-2.ps1` — Repo clone + secret generation + compose up
- `enable-ssh.ps1` — OpenSSH server install

The Linux equivalent (and current path) is `scripts/bootstrap-server.sh`.
See `docs/setup/01-vps.md` and `RUNBOOK.md`.
