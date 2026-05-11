import { describe, expect, it } from "vitest";
import { accruedDaysSinceHire, djiboutiBusinessDays } from "./accrual";

describe("accruedDaysSinceHire", () => {
  it("accrues 2.5 days per completed month", () => {
    const hire = new Date(Date.UTC(2026, 0, 15));
    const now = new Date(Date.UTC(2026, 2, 16)); // 2 months + 1 day completed
    expect(accruedDaysSinceHire(hire, now)).toBe(5);
  });

  it("doesn't credit the partial month", () => {
    const hire = new Date(Date.UTC(2026, 0, 15));
    const now = new Date(Date.UTC(2026, 2, 14));
    // March 14 is before March 15 anniversary, so only 1 month completed
    expect(accruedDaysSinceHire(hire, now)).toBe(2.5);
  });

  it("caps at 30/year", () => {
    const hire = new Date(Date.UTC(2024, 0, 1));
    const now = new Date(Date.UTC(2026, 0, 1));
    // 24 completed months × 2.5 = 60, capped at 30
    expect(accruedDaysSinceHire(hire, now)).toBe(30);
  });

  it("returns 0 before hire", () => {
    const hire = new Date(Date.UTC(2026, 5, 1));
    const now = new Date(Date.UTC(2026, 4, 1));
    expect(accruedDaysSinceHire(hire, now)).toBe(0);
  });
});

describe("djiboutiBusinessDays", () => {
  it("counts a Sat–Thu range as 6 days", () => {
    // 2026-05-09 is a Saturday in Djibouti.
    expect(djiboutiBusinessDays("2026-05-09", "2026-05-14")).toBe(6);
  });

  it("skips Friday", () => {
    // 2026-05-15 is a Friday.
    expect(djiboutiBusinessDays("2026-05-15", "2026-05-15")).toBe(0);
  });

  it("handles a single non-Friday day", () => {
    expect(djiboutiBusinessDays("2026-05-11", "2026-05-11")).toBe(1);
  });
});
