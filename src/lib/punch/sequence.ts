import { PUNCH_TYPES, type DayStatus, type PunchType } from "./types";

/**
 * Day-pattern type — mirrors the DayPattern.type column in the schema.
 * Drives which punches are expected in what order, or whether punching is
 * even allowed.
 */
export type DayPatternType =
  | "split_day" // IN → LUNCH_OUT → LUNCH_IN → OUT  (off-site lunch)
  | "continuous_day" // IN → LUNCH_OUT → LUNCH_IN → OUT  (on-site lunch break)
  | "half_day" // IN → OUT  (no lunch)
  | "day_off"; // no punches

/**
 * Expected punch sequence for a given day-pattern type. Used by:
 * - the punch action to validate the requested punch
 * - the /me sequence ribbon to know how many dots to render
 *
 * split_day and continuous_day track all four punches; the only difference
 * is the *meaning* of LUNCH_OUT/LUNCH_IN (off-site vs an on-site break).
 * half_day has just two punches. day_off has none.
 */
export function expectedSequence(type: DayPatternType): PunchType[] {
  switch (type) {
    case "split_day":
    case "continuous_day":
      return ["shift_in", "lunch_out", "lunch_in", "shift_out"];
    case "half_day":
      return ["shift_in", "shift_out"];
    case "day_off":
      return [];
  }
}

/**
 * Next valid punch given today's punches AND today's day-pattern type.
 * Returns null when the sequence is complete (or empty for day_off).
 *
 * The 2-arg overload (no dayPatternType) defaults to split_day for backward
 * compatibility with code paths that haven't been updated yet.
 */
export function nextPunchType(
  todaysPunches: PunchType[],
  dayPatternType: DayPatternType = "split_day",
): PunchType | null {
  const seq = expectedSequence(dayPatternType);
  for (const t of seq) {
    if (!todaysPunches.includes(t)) return t;
  }
  return null;
}

export function dayStatus(todaysPunches: PunchType[]): DayStatus {
  if (todaysPunches.length === 0) return "not_started";
  if (todaysPunches.includes("shift_out")) return "finished";
  if (todaysPunches.includes("lunch_in")) return "back_from_lunch";
  if (todaysPunches.includes("lunch_out")) return "on_lunch";
  return "working";
}

export type SequenceCheckResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "wrong_next_type"
        | "duplicate"
        | "missing_prerequisite"
        | "day_already_finished"
        | "day_off"
        | "not_in_sequence";
      expected: PunchType | null;
    };

/**
 * Decide whether the requested punch is the next valid one for the day.
 *
 * dayPatternType drives the expected sequence. day_off blocks all punches;
 * half_day blocks lunch punches entirely (they're not in the expected
 * sequence).
 */
export function checkSequence(
  todaysPunches: PunchType[],
  requested: PunchType,
  dayPatternType: DayPatternType = "split_day",
): SequenceCheckResult {
  if (dayPatternType === "day_off") {
    return { ok: false, reason: "day_off", expected: null };
  }
  const seq = expectedSequence(dayPatternType);
  // The requested punch must be in the expected sequence at all.
  if (!seq.includes(requested)) {
    return { ok: false, reason: "not_in_sequence", expected: null };
  }
  const expected = nextPunchType(todaysPunches, dayPatternType);
  if (expected === null) {
    return { ok: false, reason: "day_already_finished", expected: null };
  }
  if (todaysPunches.includes(requested)) {
    return { ok: false, reason: "duplicate", expected };
  }
  if (requested !== expected) {
    return { ok: false, reason: "wrong_next_type", expected };
  }
  return { ok: true };
}
