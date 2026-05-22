import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import type { DayPatternType } from "./sequence";

const TZ = "Africa/Djibouti";

export type DayPatternResolved = {
  type: DayPatternType;
  startTime: string | null;
  endTime: string | null;
  lunchOutTime: string | null;
  lunchInTime: string | null;
  lunchBreakMinutes: number | null;
  lunchOnSite: boolean;
  templateName: string | null;
};

/**
 * Resolve the day-pattern for a given employee on a given Djibouti calendar
 * date. Falls back to `split_day` (the legacy default) if the employee has
 * no ScheduleTemplate yet — so existing code paths keep working during the
 * transition.
 */
export async function getDayPatternForEmployee(
  employeeId: string,
  date: Date = new Date(),
): Promise<DayPatternResolved> {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: {
      defaultScheduleTemplate: {
        include: { dayPatterns: true },
      },
    },
  });
  if (!employee?.defaultScheduleTemplate) {
    return fallback(null);
  }
  // ISO day-of-week in Djibouti TZ: 1=Mon .. 7=Sun.
  // Schema uses 0=Sun .. 6=Sat, so remap: iso % 7 gives 1..6 for Mon..Sat and
  // 0 for Sun. Perfect.
  const iso = Number(formatInTimeZone(date, TZ, "i"));
  const dowSunStart = iso % 7;
  const pattern = employee.defaultScheduleTemplate.dayPatterns.find(
    (p) => p.dayOfWeek === dowSunStart,
  );
  if (!pattern) return fallback(employee.defaultScheduleTemplate.name);

  return {
    type: pattern.type as DayPatternType,
    startTime: pattern.startTime,
    endTime: pattern.endTime,
    lunchOutTime: pattern.lunchOutTime,
    lunchInTime: pattern.lunchInTime,
    lunchBreakMinutes: pattern.lunchBreakMinutes,
    lunchOnSite: pattern.lunchOnSite,
    templateName: employee.defaultScheduleTemplate.name,
  };
}

function fallback(templateName: string | null): DayPatternResolved {
  return {
    type: "split_day",
    startTime: "08:00",
    endTime: "17:00",
    lunchOutTime: "12:00",
    lunchInTime: "13:00",
    lunchBreakMinutes: null,
    lunchOnSite: false,
    templateName,
  };
}
