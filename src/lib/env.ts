import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_DOMAIN: z.string().min(1),
  APP_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),

  SESSION_SECRET: z.string().min(32),
  DEVICE_COOKIE_SECRET: z.string().min(32),
  FINGERPRINT_SECRET: z.string().min(32),
  APPROVAL_TOKEN_SECRET: z.string().min(32),

  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD_BOOTSTRAP: z.string().min(8),
  ADMIN_ALERT_EMAIL: z.string().email(),

  // SMTP for the new-IP alert email. Empty values mean "log instead of send"
  // (useful in local dev).
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().default(465),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().min(1).default("Portside Time <noreply@example.com>"),

  TZ: z.string().default("Africa/Djibouti"),
  TRUST_FORWARDED_HEADERS: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  throw new Error("Refusing to start: environment misconfigured");
}

export const env = parsed.data;
