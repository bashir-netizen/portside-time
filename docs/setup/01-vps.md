# Step 1 — VPS setup runbook

One-time operator setup. Captures the work behind build-order step 1 in the
Phase 1 plan. Don't move past this until the Verification gate at the bottom
passes.

## 1. Provision

- **Hetzner Cloud → CX22**, image Ubuntu 24.04 LTS, location **Falkenstein**.
- Add your SSH public key. Note the public IPv4.

## 2. Harden SSH

```bash
ssh root@<ip>

adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# /etc/ssh/sshd_config: set
#   PermitRootLogin no
#   PasswordAuthentication no
# then:
systemctl restart ssh
```

Re-login as `deploy@<ip>` and confirm sudo works (`sudo whoami`).

## 3. Firewall

```bash
sudo apt update && sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'ssh'
sudo ufw allow 80/tcp comment 'caddy acme'
sudo ufw allow 443/tcp comment 'caddy app'
sudo ufw enable
sudo ufw status verbose
```

## 4. Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy
# log out, back in
docker --version
docker compose version
```

## 5. Persistent dirs

```bash
sudo mkdir -p /srv/portside/data /srv/portside/caddy /etc/portside
sudo chmod 700 /srv/portside/data /srv/portside/caddy /etc/portside
sudo chown -R deploy:deploy /srv/portside /etc/portside
```

## 6. DNS

In your `portside.dj` zone:

- `A time.portside.dj → <VPS public IPv4>`, TTL 300

Verify:

```bash
dig +short time.portside.dj A
```

## 7. Resend domain verification

1. Resend dashboard → Domains → Add `portside.dj` (or the apex you use).
2. Add the 3 DNS records it shows (SPF TXT, two DKIM CNAMEs, return-path).
3. Wait for "Verified" status. Allow 5–60 minutes for DNS to propagate.
4. Create an API key scoped to "Sending access" on this domain. Save it.
5. Send a test email from the dashboard to `bashir@portside-logistics.com`.
   Confirm receipt.

## 8. Time sync

```bash
sudo timedatectl set-timezone UTC   # keep the box in UTC; app handles display TZ
timedatectl status                  # confirm `System clock synchronized: yes`
```

## 9. Verification gate

A bare nginx is enough to check TLS — the real app deploys in step 2.

```bash
docker run --rm -d -p 80:80 -p 443:443 \
  -v /srv/portside/caddy:/data \
  --name caddy-test caddy:2-alpine \
  caddy reverse-proxy --from time.portside.dj --to :8080 || true
sleep 30   # let ACME finish
curl -I https://time.portside.dj
docker stop caddy-test || true
```

Expected: a 502 (no upstream) under a valid Let's Encrypt cert. If the cert
chain is wrong or the response is plaintext, fix DNS / ports before moving on.

## What's next

Once this passes, proceed to step 2 — clone the repo onto the VPS and run
`docker compose up -d --build` per `docs/setup/02-deploy.md` (created in
that step's task).
