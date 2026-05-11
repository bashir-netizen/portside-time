import { PUNCH_TYPES, type DayStatus, type PunchType } from "./types";

/**
 * Determine the next valid punch type given today's punches, in order.
 *
 * Returns null when the day is already finished (after `shift_out`).
 */
export function nextPunchType(todaysPunches: PunchType[]): PunchType | null {
  // Sequence is strict — same order as PUNCH_TYPES.
  for (let i = 0; i < PUNCH_TYPES.length; i++) {
    const t = PUNCH_TYPES[i]!;
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
        | "day_already_finished";
      expected: PunchType | null;
    };

/**
 * Decide whether the requested punch type is the next valid one for the day.
 *
 * Reasons:
 *   - `wrong_next_type`     — requested a later type when an earlier one is still missing
 *   - `duplicate`           — already punched this type today
 *   - `missing_prerequisite` — same as wrong_next_type, kept distinct in case the caller wants to message differently
 *   - `day_already_finished` — `shift_out` was already recorded
 */
export function checkSequence(
  todaysPunches: PunchType[],
  requested: PunchType,
): SequenceCheckResult {
  const expected = nextPunchType(todaysPunches);
  if (expected === null) {
    return {
      ok: false,
      reason: "day_already_finished",
      expected: null,
    };
  }
  if (todaysPunches.includes(requested)) {
    return { ok: false, reason: "duplicate", expected };
  }
  if (requested !== expected) {
    return { ok: false, reason: "wrong_next_type", expected };
  }
  return { ok: true };
}
