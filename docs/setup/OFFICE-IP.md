# Office IP — captured 2026-05-12 at the office

```
197.241.65.2
```

This is the IP the VPS will see when an office device hits `time.portside.dj`.

On first deploy, add it via `/admin/ip-allowlist` with label `Office WiFi 2026-05`
*before* any employee tries to sign in (otherwise they'll hit the email-alert
flow on the very first attempt — which still works, just adds a step).

Djibouti ISP IPs change every few weeks/months. When it does, the new-IP email
flow takes over: Bashir gets an email, taps Approve, done in ~30 seconds.
