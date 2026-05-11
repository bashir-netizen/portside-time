import { describe, expect, it } from "vitest";
import { calcMonthly } from "./monthly";

describe("calcMonthly", () => {
  // Sanity numbers from CLAUDE.md §12 with salary 100,000 DJF.
  const base = {
    monthlySalary: 100000,
    totalLateMinutes: 0,
    unauthAbsenceDays: 0,
    overtimeHours: 0,
  };

  it("computes per-minute and per-day rates correctly", () => {
    const r = calcMonthly(base);
    // 100000 / 208 / 60 ≈ 8.0128…
    expect(r.perMinuteRate).toBeCloseTo(8.013, 2);
    // 100000 / 26 ≈ 3846.15
    expect(r.perDayRate).toBeCloseTo(3846.15, 1);
  });

  it("rounds late deduction to whole DJF", () => {
    const r = calcMonthly({ ...base, totalLateMinutes: 30 });
    // 30 × 8.0128 ≈ 240.38 → 240
    expect(r.lateDeductionDjf).toBe(240);
  });

  it("rounds absence deduction to whole DJF", () => {
    const r = calcMonthly({ ...base, unauthAbsenceDays: 2 });
    // 2 × 3846.15 = 7692.3 → 7692
    expect(r.absenceDeductionDjf).toBe(7692);
  });

  it("applies 25% overtime premium", () => {
    const r = calcMonthly({ ...base, overtimeHours: 4 });
    // hourlyRate = 480.77, × 4 × 1.25 = 2403.85 → 2404
    expect(r.overtimeAmountDjf).toBe(2404);
  });

  it("stacks night overtime at 75%", () => {
    const r = calcMonthly({
      ...base,
      overtimeHours: 0,
      nightOvertimeHours: 2,
    });
    // 2 × 480.77 × 1.75 = 1682.69 → 1683
    expect(r.overtimeAmountDjf).toBe(1683);
  });
});
