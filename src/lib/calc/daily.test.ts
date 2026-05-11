import { describe, expect, it } from "vitest";
import { calcDaily } from "./daily";
import { parseYmdInDjibouti } from "../time";

const SCHEDULE = {
  shiftStart: "08:00",
  lunchStart: "12:00",
  lunchEnd: "13:00",
  shiftEnd: "17:00",
};

const DAY = parseYmdInDjibouti("2026-05-11");
const t = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return new Date(DAY.getTime() + h * 60 * 60 * 1000 + m * 60 * 1000);
};

describe("calcDaily", () => {
  it("works for a perfect day (8 hours)", () => {
    const r = calcDaily(DAY, SCHEDULE, [
      { punchType: "shift_in", punchedAt: t("08:00") },
      { punchType: "lunch_out", punchedAt: t("12:00") },
      { punchType: "lunch_in", punchedAt: t("13:00") },
      { punchType: "shift_out", punchedAt: t("17:00") },
    ]);
    expect(r.workedMinutes).toBe(480);
    expect(r.lateMinutes).toBe(0);
    expect(r.earlyLeaveMinutes).toBe(0);
  });

  it("computes late minutes when shift_in is past schedule", () => {
    const r = calcDaily(DAY, SCHEDULE, [
      { punchType: "shift_in", punchedAt: t("08:14") },
      { punchType: "lunch_out", punchedAt: t("12:00") },
      { punchType: "lunch_in", punchedAt: t("13:00") },
      { punchType: "shift_out", punchedAt: t("17:00") },
    ]);
    expect(r.lateMinutes).toBe(14);
    expect(r.workedMinutes).toBe(466);
  });

  it("computes early leave when shift_out is before schedule", () => {
    const r = calcDaily(DAY, SCHEDULE, [
      { punchType: "shift_in", punchedAt: t("08:00") },
      { punchType: "lunch_out", punchedAt: t("12:00") },
      { punchType: "lunch_in", punchedAt: t("13:00") },
      { punchType: "shift_out", punchedAt: t("16:30") },
    ]);
    expect(r.earlyLeaveMinutes).toBe(30);
    expect(r.workedMinutes).toBe(450);
  });

  it("doesn't go negative when on time / early", () => {
    const r = calcDaily(DAY, SCHEDULE, [
      { punchType: "shift_in", punchedAt: t("07:45") },
      { punchType: "lunch_out", punchedAt: t("12:00") },
      { punchType: "lunch_in", punchedAt: t("13:00") },
      { punchType: "shift_out", punchedAt: t("17:15") },
    ]);
    expect(r.lateMinutes).toBe(0);
    expect(r.earlyLeaveMinutes).toBe(0);
  });

  it("degrades gracefully with a missing lunch_in", () => {
    const r = calcDaily(DAY, SCHEDULE, [
      { punchType: "shift_in", punchedAt: t("08:00") },
      { punchType: "lunch_out", punchedAt: t("12:00") },
      { punchType: "shift_out", punchedAt: t("17:00") },
    ]);
    // Morning counts; afternoon segment can't be computed without lunch_in.
    expect(r.workedMinutes).toBe(240);
    expect(r.hasLunchPair).toBe(false);
  });
});
