#Requires -RunAsAdministrator
# Portside Time — laptop bootstrap (part 1 of 2)
#
# Run from an Administrator PowerShell on the HP laptop:
#   irm https://raw.githubusercontent.com/bashir-netizen/portside-time/main/scripts/bootstrap-laptop-1.ps1 | iex
#
# What this does:
#   1. Power settings (never sleep, lid/power button = do nothing)
#   2. Installs Git for Windows + Docker Desktop via winget
#   3. Ensures WSL2 is set up (Docker needs it)
#   4. Enables OpenSSH Server so you can administer from your Mac via SSH
#   5. Prompts you to reboot, then run part 2

$ErrorActionPreference = "Stop"

function Section($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

Section "Portside Time laptop bootstrap (1/2)"

# ---------- Power ----------
Section "Configuring power"
powercfg /change standby-timeout-ac 0  | Out-Null
powercfg /change disk-timeout-ac 0     | Out-Null
powercfg /change hibernate-timeout-ac 0 | Out-Null
# Lid close action GUID = 5ca83367-...  →  0 = Do nothing
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS 5ca83367-6e45-459f-a27b-476b1d01c936 0 | Out-Null
powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS 5ca83367-6e45-459f-a27b-476b1d01c936 0 | Out-Null
# Power button action GUID = 7648efa3-...  →  0 = Do nothing
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS 7648efa3-dd9c-4e3e-b566-50f929386280 0 | Out-Null
powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS 7648efa3-dd9c-4e3e-b566-50f929386280 0 | Out-Null
powercfg /setactive SCHEME_CURRENT | Out-Null
Write-Host "Power: never sleep on AC; lid/power button = Do nothing." -ForegroundColor Green

# ---------- Git ----------
Section "Installing Git for Windows"
winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements

# ---------- Docker Desktop ----------
Section "Installing Docker Desktop (3-5 minutes)"
winget install --id Docker.DockerDesktop -e --silent --accept-package-agreements --accept-source-agreements

# ---------- WSL2 ----------
Section "Ensuring WSL2"
wsl --install --no-distribution 2>$null
wsl --set-default-version 2 2>$null
Write-Host "WSL2 ready (or already was)." -ForegroundColor Green

# ---------- OpenSSH Server (so you can admin from Mac) ----------
Section "Enabling OpenSSH Server for remote admin from your Mac"
try {
  Add-WindowsCapability -Online -Name "OpenSSH.Server~~~~0.0.1.0" | Out-Null
  Start-Service sshd
  Set-Service -Name sshd -StartupType "Automatic"
  if (-not (Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -DisplayName "OpenSSH Server (TCP-In)" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
  }
  $ipv4 = (Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp,Manual -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
  Write-Host "SSH enabled. From your Mac after reboot, connect with:" -ForegroundColor Green
  Write-Host "    ssh $env:USERNAME@$ipv4" -ForegroundColor Yellow
} catch {
  Write-Host "OpenSSH install hit a snag (this is non-fatal): $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "  Part 1 done. REBOOT NOW.                              " -ForegroundColor Green
Write-Host "  After reboot:                                          " -ForegroundColor Green
Write-Host "    1. Open Docker Desktop once, accept license, skip   " -ForegroundColor Green
Write-Host "       sign-in. Wait for the whale icon in the tray to  " -ForegroundColor Green
Write-Host "       stop animating.                                  " -ForegroundColor Green
Write-Host "    2. Either:                                          " -ForegroundColor Green
Write-Host "         (a) Admin PowerShell on the laptop, run:       " -ForegroundColor Green
Write-Host "         (b) SSH from your Mac, then run:               " -ForegroundColor Green
Write-Host "       irm https://raw.githubusercontent.com/bashir-netizen/portside-time/main/scripts/bootstrap-laptop-2.ps1 | iex" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Green
Write-Host ""
$confirm = Read-Host "Reboot now? (y/n)"
if ($confirm -eq 'y') { Restart-Computer -Force }
