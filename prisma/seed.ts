import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash as argonHash } from "@node-rs/argon2";

const ARGON_OPTS = {
  memoryCost: 64 * 1024,
  timeCost: 3,
  parallelism: 1,
} as const;

const STANDARD_SCHEDULE_ID = "schedule_standard";

async function main() {
  const url = (process.env.DATABASE_URL ?? "file:./dev.db").replace(
    /^file:/,
    "",
  );
  const adapter = new PrismaBetterSqlite3({ url });
  const db = new PrismaClient({ adapter });

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD_BOOTSTRAP;
  if (!adminEmail || !adminPassword) {
    console.error(
      "ADMIN_EMAIL and ADMIN_PASSWORD_BOOTSTRAP must be set for seeding.",
    );
    process.exit(1);
  }

  // Standard schedule: Sat–Thu 08–17 with lunch 12–13
  await db.schedule.upsert({
    where: { id: STANDARD_SCHEDULE_ID },
    update: {},
    create: {
      id: STANDARD_SCHEDULE_ID,
      label: "Standard 08–17 (lunch 12–13)",
      shiftStart: "08:00",
      lunchStart: "12:00",
      lunchEnd: "13:00",
      shiftEnd: "17:00",
      workDays: JSON.stringify(["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"]),
    },
  });

  // Admin user
  const existing = await db.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
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
    console.log(`Created admin user ${adminEmail}.`);
  } else {
    console.log(`Admin user ${adminEmail} already exists; leaving untouched.`);
  }

  // Placeholder employees — replace via /admin/employees after first login.
  const placeholders = ["Employee 1", "Employee 2", "Employee 3", "Employee 4"];
  for (const name of placeholders) {
    const found = await db.employee.findFirst({ where: { fullName: name } });
    if (found) continue;
    await db.employee.create({
      data: {
        fullName: name,
        position: "Placeholder — update via UI",
        monthlySalary: 0,
        hireDate: new Date(),
        defaultScheduleId: STANDARD_SCHEDULE_ID,
        pinHash: null,
        status: "active",
      },
    });
  }

  console.log("Seed complete.");
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
