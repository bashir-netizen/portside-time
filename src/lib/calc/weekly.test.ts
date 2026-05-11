import { describe, expect, it } from "vitest";
import { calcWeekly } from "./weekly";
import type { DailyResult } from "./daily";

function d(workedMinutes: number, lateMinutes = 0): DailyResult {
  return {
    workedMinutes,
    lateMinutes,
    earlyLeaveMinutes: 0,
    hasShiftIn: true,
    hasShiftOut: true,
    hasLunchPair: true,
  };
}

describe("calcWeekly", () => {
  it("sums normal 8-hour days into 48 weekly hours, no flags", () => {
    const r = calcWeekly(Array(6).fill(d(480)));
    expect(r.workedHours).toBe(48);
    expect(r.overtimeHours).toBe(0);
    expect(r.flags).toEqual([]);
  });

  it("flags overtime above 48", () => {
    const r = calcWeekly([d(540), d(540), d(540), d(540), d(540), d(540)]);
    expect(r.workedHours).toBe(54);
    expect(r.overtimeHours).toBe(6);
    expect(r.flags.some((f) => f.kind === "overtime")).toBe(true);
    expect(
      r.flags.some((f) => f.kind === "overtime_ceiling_exceeded"),
    ).toBe(true);
  });

  it("flags illegal weekly above 60", () => {
    const r = calcWeekly([
      d(660), d(660), d(660), d(660), d(660), d(660),
    ]);
    expect(r.flags.some((f) => f.kind === "illegal_weekly")).toBe(true);
  });

  it("flags illegal daily above 12h", () => {
    const r = calcWeekly([d(60 * 13), d(0), d(0), d(0), d(0), d(0)]);
    expect(r.flags.some((f) => f.kind === "illegal_daily")).toBe(true);
  });

  it("sums late minutes across the week", () => {
    const r = calcWeekly([d(480, 5), d(480, 10), d(480), d(480), d(480), d(480)]);
    expect(r.lateMinutes).toBe(15);
  });
});
