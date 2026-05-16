# Portside Time

Internal time & attendance for Portside Logistics. Tracks shift/lunch
punches, leave, and produces locked monthly inputs for payroll. See
`CLAUDE.md` (top-level repo spec) for the full requirements.

Phase 1 plan: `~/.claude/plans/hidden-stargazing-falcon.md`.

## Stack

- Next.js 16 (App Router), TypeScript strict, Tailwind v4, React 19
- Prisma + SQLite (single file at `/data/portside.db` in prod)
- Caddy internal HTTP router (no public TLS — Cloudflare's edge terminates)
- Argon2id (`@node-rs/argon2`) for passwords and PINs
- FingerprintJS open-source v4 for device identity
- Resend for the new-IP email alert
- Docker Compose on a DigitalOcean Basic Droplet (BLR1), fronted by a
  Cloudflare Tunnel + Access (office-IP allow + admin email-OTP)
- GitHub Actions builds the image and pushes to `ghcr.io`
- Litestream replicates SQLite continuously to Cloudflare R2

> **Note on the toolchain swap:** the plan called for `pnpm`. Local install
> required sudo for the corepack symlink, so this repo ships an `npm` lockfile
> instead. Functionally identical for what we need.

## Local development

```bash
# Already done by setup:
#   npm install
#   npx prisma generate
#   npx prisma migrate dev  (creates ./dev.db)

cp .env .env.local   # tweak as needed; .env defaults are dev-safe
npm run dev          # http://localhost:3000
```

### Useful one-liners

```bash
# Run migrations against ./dev.db
npx prisma migrate dev

# Open the DB with sqlite cli
sqlite3 dev.db

# Verify audit log append-only protection
sqlite3 dev.db "INSERT INTO audit_log (id, action) VALUES ('x','t')"
sqlite3 dev.db "UPDATE audit_log SET action='y' WHERE id='x'"   # fails
sqlite3 dev.db "DELETE FROM audit_log WHERE id='x'"             # fails
```

## Deploy

**Source of truth:** `RUNBOOK.md` at the repo root. Walks through DigitalOcean
droplet creation, R2 setup, GHCR PAT, Tailscale auth key, env file
composition, running `scripts/bootstrap-server.sh`, Cloudflare Access
configuration, acceptance tests, and day-2 ops (updates, rollbacks, restore
from Litestream, password rotation, IP rotation).

The older `docs/setup/01-vps.md` and `docs/setup/02-deploy.md` describe a
Hetzner-CX22 + direct-public-IP + Caddy-auto-TLS topology that we've moved
away from. They're still useful as cross-reference; `RUNBOOK.md` overrides
where they conflict.

`docs/setup/path-b-laptop.md` (HP laptop + Cloudflare Tunnel) was attempted
and abandoned 2026-05-16 — see the historical note at the top of that file.

## Operational notes

See `RUNBOOK.md` § "Day-2 operations" for:

- First admin login + rotating `ADMIN_PASSWORD_BOOTSTRAP`
- Approving a new office IP when ISP-assigned IP rotates (updates both
  Cloudflare Access policy and the app's own `/admin/ip-allowlist`)
- Restoring from a Litestream backup (with the integrity-check step)
- Rotating R2 / GHCR / Tailscale credentials
- Common troubleshooting

### Initial office IP

Captured at `docs/setup/OFFICE-IP.md` (currently `197.241.65.2`). Used in
the Cloudflare Access "Office network" policy AND added inside the app at
`/admin/ip-allowlist` on first sign-in.
