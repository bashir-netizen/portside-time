import {
  DAILY_HARD_ILLEGAL_HOURS,
  WEEKLY_HARD_ILLEGAL,
  WEEKLY_HOURS_NORMAL,
  WEEKLY_OVERTIME_CEILING,
} from "./constants";
import type { DailyResult } from "./daily";

export type WeeklyResult = {
  workedHours: number;
  lateMinutes: number;
  overtimeHours: number;
  flags: WeeklyFlag[];
};

export type WeeklyFlag =
  | { kind: "overtime" }
  | { kind: "overtime_ceiling_exceeded" }
  | { kind: "illegal_weekly" }
  | { kind: "illegal_daily"; dayIndex: number };

/**
 * Combine 6 daily results (Sat–Thu) into the weekly numbers + flags
 * defined in CLAUDE.md §12.
 */
export function calcWeekly(days: DailyResult[]): WeeklyResult {
  const flags: WeeklyFlag[] = [];

  let workedMinutes = 0;
  let lateMinutes = 0;
  days.forEach((d, idx) => {
    workedMinutes += d.workedMinutes;
    lateMinutes += d.lateMinutes;
    if (d.workedMinutes / 60 > DAILY_HARD_ILLEGAL_HOURS) {
      flags.push({ kind: "illegal_daily", dayIndex: idx });
    }
  });
  const workedHours = workedMinutes / 60;
  const overtimeHours = Math.max(0, workedHours - WEEKLY_HOURS_NORMAL);
  if (workedHours > WEEKLY_HOURS_NORMAL) flags.push({ kind: "overtime" });
  if (workedHours > WEEKLY_OVERTIME_CEILING)
    flags.push({ kind: "overtime_ceiling_exceeded" });
  if (workedHours > WEEKLY_HARD_ILLEGAL) flags.push({ kind: "illegal_weekly" });

  return { workedHours, lateMinutes, overtimeHours, flags };
}
