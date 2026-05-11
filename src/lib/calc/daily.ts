import type { PunchType } from "../punch/types";

export type DailyPunch = { punchType: PunchType; punchedAt: Date };
export type DailySchedule = {
  shiftStart: string; // "HH:mm"
  lunchStart: string;
  lunchEnd: string;
  shiftEnd: string;
};
export type DailyResult = {
  workedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  hasShiftIn: boolean;
  hasShiftOut: boolean;
  hasLunchPair: boolean;
};

/**
 * Parse "HH:mm" into a Date on the same Africa/Djibouti calendar day as `ref`.
 *
 * `ref` is taken to be the day's start-of-day in UTC (i.e., `parseYmdInDjibouti`).
 * We then add the H+M offset to land on the wall-clock time the schedule expects.
 */
export function scheduledTimeOnDay(ref: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return new Date(ref.getTime() + h * 60 * 60 * 1000 + m * 60 * 1000);
}

function timeOf(p: DailyPunch | undefined): Date | undefined {
  return p?.punchedAt;
}

function diffMinutes(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

/**
 * Compute the calc-engine outputs for one Africa/Djibouti day.
 *
 * - `worked_minutes = (lunch_out − shift_in) + (shift_out − lunch_in)` when
 *   all four are present; partial pairs degrade gracefully so the admin can
 *   still see something useful even with a missing punch (correction tool).
 * - `late_minutes  = max(0, shift_in − scheduled_shift_in)` only when
 *   shift_in exists.
 * - `early_leave_minutes = max(0, scheduled_shift_out − shift_out)` only when
 *   shift_out exists.
 */
export function calcDaily(
  dayStart: Date,
  schedule: DailySchedule,
  punches: DailyPunch[],
): DailyResult {
  const ordered = [...punches].sort(
    (a, b) => a.punchedAt.getTime() - b.punchedAt.getTime(),
  );
  const shiftIn = ordered.find((p) => p.punchType === "shift_in");
  const lunchOut = ordered.find((p) => p.punchType === "lunch_out");
  const lunchIn = ordered.find((p) => p.punchType === "lunch_in");
  const shiftOut = ordered.find((p) => p.punchType === "shift_out");

  let worked = 0;
  const morningEnd = timeOf(lunchOut) ?? timeOf(shiftOut);
  const morningStart = timeOf(shiftIn);
  if (morningStart && morningEnd && morningEnd > morningStart) {
    worked += diffMinutes(morningEnd, morningStart);
  }
  const afternoonStart = timeOf(lunchIn);
  const afternoonEnd = timeOf(shiftOut);
  if (afternoonStart && afternoonEnd && afternoonEnd > afternoonStart) {
    worked += diffMinutes(afternoonEnd, afternoonStart);
  }

  const scheduledShiftIn = scheduledTimeOnDay(dayStart, schedule.shiftStart);
  const scheduledShiftOut = scheduledTimeOnDay(dayStart, schedule.shiftEnd);

  const late = shiftIn
    ? Math.max(0, diffMinutes(shiftIn.punchedAt, scheduledShiftIn))
    : 0;
  const earlyLeave = shiftOut
    ? Math.max(0, diffMinutes(scheduledShiftOut, shiftOut.punchedAt))
    : 0;

  return {
    workedMinutes: Math.max(0, Math.round(worked)),
    lateMinutes: Math.round(late),
    earlyLeaveMinutes: Math.round(earlyLeave),
    hasShiftIn: Boolean(shiftIn),
    hasShiftOut: Boolean(shiftOut),
    hasLunchPair: Boolean(lunchOut && lunchIn),
  };
}
