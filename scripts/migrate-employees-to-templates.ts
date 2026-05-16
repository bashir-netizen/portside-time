// One-off: create a "Standard" ScheduleTemplate matching the legacy
// "Standard 08-17" Schedule, then point every employee whose
// defaultScheduleTemplateId is null at it. Idempotent.
import { db } from "../src/lib/db";

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

// Mirror legacy "Standard 08-17": split day 08:00 → 12:00 → 13:00 → 17:00,
// active Sat..Thu, off Fri.
const STANDARD: DP[] = [
  { dayOfWeek: 0, type: "split_day", startTime: "08:00", endTime: "17:00", lunchOutTime: "12:00", lunchInTime: "13:00" }, // Sun
  { dayOfWeek: 1, type: "split_day", startTime: "08:00", endTime: "17:00", lunchOutTime: "12:00", lunchInTime: "13:00" }, // Mon
  { dayOfWeek: 2, type: "split_day", startTime: "08:00", endTime: "17:00", lunchOutTime: "12:00", lunchInTime: "13:00" }, // Tue
  { dayOfWeek: 3, type: "split_day", startTime: "08:00", endTime: "17:00", lunchOutTime: "12:00", lunchInTime: "13:00" }, // Wed
  { dayOfWeek: 4, type: "split_day", startTime: "08:00", endTime: "17:00", lunchOutTime: "12:00", lunchInTime: "13:00" }, // Thu
  { dayOfWeek: 5, type: "day_off" }, // Fri
  { dayOfWeek: 6, type: "split_day", startTime: "08:00", endTime: "17:00", lunchOutTime: "12:00", lunchInTime: "13:00" }, // Sat
];

async function ensureStandardTemplate(): Promise<string> {
  const existing = await db.scheduleTemplate.findUnique({
    where: { name: "Standard 08-17" },
  });
  if (existing) {
    console.log(`  ✓ Standard template already exists: ${existing.id}`);
    return existing.id;
  }
  const created = await db.scheduleTemplate.create({
    data: {
      name: "Standard 08-17",
      description:
        "Default split-day pattern. Sun–Thu + Sat: 08:00–12:00, 13:00–17:00. Fri off. Mirror of the legacy Schedule.",
      hasBusyDayExtension: false,
      dayPatterns: {
        create: STANDARD.map((dp) => ({
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
  console.log(`  + created Standard template: ${created.id}`);
  return created.id;
}

async function main() {
  const standardId = await ensureStandardTemplate();
  const orphans = await db.employee.findMany({
    where: { defaultScheduleTemplateId: null },
    select: { id: true, fullName: true },
  });
  if (orphans.length === 0) {
    console.log(`  ✓ Every employee already has a template assigned`);
  } else {
    for (const e of orphans) {
      await db.employee.update({
        where: { id: e.id },
        data: { defaultScheduleTemplateId: standardId },
      });
      console.log(`  ${e.fullName} → Standard 08-17`);
    }
  }
  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
