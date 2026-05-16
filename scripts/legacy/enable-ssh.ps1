#Requires -RunAsAdministrator
# One-shot: enable OpenSSH Server on Windows so you can ssh from your Mac.
#
# Run in an Administrator PowerShell:
#   irm https://raw.githubusercontent.com/bashir-netizen/portside-time/main/scripts/enable-ssh.ps1 | iex

$ErrorActionPreference = "Stop"

Write-Host "Installing OpenSSH Server feature..." -ForegroundColor Cyan
Add-WindowsCapability -Online -Name "OpenSSH.Server~~~~0.0.1.0" | Out-Null

Write-Host "Starting sshd..." -ForegroundColor Cyan
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic

Write-Host "Opening port 22 in Windows Firewall..." -ForegroundColor Cyan
if (-not (Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule `
        -Name "OpenSSH-Server-In-TCP" `
        -DisplayName "OpenSSH Server (TCP-In)" `
        -Enabled True `
        -Direction Inbound `
        -Protocol TCP `
        -Action Allow `
        -LocalPort 22 | Out-Null
}

$ipv4 = (Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp,Manual -ErrorAction SilentlyContinue |
    Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.*" } |
    Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "  SSH is now running on this laptop." -ForegroundColor Green
Write-Host "  From your Mac terminal, connect with:" -ForegroundColor Green
Write-Host "      ssh $env:USERNAME@$ipv4" -ForegroundColor Yellow
Write-Host "  Password: your Windows login password." -ForegroundColor Green
Write-Host ""
Write-Host "  (Write that command down before closing this window.)" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
