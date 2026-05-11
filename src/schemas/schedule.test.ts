import { describe, expect, it } from "vitest";
import { ScheduleSchema } from "./schedule";

const VALID = {
  label: "Standard",
  shiftStart: "08:00",
  lunchStart: "12:00",
  lunchEnd: "13:00",
  shiftEnd: "17:00",
  workDays: ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"],
};

describe("ScheduleSchema", () => {
  it("accepts a sane schedule", () => {
    expect(ScheduleSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects unordered times (lunch after shift end)", () => {
    const r = ScheduleSchema.safeParse({
      ...VALID,
      lunchStart: "18:00",
      lunchEnd: "19:00",
    });
    expect(r.success).toBe(false);
  });

  it("rejects no work days", () => {
    expect(
      ScheduleSchema.safeParse({ ...VALID, workDays: [] }).success,
    ).toBe(false);
  });

  it("rejects malformed times", () => {
    expect(
      ScheduleSchema.safeParse({ ...VALID, shiftStart: "8:00" }).success,
    ).toBe(false);
    expect(
      ScheduleSchema.safeParse({ ...VALID, shiftEnd: "25:00" }).success,
    ).toBe(false);
  });
});
