// One-off: seed the Fathi + Hawa schedule templates per spec §5.3.
// Idempotent — safe to re-run.
import { db } from "../src/lib/db";

type DP = {
  dayOfWeek: number; // 0=Sun .. 6=Sat
  type: "split_day" | "continuous_day" | "half_day" | "day_off";
  startTime?: string;
  endTime?: string;
  lunchOutTime?: string;
  lunchInTime?: string;
  lunchBreakMinutes?: number;
  lunchOnSite?: boolean;
};

// Pattern A — "Fathi pattern" (split-day, lunch off-site)
// Sun..Thu split day, Fri off, Sat half day
const FATHI: DP[] = [
  { dayOfWeek: 0, type: "split_day", startTime: "08:30", endTime: "18:30", lunchOutTime: "12:00", lunchInTime: "16:15" }, // Sun
  { dayOfWeek: 1, type: "split_day", startTime: "08:30", endTime: "18:30", lunchOutTime: "12:00", lunchInTime: "16:15" }, // Mon
  { dayOfWeek: 2, type: "split_day", startTime: "08:30", endTime: "18:30", lunchOutTime: "12:00", lunchInTime: "16:15" }, // Tue
  { dayOfWeek: 3, type: "split_day", startTime: "08:30", endTime: "18:30", lunchOutTime: "12:00", lunchInTime: "16:15" }, // Wed
  { dayOfWeek: 4, type: "split_day", startTime: "08:30", endTime: "18:30", lunchOutTime: "12:00", lunchInTime: "16:15" }, // Thu
  { dayOfWeek: 5, type: "day_off" }, // Fri
  { dayOfWeek: 6, type: "half_day", startTime: "08:30", endTime: "12:00" }, // Sat
];

// Pattern B — "Hawa pattern" (continuous-day with on-site lunch, busy-day extension)
// Sun..Wed continuous day (lunch on site, 75 min), Thu half day, Fri off, Sat split day
const HAWA: DP[] = [
  { dayOfWeek: 0, type: "continuous_day", startTime: "08:30", endTime: "15:30", lunchBreakMinutes: 75, lunchOnSite: true }, // Sun
  { dayOfWeek: 1, type: "continuous_day", startTime: "08:30", endTime: "15:30", lunchBreakMinutes: 75, lunchOnSite: true }, // Mon
  { dayOfWeek: 2, type: "continuous_day", startTime: "08:30", endTime: "15:30", lunchBreakMinutes: 75, lunchOnSite: true }, // Tue
  { dayOfWeek: 3, type: "continuous_day", startTime: "08:30", endTime: "15:30", lunchBreakMinutes: 75, lunchOnSite: true }, // Wed
  { dayOfWeek: 4, type: "half_day", startTime: "08:30", endTime: "12:00" }, // Thu
  { dayOfWeek: 5, type: "day_off" }, // Fri
  { dayOfWeek: 6, type: "split_day", startTime: "08:30", endTime: "18:30", lunchOutTime: "12:00", lunchInTime: "16:15" }, // Sat
];

async function upsertTemplate(
  name: string,
  description: string,
  hasBusyDayExtension: boolean,
  busyDayEndTime: string | null,
  dayPatterns: DP[],
) {
  const existing = await db.scheduleTemplate.findUnique({ where: { name } });
  if (existing) {
    // Refresh: delete + recreate the day patterns (cascade deletes them)
    await db.dayPattern.deleteMany({ where: { scheduleTemplateId: existing.id } });
    await db.scheduleTemplate.update({
      where: { id: existing.id },
      data: { description, hasBusyDayExtension, busyDayEndTime },
    });
    for (const dp of dayPatterns) {
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
    console.log(`  ↻ refreshed: ${name} (${dayPatterns.length} day patterns)`);
    return;
  }
  await db.scheduleTemplate.create({
    data: {
      name,
      description,
      hasBusyDayExtension,
      busyDayEndTime,
      dayPatterns: {
        create: dayPatterns.map((dp) => ({
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
  console.log(`  + created: ${name} (${dayPatterns.length} day patterns)`);
}

async function main() {
  await upsertTemplate(
    "Fathi pattern",
    "Split day with off-site lunch. Sun–Thu shift, Fri off, Sat half day. ~32h15/week.",
    false,
    null,
    FATHI,
  );
  await upsertTemplate(
    "Hawa pattern",
    "Continuous day with on-site lunch. Sun–Wed continuous, Thu half day, Fri off, Sat split day. Busy days extend to 18h30. ~32h15/week.",
    true,
    "18:30",
    HAWA,
  );
  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
