#!/usr/bin/env bash
#
# Portside Time — server bootstrap.
#
# Takes a fresh Ubuntu 24.04 LTS box (DigitalOcean droplet, Hetzner CX22,
# any other VM) to a running stack. Idempotent: safe to re-run after fixing
# a failed step.
#
# Run as root (or via sudo). Requires these env vars set in the calling
# environment (use a one-off shell session, do NOT commit them):
#
#   TAILSCALE_AUTHKEY        Tailscale ephemeral auth key from admin console
#   GHCR_USERNAME            GitHub username (e.g. bashir-netizen)
#   GHCR_TOKEN               GitHub PAT with read:packages scope
#   CLOUDFLARED_TUNNEL_TOKEN The portside-office tunnel token (eyJ...)
#   TIME_ENV_SOURCE          Local path to a prepared time.env file. The
#                            script copies it to /etc/portside/time.env with
#                            mode 600. Generate it from RUNBOOK.md template.
#
# Usage:
#   sudo TAILSCALE_AUTHKEY=tskey-... GHCR_USERNAME=... GHCR_TOKEN=... \
#        CLOUDFLARED_TUNNEL_TOKEN=eyJ... TIME_ENV_SOURCE=/tmp/time.env \
#        bash scripts/bootstrap-server.sh
#
# Exits non-zero on any failure. Re-running is fine; each step checks before
# acting.

set -euo pipefail

# -------------------- guard rails --------------------

if [[ "${EUID}" -ne 0 ]]; then
    echo "ERROR: must run as root (use sudo)" >&2
    exit 1
fi

for var in TAILSCALE_AUTHKEY GHCR_USERNAME GHCR_TOKEN CLOUDFLARED_TUNNEL_TOKEN TIME_ENV_SOURCE; do
    if [[ -z "${!var:-}" ]]; then
        echo "ERROR: env var ${var} is required" >&2
        exit 1
    fi
done

if [[ ! -r "${TIME_ENV_SOURCE}" ]]; then
    echo "ERROR: TIME_ENV_SOURCE=${TIME_ENV_SOURCE} is not readable" >&2
    exit 1
fi

REPO_DIR="${REPO_DIR:-/opt/portside-time}"
REPO_URL="${REPO_URL:-https://github.com/bashir-netizen/portside-time.git}"
BRANCH="${BRANCH:-main}"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }

# -------------------- 1. apt baseline --------------------

log "apt update + baseline packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" upgrade
apt-get install -y \
    curl ca-certificates gnupg lsb-release \
    ufw fail2ban git sqlite3

# -------------------- 2. SSH hardening --------------------

log "SSH hardening (key auth only)"
sshd_config=/etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' "$sshd_config"
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' "$sshd_config"
sed -i 's/^#\?KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' "$sshd_config"
systemctl restart ssh

# -------------------- 3. UFW --------------------

log "UFW: allow SSH, deny all other inbound (tunnel is outbound-only)"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
# Tailscale handles admin SSH; allow port 22 over the wire for fallback so a
# Tailscale outage doesn't lock us out completely.
ufw allow 22/tcp comment 'ssh'
ufw --force enable
ufw status verbose

# -------------------- 4. Docker Engine + Compose --------------------

if ! command -v docker >/dev/null 2>&1; then
    log "Installing Docker Engine"
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin
else
    log "Docker already installed"
fi
systemctl enable --now docker

# -------------------- 5. Tailscale --------------------

if ! command -v tailscale >/dev/null 2>&1; then
    log "Installing Tailscale"
    curl -fsSL https://tailscale.com/install.sh | sh
fi
log "Joining Tailscale tailnet"
tailscale up --authkey="${TAILSCALE_AUTHKEY}" --ssh --accept-routes
tailscale status

# -------------------- 6. cloudflared (systemd service, not container) --------------------

if ! command -v cloudflared >/dev/null 2>&1; then
    log "Installing cloudflared from Cloudflare's apt repo"
    mkdir -p --mode=0755 /usr/share/keyrings
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
        | tee /usr/share/keyrings/cloudflare-main.gpg > /dev/null
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] \
        https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" \
        > /etc/apt/sources.list.d/cloudflared.list
    apt-get update -y
    apt-get install -y cloudflared
fi

log "Registering cloudflared as a systemd service with the tunnel token"
# `service install <token>` installs the systemd unit and saves the token to
# /etc/cloudflared/. Re-running with the same token is idempotent.
cloudflared service install "${CLOUDFLARED_TUNNEL_TOKEN}" || true
systemctl enable --now cloudflared
systemctl status cloudflared --no-pager | head -20 || true

# -------------------- 7. Persistent dirs --------------------

log "Creating /etc/portside, /srv/portside/{data}"
install -d -m 0700 /etc/portside /srv/portside /srv/portside/data

# -------------------- 8. time.env --------------------

log "Installing /etc/portside/time.env (mode 600, root-owned)"
install -m 0600 -o root -g root "${TIME_ENV_SOURCE}" /etc/portside/time.env

# -------------------- 9. Clone or update the repo --------------------

if [[ ! -d "${REPO_DIR}/.git" ]]; then
    log "Cloning ${REPO_URL} to ${REPO_DIR}"
    git clone --branch "${BRANCH}" "${REPO_URL}" "${REPO_DIR}"
else
    log "Updating ${REPO_DIR} (branch ${BRANCH})"
    git -C "${REPO_DIR}" fetch origin "${BRANCH}"
    git -C "${REPO_DIR}" checkout "${BRANCH}"
    git -C "${REPO_DIR}" pull --ff-only origin "${BRANCH}"
fi

# -------------------- 10. ghcr login --------------------

log "Logging in to ghcr.io"
echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin

# -------------------- 11. compose pull + up --------------------

cd "${REPO_DIR}"
log "docker compose pull"
docker compose pull
log "docker compose up -d"
docker compose up -d
docker compose ps

# -------------------- 12. Wait for health --------------------

log "Waiting for /api/health (max 90s)"
deadline=$(( $(date +%s) + 90 ))
while (( $(date +%s) < deadline )); do
    if curl -fsS http://127.0.0.1:8080/api/health -H 'Host: time.portsideshift.com' > /dev/null 2>&1; then
        log "Health check passed"
        break
    fi
    sleep 3
done

if ! curl -fsS http://127.0.0.1:8080/api/health -H 'Host: time.portsideshift.com' > /dev/null 2>&1; then
    warn "Health check did NOT pass within 90s. Inspect: docker compose logs app --tail=100"
fi

# -------------------- 13. Summary --------------------

cat <<EOF

==================================================================
  Portside Time bootstrap complete.

  Tunnel status:
$(cloudflared tunnel info "$(jq -r .TunnelID /etc/cloudflared/*.json 2>/dev/null | head -1)" 2>/dev/null | sed 's/^/    /' || echo "    (run: systemctl status cloudflared)")

  Containers:
$(docker compose ps --format 'table {{.Name}}\t{{.Status}}' | sed 's/^/    /')

  Tailscale IP:
    $(tailscale ip -4 || echo "    (run: tailscale status)")

  Next:
    1. Open Cloudflare Zero Trust → Access → Applications and create the
       portside-time application with the IP-allow + email-OTP policies
       per docs/setup/01-vps.md §Cloudflare Access.
    2. From the office Wi-Fi, hit https://time.portsideshift.com/login.
    3. Sign in with ADMIN_EMAIL + ADMIN_PASSWORD_BOOTSTRAP from time.env.
    4. Verify R2 backups are arriving:
         aws s3 ls s3://portside-backups/ \\
           --endpoint-url \$R2_ENDPOINT --no-verify-ssl
==================================================================

EOF
