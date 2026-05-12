# Portside Time — laptop bootstrap (part 2 of 2)
#
# Run after Docker Desktop is up, from PowerShell on the HP (locally or via SSH):
#   irm https://raw.githubusercontent.com/bashir-netizen/portside-time/main/scripts/bootstrap-laptop-2.ps1 | iex
#
# What this does:
#   1. Verifies git + docker work
#   2. Clones (or updates) the repo to ~\Desktop\portside-time
#   3. Prompts you for: admin email, Cloudflare tunnel token
#   4. Generates time.env with strong secrets, saves and prints the
#      bootstrap admin password
#   5. Writes .env with the tunnel token
#   6. Starts the docker-compose stack and shows logs

$ErrorActionPreference = "Stop"
function Section($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

Section "Portside Time laptop bootstrap (2/2)"

# ---------- Verify ----------
Section "Versions"
git --version
docker --version
docker compose version

# ---------- Docker running? ----------
$dockerOk = $false
try {
  docker info > $null 2>&1
  if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
} catch {}
if (-not $dockerOk) {
  Write-Host ""
  Write-Host "Docker isn't running yet. Open Docker Desktop, wait for the" -ForegroundColor Red
  Write-Host "whale icon in the system tray to stop animating, then re-run." -ForegroundColor Red
  return
}

# ---------- Clone / update repo ----------
Section "Repo"
Set-Location $env:USERPROFILE\Desktop
if (-not (Test-Path "portside-time")) {
  Write-Host "Cloning..."
  git clone https://github.com/bashir-netizen/portside-time.git
}
Set-Location portside-time
git pull --ff-only 2>$null | Out-Null

# ---------- Inputs ----------
Section "Inputs"
$AdminEmail = Read-Host "Admin email (Enter for bashir@portside-logistics.com)"
if ([string]::IsNullOrWhiteSpace($AdminEmail)) { $AdminEmail = "bashir@portside-logistics.com" }

Write-Host ""
Write-Host "Paste the Cloudflare tunnel token (the long eyJ... string)."
Write-Host "Get it from Cloudflare Zero Trust > Networks > Connectors >"
Write-Host "portside-office, in any of the install commands shown."
$Token = Read-Host "Token"
if ([string]::IsNullOrWhiteSpace($Token) -or -not $Token.StartsWith("eyJ")) {
  Write-Host "That doesn't look like a tunnel token. Aborting." -ForegroundColor Red
  return
}

# ---------- Generate secrets + time.env ----------
Section "Writing time.env"
function Rand-Hex { -join ((0..63) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) }) }
function Rand-Pwd  { -join ((1..20) | ForEach-Object { ('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ23456789'.ToCharArray() | Get-Random) }) }
$BootstrapPwd = Rand-Pwd

@"
APP_DOMAIN=time.portsideshift.com
APP_URL=https://time.portsideshift.com
DATABASE_URL=file:/data/portside.db
SESSION_SECRET=$(Rand-Hex)
DEVICE_COOKIE_SECRET=$(Rand-Hex)
FINGERPRINT_SECRET=$(Rand-Hex)
APPROVAL_TOKEN_SECRET=$(Rand-Hex)
ADMIN_EMAIL=$AdminEmail
ADMIN_PASSWORD_BOOTSTRAP=$BootstrapPwd
ADMIN_ALERT_EMAIL=$AdminEmail
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Portside Time <$AdminEmail>
TZ=Africa/Djibouti
TRUST_FORWARDED_HEADERS=true
NODE_ENV=production
BACKUP_ENCRYPTION_KEY=$(Rand-Hex)
"@ | Out-File -Encoding utf8 -NoNewline time.env

"CLOUDFLARED_TUNNEL_TOKEN=$Token" | Out-File -Encoding utf8 -NoNewline .env

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "  BOOTSTRAP ADMIN PASSWORD - SAVE THIS NOW:              " -ForegroundColor Green
Write-Host "    $BootstrapPwd" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Green
Write-Host ""

# ---------- Start the stack ----------
Section "Building & starting (first build takes 3-5 minutes)"
docker compose -f docker-compose.path-b.yml up -d --build

Start-Sleep -Seconds 10

Section "Service status"
docker compose -f docker-compose.path-b.yml ps

Section "Cloudflared logs (last 30 lines)"
docker compose -f docker-compose.path-b.yml logs --tail=30 cloudflared

Write-Host ""
Write-Host "Done. Test it from your phone (on mobile data, not office WiFi):" -ForegroundColor Green
Write-Host "    https://time.portsideshift.com/api/health" -ForegroundColor Yellow
Write-Host "Then sign in at https://time.portsideshift.com/login as $AdminEmail." -ForegroundColor Green
