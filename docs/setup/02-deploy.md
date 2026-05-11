# Step 2 — First deploy and updates

Prereq: `docs/setup/01-vps.md` checklist passes (Hetzner CX22 provisioned, DNS
pointing, Resend verified, persistent dirs, firewall, Docker installed).

## First deploy

```bash
# As deploy@<vps>
cd ~
git clone https://github.com/<your-account>/portside-time.git
cd portside-time

# Generate four 32-byte secrets and the rest of .env.
sudo tee /etc/portside/time.env > /dev/null <<'EOF'
APP_DOMAIN=time.portside.dj
APP_URL=https://time.portside.dj
DATABASE_URL=file:/data/portside.db
SESSION_SECRET=$(openssl rand -hex 32)
DEVICE_COOKIE_SECRET=$(openssl rand -hex 32)
FINGERPRINT_SECRET=$(openssl rand -hex 32)
APPROVAL_TOKEN_SECRET=$(openssl rand -hex 32)
ADMIN_EMAIL=bashir@portside-logistics.com
ADMIN_PASSWORD_BOOTSTRAP=<choose a strong throwaway>
ADMIN_ALERT_EMAIL=bashir@portside-logistics.com
RESEND_API_KEY=<from Resend dashboard>
RESEND_FROM=Portside Time <time@portside.dj>
TZ=Africa/Djibouti
TRUST_FORWARDED_HEADERS=true
NODE_ENV=production
EOF
sudo chmod 600 /etc/portside/time.env

docker compose up -d --build
docker compose ps
docker compose logs --tail=200 app
```

After ~30 seconds:

```bash
curl https://time.portside.dj/api/health
# → {"ok":true}
```

Then visit `https://time.portside.dj/login` from your phone, sign in as admin,
and:

1. Open `/admin/devices/register` from one of the office PCs and register it.
2. Go back to `/admin/ip-allowlist`. The next employee-login attempt from the
   office will trigger the email and banner; click Approve.

## Updates

```bash
cd ~/portside-time
git pull
docker compose up -d --build
```

Compose recreates the `app` container with the new image. Migrations are
applied automatically by `docker/entrypoint.sh` before the server starts.

## Rotate the admin password

There is no self-serve reset yet (Phase 2 task). Until then:

```bash
docker compose exec app sh
# Inside:
node -e '
const { PrismaClient } = require("./src/generated/prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const { hash } = require("@node-rs/argon2");
(async () => {
  const url = process.env.DATABASE_URL.replace(/^file:/, "");
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  const newPwd = process.argv[1];
  const passwordHash = await hash(newPwd, { memoryCost: 65536, timeCost: 3, parallelism: 1 });
  await db.user.update({ where: { email: process.env.ADMIN_EMAIL }, data: { passwordHash } });
  console.log("updated");
})()' "<new password>"
```

Then update `ADMIN_PASSWORD_BOOTSTRAP` in `/etc/portside/time.env` to match
(so any future seed run doesn't reset back to the old value), and restart:
`docker compose restart app`.

## Manual backup until B2 lands

```bash
docker compose exec app sqlite3 /data/portside.db ".backup '/data/portside-$(date +%F).db'"
# Copy off the box:
rsync -avz deploy@<vps>:/srv/portside/data/portside-*.db ./backups/
```

The B2-pushed nightly backup task is in the Phase 2 backlog.
