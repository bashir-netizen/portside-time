export const PUNCH_TYPES = [
  "shift_in",
  "lunch_out",
  "lunch_in",
  "shift_out",
] as const;

export type PunchType = (typeof PUNCH_TYPES)[number];

export const PUNCH_LABELS: Record<PunchType, string> = {
  shift_in: "Punch In",
  lunch_out: "Lunch Out",
  lunch_in: "Lunch In",
  shift_out: "Punch Out",
};

export type DayStatus =
  | "not_started" // no punches today
  | "working" // punched in, not on lunch
  | "on_lunch" // lunch_out without lunch_in
  | "back_from_lunch" // lunch_in without shift_out
  | "finished"; // shift_out today

export function isPunchType(value: string): value is PunchType {
  return (PUNCH_TYPES as readonly string[]).includes(value);
}
