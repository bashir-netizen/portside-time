# Portside Time

Internal time & attendance for Portside Logistics. Tracks shift/lunch
punches, leave, and produces locked monthly inputs for payroll. See
`CLAUDE.md` (top-level repo spec) for the full requirements.

Phase 1 plan: `~/.claude/plans/hidden-stargazing-falcon.md`.

## Stack

- Next.js 16 (App Router), TypeScript strict, Tailwind v4, React 19
- Prisma + SQLite (single file at `/data/portside.db` in prod)
- Caddy reverse proxy with auto-TLS
- Argon2id (`@node-rs/argon2`) for passwords and PINs
- FingerprintJS open-source v4 for device identity
- Resend for the new-IP email alert
- Docker Compose on a Hetzner CX22

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

See `docs/setup/01-vps.md` for the one-time VPS prep, then
`docs/setup/02-deploy.md` (added in the deploy-plumbing task) for first
deploy and updates.

## Operational notes

### First admin login

The seed creates an admin user from `ADMIN_EMAIL` + `ADMIN_PASSWORD_BOOTSTRAP`.
A `force_password_reset=true` flag is set on the row, but Phase 1 doesn't yet
have a self-serve reset page. On first deploy, sign in with the bootstrap
credentials and then update `ADMIN_PASSWORD_BOOTSTRAP` in
`/etc/portside/time.env` to a strong new value (the seed is idempotent and
only sets the password on initial create).

A `/me/security` self-serve page is in the Phase 2 polish list.

### Initial office IP

There's no seeded office IP. On day one, either:

- Wait for the first employee login attempt at the office. Their 403 will
  fire the email + banner; click to approve.
- Or add the IP manually at `/admin/ip-allowlist`. Find your current public
  IP with `curl ifconfig.me` from any office PC.

### IP changes (ongoing)

When the ISP-assigned public IP changes, the next employee login attempt
will trigger the email-and-banner flow. Approve the new IP from your phone
within ~30 seconds and punches resume.

### Recovery

If the VPS is lost or corrupted:

1. Provision a new CX22 (see `docs/setup/01-vps.md`).
2. Clone this repo.
3. Restore the latest `portside.db` snapshot from Backblaze B2 to
   `/srv/portside/data/portside.db`. (Backup task is Phase 2; until then,
   manual `sqlite3 dev.db ".backup …"` is your only safety.)
4. Drop `.env` at `/etc/portside/time.env`.
5. `docker compose up -d --build`.

Expected downtime: 1–2 hours. Any punches in that window get added by admin
via the correction flow.
