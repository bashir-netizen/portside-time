# RUNBOOK — Portside Time

Operator handbook. Covers first deploy, day-2 ops, restore, secret rotation,
and common troubleshooting. Read top-to-bottom for the first deploy; jump to
sections by need afterward.

> Source-of-truth deployment plan (overrides anything below if conflicting):
> `~/.claude/plans/sprightly-baking-spindle.md`

---

## Architecture (one-liner)

```
Cloudflare edge (Access: office-IP allow + admin email-OTP)
  → tunnel `portside-office`
    → cloudflared (systemd service on VPS)
      → Caddy on 127.0.0.1:8080 (plain HTTP router)
        → app:3000 (Next.js, Prisma + SQLite)
        + litestream → R2 bucket `portside-backups`
```

- Host: DigitalOcean Basic Droplet, BLR1, Ubuntu 24.04 LTS, $6/mo
- Domain: `time.portsideshift.com`
- No public ports open on the VPS — tunnel is outbound-only
- SSH only via Tailscale; UFW port 22 is open as fallback if Tailscale ever fails

---

## First-deploy checklist

Work through these in order. Each section is roughly 5–15 minutes.

### 1. Pre-flight account checks

You need active access to all of these before starting:

- [ ] **DigitalOcean** — existing account on file
- [ ] **Cloudflare** account holding `portsideshift.com` + the `portside-office` tunnel
- [ ] **GitHub** account `bashir-netizen` (owner of the repo)
- [ ] **Tailscale** admin console (existing tailnet on `bashir@portside-logistics.com`)
- [ ] **Resend** — optional for day-one; the app logs alert emails instead of sending until this is set up

### 2. Generate secrets (do this once, store in 1Password)

Run locally on your Mac:

```bash
echo "SESSION_SECRET=$(openssl rand -hex 32)"
echo "DEVICE_COOKIE_SECRET=$(openssl rand -hex 32)"
echo "FINGERPRINT_SECRET=$(openssl rand -hex 32)"
echo "APPROVAL_TOKEN_SECRET=$(openssl rand -hex 32)"
echo "ADMIN_PASSWORD_BOOTSTRAP=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
```

Save the output in 1Password vault **"Portside Infra"** as a Secure Note
named "portside-time / time.env". You'll need these in §6.

### 3. Cloudflare R2 setup (~5 min)

R2 is Cloudflare's S3-compatible object store. Free tier covers our usage.

1. Cloudflare dashboard → left sidebar → **R2**. If it says "Get started",
   click through to opt in (asks for a credit card on file — no charges
   under the free tier limits of 10 GB storage + 1M Class-A ops/mo).
2. **Create bucket** → name: `portside-backups`, location: Automatic
   (Cloudflare picks the nearest data center; for Djibouti that's likely EMEA).
3. **Manage R2 API Tokens** (top-right of the R2 page) → **Create API token**.
   - Token name: `litestream-portside-time`
   - Permissions: Object Read & Write
   - Specify bucket: `portside-backups` (don't grant account-wide)
   - TTL: forever (no expiry)
4. After clicking Create, the page shows three things — **copy all three immediately**, the secret access key is shown only once:
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint URL** (looks like `https://<account_id>.r2.cloudflarestorage.com`)

Save all three in the 1Password note from §2. These become
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT` in time.env.

### 4. GitHub Container Registry PAT (~3 min)

The bootstrap script logs in to ghcr.io to pull the prebuilt image.

1. GitHub → **Settings** (top-right avatar) → **Developer settings** →
   **Personal access tokens** → **Tokens (classic)** → **Generate new
   token (classic)**.
2. Name: `portside-time-ghcr-pull`
3. Expiration: 1 year
4. Scopes: only **`read:packages`** (nothing else — keep it minimal)
5. Click Generate, copy the `ghp_...` token, save it in 1Password.

### 5. Tailscale ephemeral auth key (~2 min)

1. https://login.tailscale.com/admin/settings/keys
2. **Generate auth key**:
   - Reusable: **off** (one-use only)
   - Ephemeral: **off** (node persists after disconnect — we want a stable IP)
   - Pre-approved: **on** (joins the tailnet without admin click-through)
   - Tags: leave blank (or add `tag:server` if you've set up ACLs)
   - Expiration: 90 days (long enough to redo bootstrap if needed; key gets
     used once at first run and not after)
3. Copy the `tskey-auth-...` value to 1Password.

### 6. Compose the `time.env` file (~5 min)

Create a local file on your Mac (NOT on the droplet yet). This will be
copied to the droplet by the bootstrap script:

```bash
cat > /tmp/time.env <<'EOF'
APP_DOMAIN=time.portsideshift.com
APP_URL=https://time.portsideshift.com
DATABASE_URL=file:/data/portside.db

# Paste the four hex secrets from step 2 here:
SESSION_SECRET=<paste>
DEVICE_COOKIE_SECRET=<paste>
FINGERPRINT_SECRET=<paste>
APPROVAL_TOKEN_SECRET=<paste>

ADMIN_EMAIL=bashir@portside-logistics.com
ADMIN_PASSWORD_BOOTSTRAP=<paste from step 2>
ADMIN_ALERT_EMAIL=bashir@portside-logistics.com

# SMTP: empty means "log alert emails, don't send". Set these when Resend
# (or Gmail-app-password) is ready. App still functions without SMTP.
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Portside Time <noreply@portsideshift.com>

# Litestream → R2 (from step 3):
R2_ENDPOINT=<paste>
R2_ACCESS_KEY_ID=<paste>
R2_SECRET_ACCESS_KEY=<paste>

TZ=Africa/Djibouti
TRUST_FORWARDED_HEADERS=true
NODE_ENV=production
EOF
chmod 600 /tmp/time.env
```

### 7. Create the DigitalOcean droplet (~3 min)

In the DigitalOcean dashboard:

1. **Create → Droplets**
2. Region: **Bangalore (BLR1)**
3. Image: **Ubuntu 24.04 (LTS) x64**
4. Size: **Basic → Regular → $6/mo (1 GB RAM, 1 vCPU, 25 GB SSD)**
5. Authentication: **SSH Key** (pick the key already on your Mac; if none is on file, paste `~/.ssh/id_ed25519.pub` first)
6. Hostname: `portside-time-prod`
7. **Add Backups**: yes (the $1.20/mo weekly snapshots)
8. Create.

Note the public IPv4 address. You'll need it once to SSH in for bootstrap.

### 8. Push the deploy branch and wait for the first GHCR build

Before the droplet can pull anything, the GH Actions workflow needs to have
built and pushed the image at least once.

From your Mac:

```bash
cd ~/Desktop/portside-time
git push -u origin pivot/digitalocean-cloudflare-deploy
```

Then either:

- (a) **Recommended:** open a PR, review, merge to `main`. The workflow
  triggers on push to main and the image lands at `ghcr.io/bashir-netizen/portside-time:latest`.
- (b) **Faster:** temporarily change `.github/workflows/build.yml` to trigger
  on the pivot branch, push, let it build once, then revert. Avoid this if
  the PR review is doable.

After the workflow goes green, confirm:

```bash
# Optional, from Mac:
docker login ghcr.io -u bashir-netizen   # paste the PAT from step 4
docker pull ghcr.io/bashir-netizen/portside-time:latest
```

That confirms the image exists and the PAT works.

**Make the package private** while you're there: GitHub → your profile →
Packages → portside-time → Package settings → Change visibility → Private.

### 9. Run the bootstrap on the droplet (~10 min)

From your Mac terminal:

```bash
# Copy the env file up first:
scp /tmp/time.env root@<DROPLET_IP>:/tmp/time.env

# SSH in:
ssh root@<DROPLET_IP>

# On the droplet — clone the repo just to get the script:
apt-get update && apt-get install -y git
git clone --branch main https://github.com/bashir-netizen/portside-time.git /opt/portside-time

# Run bootstrap with all required env vars (paste your values):
sudo TAILSCALE_AUTHKEY='tskey-auth-...' \
     GHCR_USERNAME='bashir-netizen' \
     GHCR_TOKEN='ghp_...' \
     CLOUDFLARED_TUNNEL_TOKEN='eyJ...' \
     TIME_ENV_SOURCE=/tmp/time.env \
     bash /opt/portside-time/scripts/bootstrap-server.sh
```

The script logs each step and prints a summary at the end (tunnel status,
container status, Tailscale IP). Total runtime ~5–10 min on first run.

When done, **shred the env file off the droplet**:
```bash
shred -u /tmp/time.env
```

### 10. Cloudflare Access (~5 min)

In the Cloudflare Zero Trust dashboard:

1. **Access → Applications → Add an application → Self-hosted**
2. Application name: `portside-time`
3. Application domain: `time.portsideshift.com`
4. Session duration: 24 hours
5. App Launcher visibility: **off**
6. Next.

**Policy 1 — "Office network"**:
- Action: **Allow**
- Rules → Include: **IP Ranges** = `197.241.65.2/32` (the office IP from
  `docs/setup/OFFICE-IP.md`)
- No identity provider (silent pass-through for in-office punches)

**Policy 2 — "Admin email OTP"**:
- Action: **Allow**
- Rules → Include: **Emails** = `bashir@portside-logistics.com`
- Authentication → require: **One-time PIN**

Save. Anything else gets the default block.

### 11. Acceptance tests

- [ ] Office Wi-Fi: open `https://time.portsideshift.com/api/health` →
      returns 200 + JSON `{"ok":true}` in under 2s (no Access prompt)
- [ ] Mobile data (Wi-Fi off): same URL → Cloudflare Access "Forbidden" page
- [ ] Mobile data + admin email: open `https://time.portsideshift.com/login`,
      go through email OTP, sign in with `ADMIN_EMAIL` + bootstrap password
- [ ] Office Wi-Fi, admin login → `/admin/devices/register` → register an
      office PC; then employee tab on `/login` → PIN sign-in works
- [ ] R2 bucket `portside-backups` shows objects in `time/` prefix within
      a minute of the app starting (Litestream is replicating)
- [ ] Restore drill (see §"Restoring from a Litestream backup" below) —
      do this ONCE before declaring the deploy complete

### 12. Post-deploy

- [ ] Remove the HP laptop from Tailscale admin
  (https://login.tailscale.com/admin/machines)
- [ ] Make the GitHub repo private (Settings → Danger zone → Change visibility)
- [ ] Set up UptimeRobot or similar on `/api/health` (5-min interval, alert
      to `bashir@portside-logistics.com`)
- [ ] Rotate `ADMIN_PASSWORD_BOOTSTRAP` once Bashir has signed in once
  (see "Rotating the admin password" below)

### 13. First admin actions in the app (~10 min)

The production seed creates the admin user, three schedule templates
(`Standard 08-17` / `Split day (long lunch)` / `Continuous day (on-site lunch)`),
and the 2026 Djibouti national holidays. No employees are seeded — admins
add real staff via the UI:

- [ ] `/admin/settings` — confirm `gracePeriodMinutes` (default 15),
      `justificationWindowHours` (default 48), `annualLeaveAccrualPerMonth`
      (default 2.5 days/mo per Code du Travail Article 99).
- [ ] `/admin/employees/new` — create each employee. Required fields:
      full name, position, monthly salary in DJF, hire date, schedule
      template. Set initial PIN after creation; share it with the employee
      verbally/in person.
- [ ] `/admin/holidays` — verify the 2026 list; correct the lunar (Eid /
      Mouled / Hégire) dates once the Ministry publishes the official
      calendar. Each Islamic holiday is seeded as `(estimé)`.
- [ ] `/admin/devices/register` — register the kiosk / shared device(s)
      from inside the office.

---

## Day-2 operations

### Updates / redeploys

From any machine with SSH access (Tailscale works from anywhere):

```bash
ssh root@<TAILSCALE_IP>
cd /opt/portside-time
git pull --ff-only
docker compose pull
docker compose up -d
docker compose logs --tail=50 app
```

The GH Actions workflow rebuilds `:latest` on every push to main, so
`docker compose pull` picks up the new image. Migrations run automatically
in the entrypoint.

### Rolling back to a previous image

Each commit pushes a `sha-<commit>` tag. To pin:

```bash
# On the server:
cd /opt/portside-time
# Edit docker-compose.yml temporarily, change :latest to :sha-<commit>
docker compose pull
docker compose up -d
```

Or use a `compose.override.yml` to keep the override out of git.

### Restoring from a Litestream backup (TEST THIS BEFORE PROD)

```bash
ssh root@<TAILSCALE_IP>
cd /opt/portside-time

# 1. Stop the app (Litestream keeps replicating; we just don't want writes):
docker compose stop app

# 2. Pull restore tool into a one-shot container reading the same env:
docker compose run --rm litestream \
    restore -o /data/portside.restored.db /data/portside.db

# 3. Integrity check:
docker compose run --rm litestream \
    sh -c 'sqlite3 /data/portside.restored.db "PRAGMA integrity_check"'
# Expect: ok

# 4. Swap:
mv /srv/portside/data/portside.db /srv/portside/data/portside.db.before-restore
mv /srv/portside/data/portside.restored.db /srv/portside/data/portside.db

# 5. Restart the app:
docker compose start app
docker compose logs --tail=50 app

# 6. Test the app from the office.
```

To restore to a specific point in time (e.g., "5 minutes before the
disaster"):
```bash
docker compose run --rm litestream \
    restore -timestamp 2026-05-16T14:30:00Z -o /data/portside.restored.db /data/portside.db
```

### Late-incident workflow (spec §5.5 + §5.6)

Every late `shift_in` (past `gracePeriodMinutes` after the scheduled
start) or early `shift_out` creates a `LateIncident` automatically.
Lifecycle: `pending_justification` → `submitted` → `justified` /
`manager_unjustified`. If the employee doesn't submit a reason within
`justificationWindowHours` (default 48), it auto-flips to
`auto_unjustified`.

No cron sidecar — the auto-flip runs lazily on every `/admin/late` and
`/me/justify` page load. Operators should glance at `/admin/late` at
least once per workday; pending decisions also surface on `/admin`.

**Article 59 al. 9 flag**: 3+ unjustified incidents (rejected or
auto-unjustified) in any rolling 30-day window flag the employee on
`/admin/late`. The flag is informational — disciplinary action is the
admin's call, taken outside the app.

To adjust the grace period or justification window, edit
`/admin/settings`. Changes apply to incidents created after the save.

### Rotating the admin password

After Bashir's first sign-in:

```bash
ssh root@<TAILSCALE_IP>
cd /opt/portside-time

docker compose exec app sh -lc '
node -e "
const { PrismaClient } = require(\"./src/generated/prisma/client\");
const { PrismaBetterSqlite3 } = require(\"@prisma/adapter-better-sqlite3\");
const { hash } = require(\"@node-rs/argon2\");
(async () => {
  const url = process.env.DATABASE_URL.replace(/^file:/, \"\");
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  const newPwd = process.argv[1];
  const passwordHash = await hash(newPwd, { memoryCost: 65536, timeCost: 3, parallelism: 1 });
  await db.user.update({ where: { email: process.env.ADMIN_EMAIL }, data: { passwordHash } });
  console.log(\"updated\");
})()
" "<new-strong-password>"
'

# Then update ADMIN_PASSWORD_BOOTSTRAP in /etc/portside/time.env to match,
# and restart so the seed sync stays consistent on future redeploys:
nano /etc/portside/time.env
docker compose restart app
```

### Approving a new office IP (when ISP-assigned IP changes)

Two paths, depending on whether you're at the office:

**From the office (silent flow):**
1. Employee attempts to punch → gets `Access denied` banner from Cloudflare Access (Cloudflare hasn't been told the new IP yet)
2. From your phone with mobile data, sign in via email OTP at
   `https://time.portsideshift.com/admin/ip-allowlist`
3. Add the new IP. Caveat: Cloudflare Access also needs the IP added in
   Zero Trust → Access → Applications → portside-time → Edit → Policy 1 →
   add `<new_ip>/32` to the IP Ranges list. **Both layers need updating.**

**Update OFFICE-IP.md** when this happens so we have a historical record:

```bash
# On your Mac:
cd ~/Desktop/portside-time
sed -i.bak 's/[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+/<new_ip>/' docs/setup/OFFICE-IP.md
# Also bump the captured-on date
git commit -am "chore: office IP rotated to <new_ip>"
git push
```

### Rotating R2 credentials

1. Cloudflare R2 → API Tokens → Create new token (same scope) → save
2. Update `/etc/portside/time.env` on the server with new `R2_ACCESS_KEY_ID`
   + `R2_SECRET_ACCESS_KEY`
3. `docker compose restart litestream`
4. Verify replication continues: `docker compose logs litestream --tail=20`
5. Once confirmed healthy, **revoke the old token** in the Cloudflare R2
   API Tokens page

### Rotating the Tailscale auth key

Tailscale auth keys are one-use. The VPS node persists indefinitely after
joining. You only need a new auth key if:
- You're rebuilding the VPS from scratch
- The original key was leaked

Generate a fresh key per §5 above.

---

## Troubleshooting

### `docker compose logs app` shows env-validation crash on start

Cause: `/etc/portside/time.env` missing a required var, or value too short
(secrets need 32+ char hex). Fix the env file, `docker compose restart app`.

### `cloudflared` service won't connect

```bash
systemctl status cloudflared
journalctl -u cloudflared -n 50 --no-pager
```

Common causes:
- Token mismatch → reinstall: `cloudflared service uninstall && cloudflared service install <token>`
- Outbound HTTPS blocked → unlikely on DigitalOcean but check UFW rules
- Tunnel already has a connector elsewhere → check the tunnel's "Connectors" page in Cloudflare; old HP connector should be removed

### Caddy returns 502 to cloudflared

```bash
docker compose ps                                                          # app must be healthy
docker compose exec caddy wget -qO- http://app:3000/api/health             # works?
```

If `app` is not healthy, check `docker compose logs app`.

### Litestream not replicating

```bash
docker compose logs litestream --tail=50
```

Common: bad R2 credentials, wrong endpoint, bucket doesn't exist. Verify
the bucket appears in `s3` listing:

```bash
docker compose run --rm litestream \
    snapshots -config /etc/litestream.yml /data/portside.db
```

### Office IP shows as wrong in app logs

Caddy is hardcoded to trust `Cf-Connecting-Ip`. If the X-Forwarded-For
chain looks wrong, check:
1. Cloudflared is the one terminating connections from Cloudflare (verify with
   `journalctl -u cloudflared`)
2. The app respects `TRUST_FORWARDED_HEADERS=true` (it does — see
   `src/middleware.ts`)

---

## Secrets reference (where everything lives)

| Secret | Lives in | Used by |
|---|---|---|
| `SESSION_SECRET` etc. | 1Password "Portside Infra" + `/etc/portside/time.env` | app |
| `R2_ACCESS_KEY_ID` etc. | 1Password + `/etc/portside/time.env` | litestream |
| Cloudflare tunnel token | 1Password + `/etc/cloudflared/<id>.json` (on disk) | cloudflared systemd service |
| GHCR PAT | 1Password + `~/.docker/config.json` (on disk, hashed) | docker pull on the VPS |
| Tailscale auth key | 1Password (one-use; not stored after bootstrap) | bootstrap-server.sh |
| Admin password | 1Password (the hashed value is in SQLite) | admin login |

---

## Open items

These need attention before declaring "production":

- [ ] Set up Resend domain verification for `portsideshift.com` so the
      new-IP alert email actually sends instead of just logging
- [ ] Replace `ADMIN_PASSWORD_BOOTSTRAP` with a real value after first
      sign-in (see "Rotating the admin password")
- [ ] Add more admins to the Cloudflare Access email-OTP policy if needed
- [ ] Add second-app pattern to Caddyfile + tunnel when Fortis Clean Engine
      or School Tracker move to this server
- [ ] Add UptimeRobot / Better Stack monitoring
- [ ] Document a `/admin/security` self-serve password reset page in a future
      Phase 2 polish pass (currently CLI-only)
