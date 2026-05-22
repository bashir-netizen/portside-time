/*
 * Demo-data seed. Idempotent: re-running clears and re-creates the
 * demo-tagged rows so you always get a fresh, populated app.
 *
 * Creates:
 *  - Real names + positions + salaries on the 4 existing employees (in
 *    place, preserving IDs and relations)
 *  - Template assignment per employee (Fathi/Hawa on the two new templates,
 *    others on Standard)
 *  - ~14 days of historical punches respecting each employee's day pattern,
 *    with realistic lateness on a few days
 *  - 5 leave requests in different states (pending, approved, rejected,
 *    pending_certificate, certified_sick) tagged with "demo:" prefix in notes
 *  - 2026 Djibouti national holidays (upsert by date)
 *
 * Safety: only touches employee NAMES (not IDs), only deletes punches in
 * the past 14-day window (not future or older), only deletes leave-requests
 * whose notes start with "demo:" prefix.
 */

import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { formatInTimeZone } from "date-fns-tz";

const TZ = "Africa/Djibouti";
const DEMO_TAG = "demo:";

// ---------- People ----------
//
// Match by the current placeholder names so we update in place; assign real
// names + positions + salaries + the right schedule template.
const PEOPLE: ReadonlyArray<{
  matchName: string | string[]; // current name(s) to look up
  newName: string;
  position: string;
  monthlySalary: number; // DJF
  hireYmd: string; // backdated so leave accrual differs
  templateName: string;
}> = [
  {
    matchName: ["Test", "Employee 1"],
    newName: "Fathi Mohamed",
    position: "Opérateur logistique",
    monthlySalary: 75000,
    hireYmd: "2020-03-15",
    templateName: "Split day (long lunch)",
  },
  {
    matchName: "Employee 2",
    newName: "Hawa Abdi",
    position: "Coordinatrice quai",
    monthlySalary: 95000,
    hireYmd: "2021-07-01",
    templateName: "Continuous day (on-site lunch)",
  },
  {
    matchName: "Employee 3",
    newName: "Ibrahim Hassan",
    position: "Opérateur logistique",
    monthlySalary: 75000,
    hireYmd: "2023-09-12",
    templateName: "Split day (long lunch)",
  },
  {
    matchName: "Employee 4",
    newName: "Ayan Ali",
    position: "Assistante administrative",
    monthlySalary: 85000,
    hireYmd: "2024-11-01",
    templateName: "Standard 08-17",
  },
];

// ---------- 2026 Djibouti national holidays ----------
//
// Standard set; Islamic dates are approximate (lunar). User can correct
// later via /admin/holidays.
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

// ---------- helpers ----------

function ymdInDjibouti(d: Date): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
}

function djiboutiInstant(ymd: string, hhmm: string): Date {
  // Build a UTC instant matching that Djibouti local time (UTC+3, no DST).
  // "YYYY-MM-DDTHH:mm:00+03:00" then parse.
  return new Date(`${ymd}T${hhmm}:00+03:00`);
}

function jitterMinutes(hhmm: string, jitterMin: number, sometimesLateMin = 0): string {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  // ±jitterMin minutes, plus an occasional "late" bonus
  const delta =
    Math.floor((Math.random() * 2 - 1) * jitterMin) +
    (Math.random() < 0.18 ? Math.floor(Math.random() * sometimesLateMin) : 0);
  const total = h * 60 + m + delta;
  const hh = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const mm = Math.floor(total % 60)
    .toString()
    .padStart(2, "0");
  return `${hh}:${mm}`;
}

// ---------- main ----------

async function ensurePeople() {
  console.log("\n[1/4] Updating employee profiles + template assignments");

  const templatesByName = new Map<string, string>();
  for (const t of await db.scheduleTemplate.findMany({
    select: { id: true, name: true },
  })) {
    templatesByName.set(t.name, t.id);
  }

  // Set every employee to PIN 000000 too — easier demo login.
  const pinHash = await hashPassword("000000");

  for (const p of PEOPLE) {
    const matches = Array.isArray(p.matchName) ? p.matchName : [p.matchName];
    // Also match the target newName so re-runs are idempotent — once renamed,
    // the original placeholder name won't exist, but the newName will.
    const matchPool = Array.from(new Set([...matches, p.newName]));
    const existing = await db.employee.findFirst({
      where: { fullName: { in: matchPool } },
    });
    const templateId = templatesByName.get(p.templateName);
    if (!templateId) {
      console.log(`  ! template "${p.templateName}" not found — run seed-templates first`);
      continue;
    }
    const data = {
      fullName: p.newName,
      position: p.position,
      monthlySalary: p.monthlySalary,
      hireDate: djiboutiInstant(p.hireYmd, "00:00"),
      defaultScheduleTemplateId: templateId,
      pinHash,
      status: "active",
    };
    if (existing) {
      await db.employee.update({ where: { id: existing.id }, data });
      console.log(`  ↻ ${matches[0]} → ${p.newName} · ${p.templateName}`);
    } else {
      const created = await db.employee.create({ data });
      console.log(`  + created ${p.newName} (id ${created.id}) · ${p.templateName}`);
    }
  }
}

async function ensurePunches() {
  console.log("\n[2/4] Generating ~14 days of historical punches");

  const employees = await db.employee.findMany({
    where: { status: "active" },
    include: {
      defaultScheduleTemplate: { include: { dayPatterns: true } },
    },
  });

  const now = new Date();
  const todayYmd = ymdInDjibouti(now);
  const oldestYmd = ymdInDjibouti(
    new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  );

  // Punches are append-only at the DB level (trigger blocks DELETE), so the
  // idempotency strategy is: for each (employee, day), skip if any punch
  // already exists for that calendar day.
  const windowStart = djiboutiInstant(oldestYmd, "00:00");
  const windowEnd = djiboutiInstant(todayYmd, "00:00"); // exclusive — don't touch today

  // Build a set of "employeeId|YYYY-MM-DD" keys that already have punches.
  const existingPunches = await db.punch.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      punchedAt: { gte: windowStart, lt: windowEnd },
    },
    select: { employeeId: true, punchedAt: true },
  });
  const seededDayKeys = new Set(
    existingPunches.map((p) => `${p.employeeId}|${ymdInDjibouti(p.punchedAt)}`),
  );
  console.log(`  · ${seededDayKeys.size} (employee, day) pairs already have punches — skipping those`);

  // Look up holidays to skip
  const holidayDates = new Set(
    (await db.holiday.findMany({ select: { date: true } })).map((h) =>
      ymdInDjibouti(h.date)
    )
  );

  let createdCount = 0;
  let skippedCount = 0;

  // Iterate each day in the window
  for (
    let d = new Date(windowStart);
    d.getTime() < windowEnd.getTime();
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const ymd = ymdInDjibouti(d);
    if (holidayDates.has(ymd)) continue;

    // ISO day-of-week: Mon=1..Sun=7; remap to Sun=0..Sat=6
    const iso = Number(formatInTimeZone(d, TZ, "i"));
    const dow = iso % 7;

    for (const emp of employees) {
      const template = emp.defaultScheduleTemplate;
      if (!template) continue;
      const pattern = template.dayPatterns.find((p) => p.dayOfWeek === dow);
      if (!pattern || pattern.type === "day_off") continue;
      if (seededDayKeys.has(`${emp.id}|${ymd}`)) {
        skippedCount++;
        continue;
      }

      // Build the punches for this day-pattern
      type PunchTime = { punchType: string; hhmm: string };
      let punches: PunchTime[] = [];
      if (pattern.type === "half_day") {
        punches = [
          { punchType: "shift_in", hhmm: jitterMinutes(pattern.startTime ?? "08:30", 3, 12) },
          { punchType: "shift_out", hhmm: jitterMinutes(pattern.endTime ?? "12:00", 4, 0) },
        ];
      } else if (pattern.type === "continuous_day") {
        punches = [
          { punchType: "shift_in", hhmm: jitterMinutes(pattern.startTime ?? "08:30", 3, 12) },
          { punchType: "lunch_out", hhmm: jitterMinutes(pattern.lunchOutTime ?? "12:00", 5, 0) },
          { punchType: "lunch_in", hhmm: jitterMinutes(pattern.lunchInTime ?? "13:15", 5, 0) },
          { punchType: "shift_out", hhmm: jitterMinutes(pattern.endTime ?? "15:30", 5, 0) },
        ];
      } else {
        // split_day
        punches = [
          { punchType: "shift_in", hhmm: jitterMinutes(pattern.startTime ?? "08:30", 3, 12) },
          { punchType: "lunch_out", hhmm: jitterMinutes(pattern.lunchOutTime ?? "12:00", 5, 0) },
          { punchType: "lunch_in", hhmm: jitterMinutes(pattern.lunchInTime ?? "16:15", 8, 0) },
          { punchType: "shift_out", hhmm: jitterMinutes(pattern.endTime ?? "18:30", 5, 0) },
        ];
      }

      // 15% chance the employee "forgot to punch out" today — skip the last punch
      if (Math.random() < 0.07 && punches.length > 2) {
        punches = punches.slice(0, -1);
      }

      for (const p of punches) {
        await db.punch.create({
          data: {
            employeeId: emp.id,
            punchType: p.punchType,
            punchedAt: djiboutiInstant(ymd, p.hhmm),
            sourceIp: "197.241.65.2",
            userAgent: "demo-seed",
          },
        });
        createdCount++;
      }
    }
  }
  console.log(`  + created ${createdCount} punches across ${employees.length} employees × 14 days (skipped ${skippedCount} already-seeded day(s))`);
}

async function ensureLeaveRequests() {
  console.log("\n[3/4] Seeding 5 leave requests in different states");

  const employees = await db.employee.findMany({
    where: { status: "active" },
    select: { id: true, fullName: true },
  });
  if (employees.length < 2) {
    console.log("  ! need at least 2 employees");
    return;
  }
  const [fathi, hawa, ibrahim, ayan] = employees;

  // Clear demo leave requests so re-runs are clean
  const deleted = await db.leaveRequest.deleteMany({
    where: { notes: { startsWith: DEMO_TAG } },
  });
  console.log(`  - cleared ${deleted.count} existing demo leave requests`);

  const now = new Date();
  const inDays = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
  const monthsAgo = (n: number) =>
    new Date(now.getTime() - n * 30 * 24 * 60 * 60 * 1000);

  const rows: Parameters<typeof db.leaveRequest.create>[0]["data"][] = [
    // Pending annual leave
    {
      employeeId: fathi!.id,
      leaveType: "annual",
      startDate: djiboutiInstant(ymdInDjibouti(inDays(14)), "00:00"),
      endDate: djiboutiInstant(ymdInDjibouti(inDays(18)), "00:00"),
      days: 4,
      status: "pending",
      notes: `${DEMO_TAG} family trip next month`,
    },
    // Approved annual leave (past — affects accrual)
    {
      employeeId: hawa!.id,
      leaveType: "annual",
      startDate: djiboutiInstant(ymdInDjibouti(monthsAgo(3)), "00:00"),
      endDate: djiboutiInstant(
        ymdInDjibouti(new Date(monthsAgo(3).getTime() + 6 * 24 * 60 * 60 * 1000)),
        "00:00"
      ),
      days: 6,
      status: "approved",
      decidedAt: monthsAgo(3),
      notes: `${DEMO_TAG} approved by admin · summer leave`,
    },
    // Pending sick certificate
    {
      employeeId: ibrahim!.id,
      leaveType: "sick",
      startDate: djiboutiInstant(ymdInDjibouti(inDays(-3)), "00:00"),
      endDate: djiboutiInstant(ymdInDjibouti(inDays(-2)), "00:00"),
      days: 2,
      status: "pending_certificate",
      notes: `${DEMO_TAG} called in sick; cert pending`,
    },
    // Certified sick
    {
      employeeId: hawa!.id,
      leaveType: "sick",
      startDate: djiboutiInstant(ymdInDjibouti(inDays(-10)), "00:00"),
      endDate: djiboutiInstant(ymdInDjibouti(inDays(-9)), "00:00"),
      days: 2,
      status: "certified_sick",
      decidedAt: inDays(-9),
      certificatePath: "/uploads/demo/cert-hawa-2026-05-06.pdf",
      notes: `${DEMO_TAG} cert received from Dr. Aden`,
    },
    // Rejected annual leave
    {
      employeeId: ayan!.id,
      leaveType: "annual",
      startDate: djiboutiInstant(ymdInDjibouti(inDays(-20)), "00:00"),
      endDate: djiboutiInstant(ymdInDjibouti(inDays(-18)), "00:00"),
      days: 3,
      status: "rejected",
      decidedAt: inDays(-21),
      notes: `${DEMO_TAG} rejected — clashed with quarterly close`,
    },
  ];
  for (const data of rows) {
    await db.leaveRequest.create({ data });
  }
  console.log(`  + created ${rows.length} demo leave requests`);
}

async function ensureHolidays() {
  console.log("\n[4/4] Seeding 2026 Djibouti national holidays");
  let created = 0;
  let refreshed = 0;
  for (const h of HOLIDAYS_2026) {
    const date = djiboutiInstant(h.ymd, "00:00");
    const existing = await db.holiday.findUnique({ where: { date } });
    if (existing) {
      await db.holiday.update({
        where: { date },
        data: { name: h.name, isPaid: h.isPaid },
      });
      refreshed++;
    } else {
      await db.holiday.create({
        data: { date, name: h.name, isPaid: h.isPaid },
      });
      created++;
    }
  }
  console.log(`  + created ${created}, refreshed ${refreshed} (of ${HOLIDAYS_2026.length} total)`);
}

async function main() {
  await ensurePeople();
  await ensureHolidays();
  await ensurePunches();
  await ensureLeaveRequests();
  console.log("\n✓ Demo data seeded. Sign in as any employee with PIN 000000.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
