import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash as argonHash } from "@node-rs/argon2";

/*
 * Production-ready seed. Idempotent. Runs by default via
 * `npx prisma db seed` after every deploy bootstrap.
 *
 * Creates:
 *  - Admin user (from ADMIN_EMAIL + ADMIN_PASSWORD_BOOTSTRAP env vars)
 *  - The 3 schedule templates with their day-patterns (Standard 08-17,
 *    Split day (long lunch), Continuous day (on-site lunch))
 *  - 2026 Djibouti national holidays
 *
 * Does NOT create employees — admins do that via /admin/employees/new
 * after first sign-in. For local development with realistic data, run
 * `npx tsx scripts/seed-demo-data.ts` separately.
 */

const ARGON_OPTS = {
  memoryCost: 64 * 1024,
  timeCost: 3,
  parallelism: 1,
} as const;

type DP = {
  dayOfWeek: number;
  type: "split_day" | "continuous_day" | "half_day" | "day_off";
  startTime?: string;
  endTime?: string;
  lunchOutTime?: string;
  lunchInTime?: string;
  lunchBreakMinutes?: number;
  lunchOnSite?: boolean;
};

// Standard 08-17 — Sun..Thu+Sat split day with 1-hour midday lunch
const STANDARD_PATTERNS: DP[] = [0, 1, 2, 3, 4, 6].map((dow) => ({
  dayOfWeek: dow,
  type: "split_day" as const,
  startTime: "08:00",
  endTime: "17:00",
  lunchOutTime: "12:00",
  lunchInTime: "13:00",
}));
STANDARD_PATTERNS.push({ dayOfWeek: 5, type: "day_off" });
STANDARD_PATTERNS.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

// Split day (long lunch) — Sun..Thu split 08:30/12:00/16:15/18:30, Fri off, Sat half
const SPLIT_DAY_PATTERNS: DP[] = [
  ...[0, 1, 2, 3, 4].map<DP>((dow) => ({
    dayOfWeek: dow,
    type: "split_day",
    startTime: "08:30",
    endTime: "18:30",
    lunchOutTime: "12:00",
    lunchInTime: "16:15",
  })),
  { dayOfWeek: 5, type: "day_off" },
  { dayOfWeek: 6, type: "half_day", startTime: "08:30", endTime: "12:00" },
];

// Continuous day (on-site lunch) — Sun..Wed continuous, Thu half, Fri off, Sat split
const CONTINUOUS_DAY_PATTERNS: DP[] = [
  ...[0, 1, 2, 3].map<DP>((dow) => ({
    dayOfWeek: dow,
    type: "continuous_day",
    startTime: "08:30",
    endTime: "15:30",
    lunchBreakMinutes: 75,
    lunchOnSite: true,
  })),
  { dayOfWeek: 4, type: "half_day", startTime: "08:30", endTime: "12:00" },
  { dayOfWeek: 5, type: "day_off" },
  {
    dayOfWeek: 6,
    type: "split_day",
    startTime: "08:30",
    endTime: "18:30",
    lunchOutTime: "12:00",
    lunchInTime: "16:15",
  },
];

const TEMPLATES = [
  {
    name: "Standard 08-17",
    description:
      "Default split-day pattern. Sun–Thu + Sat: 08:00–12:00, 13:00–17:00. Fri off.",
    hasBusyDayExtension: false,
    busyDayEndTime: null,
    dayPatterns: STANDARD_PATTERNS,
  },
  {
    name: "Split day (long lunch)",
    description:
      "Sun–Thu 08:30 → 12:00, then 16:15 → 18:30 (off-site lunch). Fri off. Sat half-day 08:30–12:00. ~32h15/week. On busy days, employees stay on-site for lunch — per diem owed.",
    hasBusyDayExtension: true,
    busyDayEndTime: "18:30",
    dayPatterns: SPLIT_DAY_PATTERNS,
  },
  {
    name: "Continuous day (on-site lunch)",
    description:
      "Sun–Wed 08:30 → 15:30 with 75-min on-site lunch. Thu half-day 08:30–12:00. Fri off. Sat split-day. ~32h15/week. Busy days extend end to 18:30 — per diem owed.",
    hasBusyDayExtension: true,
    busyDayEndTime: "18:30",
    dayPatterns: CONTINUOUS_DAY_PATTERNS,
  },
];

const HOLIDAYS_2026 = [
  { ymd: "2026-01-01", name: "Jour de l'An", isPaid: true },
  { ymd: "2026-03-08", name: "Journée internationale de la femme", isPaid: true },
  { ymd: "2026-03-20", name: "Aïd al-Fitr (estimé)", isPaid: true },
  { ymd: "2026-05-01", name: "Fête du Travail", isPaid: true },
  { ymd: "2026-05-27", name: "Aïd al-Adha (estimé)", isPaid: true },
  { ymd: "2026-06-16", name: "Nouvel An Hégire (estimé)", isPaid: true },
  { ymd: "2026-06-27", name: "Fête de l'Indépendance", isPaid: true },
  { ymd: "2026-09-13", name: "Mouled (estimé)", isPaid: true },
  { ymd: "2026-12-25", name: "Noël", isPaid: false },
];

function djiboutiMidnight(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+03:00`);
}

async function main() {
  const url = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
  const adapter = new PrismaBetterSqlite3({ url });
  const db = new PrismaClient({ adapter });

  // ---------- admin user ----------
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD_BOOTSTRAP;
  if (!adminEmail || !adminPassword) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD_BOOTSTRAP must be set for seeding.");
    process.exit(1);
  }
  const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await argonHash(adminPassword, ARGON_OPTS);
    await db.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: "admin",
        status: "active",
        forcePasswordReset: true,
      },
    });
    console.log(`+ admin: ${adminEmail}`);
  } else {
    console.log(`✓ admin already exists: ${adminEmail}`);
  }

  // ---------- schedule templates ----------
  for (const t of TEMPLATES) {
    const existing = await db.scheduleTemplate.findUnique({ where: { name: t.name } });
    if (existing) {
      // Refresh: replace day patterns + update metadata
      await db.dayPattern.deleteMany({ where: { scheduleTemplateId: existing.id } });
      await db.scheduleTemplate.update({
        where: { id: existing.id },
        data: {
          description: t.description,
          hasBusyDayExtension: t.hasBusyDayExtension,
          busyDayEndTime: t.busyDayEndTime,
        },
      });
      for (const dp of t.dayPatterns) {
        await db.dayPattern.create({
          data: {
            scheduleTemplateId: existing.id,
            dayOfWeek: dp.dayOfWeek,
            type: dp.type,
            startTime: dp.startTime ?? null,
            endTime: dp.endTime ?? null,
            lunchOutTime: dp.lunchOutTime ?? null,
            lunchInTime: dp.lunchInTime ?? null,
            lunchBreakMinutes: dp.lunchBreakMinutes ?? null,
            lunchOnSite: dp.lunchOnSite ?? false,
          },
        });
      }
      console.log(`↻ template: ${t.name} (${t.dayPatterns.length} day patterns)`);
    } else {
      await db.scheduleTemplate.create({
        data: {
          name: t.name,
          description: t.description,
          hasBusyDayExtension: t.hasBusyDayExtension,
          busyDayEndTime: t.busyDayEndTime,
          dayPatterns: {
            create: t.dayPatterns.map((dp) => ({
              dayOfWeek: dp.dayOfWeek,
              type: dp.type,
              startTime: dp.startTime ?? null,
              endTime: dp.endTime ?? null,
              lunchOutTime: dp.lunchOutTime ?? null,
              lunchInTime: dp.lunchInTime ?? null,
              lunchBreakMinutes: dp.lunchBreakMinutes ?? null,
              lunchOnSite: dp.lunchOnSite ?? false,
            })),
          },
        },
      });
      console.log(`+ template: ${t.name}`);
    }
  }

  // ---------- holidays ----------
  for (const h of HOLIDAYS_2026) {
    const date = djiboutiMidnight(h.ymd);
    await db.holiday.upsert({
      where: { date },
      update: { name: h.name, isPaid: h.isPaid },
      create: { date, name: h.name, isPaid: h.isPaid },
    });
  }
  console.log(`✓ ${HOLIDAYS_2026.length} holidays present`);

  console.log("\nSeed complete. Sign in as admin, then create employees via /admin/employees/new.");
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
