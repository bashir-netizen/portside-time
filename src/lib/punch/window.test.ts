import { describe, expect, it } from "vitest";
import { djiboutiDayWindow } from "./window";

describe("djiboutiDayWindow", () => {
  it("spans exactly 24 hours", () => {
    const w = djiboutiDayWindow(new Date("2026-05-11T10:30:00Z"));
    expect(w.end.getTime() - w.start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("rolls over at 00:00 Africa/Djibouti (21:00 UTC the previous day)", () => {
    // 22:00 UTC on May 11 = 01:00 Djibouti on May 12 (UTC+3)
    const w = djiboutiDayWindow(new Date("2026-05-11T22:00:00Z"));
    expect(w.ymd).toBe("2026-05-12");
    // window start should be 2026-05-12 00:00 Djibouti = 2026-05-11 21:00 UTC
    expect(w.start.toISOString()).toBe("2026-05-11T21:00:00.000Z");
  });

  it("places UTC midnight inside the local day, not at the boundary", () => {
    // 00:00 UTC May 11 = 03:00 Djibouti May 11
    const w = djiboutiDayWindow(new Date("2026-05-11T00:00:00Z"));
    expect(w.ymd).toBe("2026-05-11");
    expect(w.start.toISOString()).toBe("2026-05-10T21:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-05-11T21:00:00.000Z");
  });
});
