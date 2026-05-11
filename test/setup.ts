// Ensure env vars are present for env.ts when the lib gets imported.
const env = process.env as Record<string, string | undefined>;
env.NODE_ENV ??= "test";
env.APP_DOMAIN ??= "test.local";
env.APP_URL ??= "http://test.local";
env.DATABASE_URL ??= "file::memory:";
env.SESSION_SECRET ??= "x".repeat(64);
env.DEVICE_COOKIE_SECRET ??= "y".repeat(64);
env.FINGERPRINT_SECRET ??= "z".repeat(64);
env.APPROVAL_TOKEN_SECRET ??= "w".repeat(64);
env.ADMIN_EMAIL ??= "admin@test.local";
env.ADMIN_PASSWORD_BOOTSTRAP ??= "PasswordForTests1";
env.ADMIN_ALERT_EMAIL ??= "admin@test.local";
env.RESEND_FROM ??= "Test <test@test.local>";
env.TRUST_FORWARDED_HEADERS ??= "false";
