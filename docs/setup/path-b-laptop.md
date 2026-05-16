# Path B — HP laptop + Cloudflare Tunnel setup

> ⚠️ **Historical / discontinued (2026-05-16).** This path was attempted and
> abandoned. Docker Desktop on Windows is incompatible with SSH-only ops
> (its credential helper requires an interactive Windows logon session); git
> on Windows mangles `entrypoint.sh` with CRLF; compose's Linux absolute
> paths don't translate cleanly to Windows. The repo and its tooling are
> designed for Linux. See `RUNBOOK.md` for the active deployment path
> (DigitalOcean + Cloudflare Tunnel + Access + GHCR + Litestream).
>
> Kept for reference only — don't follow these steps.

---

The completely-free deployment. The HP laptop sits at the office and runs the
app; Cloudflare Tunnel exposes it at `https://time.portside.dj` without
opening any inbound ports on the office network.

**Recurring cost:** $0. No credit card touches anything in the stack.

---

## Prereqs

- An HP laptop (any model from the last ~8 years). Plugged in 24/7, ideally
  on Ethernet, lid open on a stand for airflow.
- A Cloudflare account (free) with `portside.dj` already on Cloudflare DNS.
- A Google account or Google Workspace account for SMTP (used to send the
  rare new-IP alert email to Bashir).

---

## Step 1 — Prepare the laptop

### 1a. Operating system

Stay with whatever's already on it. If it's Windows 10/11, that's fine. If
you want a clean Linux setup, install Ubuntu 24.04 LTS, but it's not
required.

### 1b. Stop it from sleeping

This is the most common cause of "app went down overnight."

**Windows 10/11:**
- Settings → System → Power & battery → Screen and sleep:
  - "On battery, turn off screen after" → 5 minutes
  - "When plugged in, turn off screen after" → 15 minutes
  - "On battery, put device to sleep after" → 30 minutes
  - **"When plugged in, put device to sleep after" → Never** ← critical
- Settings → System → Power & battery → Lid, power, and sleep button controls:
  - **"When I close the lid (plugged in)" → Do nothing** ← critical
- Control Panel → Power Options → Change plan settings → Change advanced
  power settings → USB selective suspend: Disabled (prevents the network
  adapter from going to sleep)

**Ubuntu:**
```bash
sudo sed -i 's/^#HandleLidSwitch=.*/HandleLidSwitch=ignore/' /etc/systemd/logind.conf
sudo sed -i 's/^#HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/' /etc/systemd/logind.conf
sudo sed -i 's/^#IdleAction=.*/IdleAction=ignore/' /etc/systemd/logind.conf
sudo systemctl restart systemd-logind
```

### 1c. Battery care (optional but recommended)

If you'll keep the laptop plugged in 24/7, cap battery charging at 80% to
keep the battery healthy. Most HP laptops have this in **BIOS** (boot,
press F10) under "Advanced → Battery Health Manager → Adaptive". Or via the
**HP Support Assistant** app on Windows.

### 1d. Disable forced reboots from updates

**Windows:** Settings → Windows Update → Advanced options →
- "Active hours" → Manually → 06:00 to 22:00 (covers the workday — no
  reboots during business hours)
- "Notify me when a restart is required" → On

**Ubuntu:** unattended-upgrades only patches packages, doesn't reboot.
Manually reboot once a month after-hours.

### 1e. Ethernet > WiFi

Plug the laptop into the office router via Ethernet if at all possible.
WiFi works but is more flaky for long-running connections like the tunnel.

---

## Step 2 — Install Docker

### Windows 10/11

1. Download **Docker Desktop** from https://www.docker.com/products/docker-desktop/
2. Run the installer; accept defaults; restart when prompted.
3. Open Docker Desktop once — it'll prompt you to enable WSL2. Say yes.
4. Verify: open PowerShell, run `docker --version` and `docker compose version`.

> Docker Desktop is free for companies under 250 employees and under
> $10M/year revenue. Portside qualifies.

### Ubuntu

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# log out and back in
docker --version
docker compose version
```

---

## Step 3 — Create a Cloudflare Tunnel

This is the magic that lets the laptop be reachable at `time.portside.dj`
without opening any inbound port on the office network.

1. **Cloudflare dashboard** → **Zero Trust** (in the left sidebar) →
   you'll be prompted to set up Cloudflare Zero Trust. Free plan, 50 users.
   Pick "Free" and enter a team name like `portside`.
2. **Networks** → **Tunnels** → **Create a tunnel**.
3. Connector type: **Cloudflared**. Name it `portside-office`.
4. Save tunnel → you'll see a screen with installation commands and a
   **token** (a long random string). **Copy the token, set it aside** —
   we'll paste it into the laptop's `time.env` file in step 5.
5. **Public Hostname** tab → **Add a public hostname**:
   - Subdomain: `time`
   - Domain: `portside.dj`
   - Service: `HTTP`
   - URL: `app:3000`  ← the service inside our Docker network
   - Save.

Cloudflare automatically issues TLS for `time.portside.dj`. You don't run
Caddy or manage certificates yourself.

---

## Step 4 — Generate an app password for SMTP

The app sends one or two emails a year (when the office IP changes). Gmail
SMTP is the easiest free option.

1. Use a Google account you control (e.g., your `@portside-logistics.com`
   Workspace account).
2. **2-Step Verification** must be enabled first:
   https://myaccount.google.com/security
3. Generate an App Password:
   https://myaccount.google.com/apppasswords
4. Name it `Portside Time`. Copy the 16-character password. Strip spaces.
5. Save it — we'll paste it into `time.env` in step 5.

---

## Step 5 — Get the app onto the laptop

### 5a. Clone the repo

```bash
git clone https://github.com/bashir-netizen/portside-time.git
cd portside-time
```

You may need to install git first.
- **Windows:** https://git-scm.com/download/win, accept defaults.
- **Ubuntu:** `sudo apt install -y git`.

### 5b. Create the env file

```bash
cp .env.example time.env
```

Open `time.env` in any text editor. Fill in:

- The four secrets (`SESSION_SECRET`, `DEVICE_COOKIE_SECRET`,
  `FINGERPRINT_SECRET`, `APPROVAL_TOKEN_SECRET`):
  - Generate each with `openssl rand -hex 32` (or any 64-char random string)
- `ADMIN_EMAIL` = `bashir@portside-logistics.com`
- `ADMIN_PASSWORD_BOOTSTRAP` = a strong throwaway, save it in your password
  manager
- `ADMIN_ALERT_EMAIL` = `bashir@portside-logistics.com`
- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `465`
- `SMTP_USER` = your Gmail / Workspace address
- `SMTP_PASS` = the 16-char app password from step 4 (spaces removed)
- `SMTP_FROM` = `Portside Time <your-gmail@example.com>`
- `BACKUP_ENCRYPTION_KEY` = `openssl rand -hex 32` (32-byte hex)
- `TRUST_FORWARDED_HEADERS=true`
- `NODE_ENV=production`

Also create a separate file `.env` next to `time.env`:

```
CLOUDFLARED_TUNNEL_TOKEN=<paste the token from step 3 here>
```

This is read by `docker-compose.path-b.yml` for the cloudflared service.

### 5c. Start it

```bash
docker compose -f docker-compose.path-b.yml up -d --build
```

First build takes 3-5 minutes. After:

```bash
docker compose -f docker-compose.path-b.yml ps
docker compose -f docker-compose.path-b.yml logs --tail=200 app
docker compose -f docker-compose.path-b.yml logs --tail=200 cloudflared
```

You should see:
- `app` status: healthy
- `cloudflared` logs: "Registered tunnel connection" (×4)

### 5d. Verify

Open https://time.portside.dj/api/health on **any** device — your phone on
mobile data, a friend's laptop, the office WiFi — anywhere. You should
get `{"ok":true}` over a valid Let's Encrypt-style cert (Cloudflare issues
it).

---

## Step 6 — First-time admin setup

Open https://time.portside.dj/login from your phone (or anywhere).

1. **Sign in** as admin with `ADMIN_EMAIL` / `ADMIN_PASSWORD_BOOTSTRAP`.
2. Go to `/admin/ip-allowlist` → add the office's public IP. (See
   `docs/setup/OFFICE-IP.md` — currently `197.241.65.2`.) Label it
   `Office WiFi 2026-05`.
3. From an office PC's browser, go to `https://time.portside.dj/admin/devices/register`.
   Sign in as admin → register the PC with a label like `Operations PC`.
   Repeat for each of the 3 office PCs.
4. Go to `/admin/employees` → tap each placeholder (`Employee 1` through 4)
   → Edit → set the real name, position, monthly salary, hire date.
5. For each employee, tap "Reset PIN" → copy the 6-digit PIN it shows once
   → write it down and hand it to that employee privately.
6. Optionally: `/admin/holidays` → seed the Djibouti national holidays for
   the year (Independence Day, Eid al-Fitr, Eid al-Adha, etc.).
7. Optionally: rotate the admin password by editing the DB or temporarily
   changing it via SQL (a self-serve UI for this lands in a polish pass).

Employees can now punch from their office PCs by going to
`https://time.portside.dj/login` → "Employee" tab → picking their name →
entering their 6-digit PIN. The big primary button shows the next valid
punch type.

---

## Step 7 — Test the backup flow

Backups run nightly at 02:00 Africa/Djibouti (23:00 UTC). To test it on
demand:

```bash
docker compose -f docker-compose.path-b.yml exec backup \
  node node_modules/.bin/tsx scripts/backup-local.ts
```

You should see a new file appear at `./data/backups/portside-YYYY-MM-DD.db.enc`.
Once a week, copy the contents of `./data/backups/` to a USB drive and
take the USB home with you. That's your off-site copy.

---

## Operational notes

### When the office IP changes

Same as the cloud-VPS design:
- Employee attempts to punch → gets `Access denied`.
- The app records the new IP and emails Bashir.
- Bashir opens the email link from anywhere, signs in, taps Approve.
- Punches resume.

### When the laptop reboots

Docker is configured with `restart: unless-stopped`, so all three services
come back up automatically when the laptop boots. You don't need to log
into the laptop on reboot — the services start before any user logs in.

If for some reason the services don't auto-start (e.g., Docker Desktop on
Windows requires a logged-in session in some configurations), set Windows
to **auto-login** the user account that has Docker Desktop installed.

### When the laptop power dies

Battery acts as a built-in UPS. For longer power outages, a $50 surge
protector with battery backup (APC, Belkin) gives you 30–90 minutes of
uptime. Anything beyond that and the office is dark anyway — accept the
downtime, add missing punches via the correction tool when you're back.

### Disaster recovery

If the laptop dies or gets stolen:
1. Get a replacement machine (or a Raspberry Pi 4, ~$50).
2. Install Docker, clone the repo, drop the `time.env` and `.env` files,
   and put the latest `portside-YYYY-MM-DD.db.enc` from the USB at
   `./data/backups/`.
3. Decrypt it:
   ```bash
   # (decryption script will be added in a future patch — for now, the
   # 32-byte AES-GCM format is: [12-byte IV][16-byte tag][ciphertext])
   ```
4. Rename it to `./data/portside.db`.
5. `docker compose -f docker-compose.path-b.yml up -d --build`.
6. Tunnel will reconnect automatically (the same token works from the new
   machine). Or, if you've revoked the old token in Cloudflare, generate a
   new one and update `.env`.

Expected downtime: 2–4 hours.
