// One-off: seed the two production day-pattern templates per spec §5.3.
// Naming is intentionally generic (split-day vs continuous-day) — Fathi and
// Hawa are real employees and their names don't belong on schedules.
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

// Template A — "Split day (long lunch)"
// Sun–Thu split with off-site midday break; Fri off; Sat half-day.
// On busy days, employee stays on-site for lunch — per diem owed.
const SPLIT_DAY_LONG_LUNCH: DP[] = [
  { dayOfWeek: 0, type: "split_day", startTime: "08:30", endTime: "18:30", lunchOutTime: "12:00", lunchInTime: "16:15" }, // Sun
  { dayOfWeek: 1, type: "split_day", startTime: "08:30", endTime: "18:30", lunchOutTime: "12:00", lunchInTime: "16:15" }, // Mon
  { dayOfWeek: 2, type: "split_day", startTime: "08:30", endTime: "18:30", lunchOutTime: "12:00", lunchInTime: "16:15" }, // Tue
  { dayOfWeek: 3, type: "split_day", startTime: "08:30", endTime: "18:30", lunchOutTime: "12:00", lunchInTime: "16:15" }, // Wed
  { dayOfWeek: 4, type: "split_day", startTime: "08:30", endTime: "18:30", lunchOutTime: "12:00", lunchInTime: "16:15" }, // Thu
  { dayOfWeek: 5, type: "day_off" }, // Fri
  { dayOfWeek: 6, type: "half_day", startTime: "08:30", endTime: "12:00" }, // Sat
];

// Template B — "Continuous day (on-site lunch)"
// Sun–Wed continuous with 75-min on-site lunch; Thu half-day; Fri off;
// Sat split-day. Busy days extend end to 18:30 — per diem owed.
const CONTINUOUS_DAY: DP[] = [
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
    "Split day (long lunch)",
    "Sun–Thu 08:30 → 12:00, then 16:15 → 18:30 (off-site lunch). Fri off. Sat half-day 08:30–12:00. ~32h15/week. On busy days, employees stay on-site for lunch — per diem owed.",
    true,
    "18:30",
    SPLIT_DAY_LONG_LUNCH,
  );
  await upsertTemplate(
    "Continuous day (on-site lunch)",
    "Sun–Wed 08:30 → 15:30 with 75-min on-site lunch. Thu half-day 08:30–12:00. Fri off. Sat split-day. ~32h15/week. Busy days extend end to 18:30 — per diem owed.",
    true,
    "18:30",
    CONTINUOUS_DAY,
  );
  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
