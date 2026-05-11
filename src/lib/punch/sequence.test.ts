import { describe, expect, it } from "vitest";
import { checkSequence, dayStatus, nextPunchType } from "./sequence";

describe("nextPunchType", () => {
  it("returns shift_in for an empty day", () => {
    expect(nextPunchType([])).toBe("shift_in");
  });

  it("walks the sequence", () => {
    expect(nextPunchType(["shift_in"])).toBe("lunch_out");
    expect(nextPunchType(["shift_in", "lunch_out"])).toBe("lunch_in");
    expect(nextPunchType(["shift_in", "lunch_out", "lunch_in"])).toBe(
      "shift_out",
    );
  });

  it("returns null when day is finished", () => {
    expect(
      nextPunchType(["shift_in", "lunch_out", "lunch_in", "shift_out"]),
    ).toBeNull();
  });
});

describe("dayStatus", () => {
  it("reports each state in turn", () => {
    expect(dayStatus([])).toBe("not_started");
    expect(dayStatus(["shift_in"])).toBe("working");
    expect(dayStatus(["shift_in", "lunch_out"])).toBe("on_lunch");
    expect(dayStatus(["shift_in", "lunch_out", "lunch_in"])).toBe(
      "back_from_lunch",
    );
    expect(
      dayStatus(["shift_in", "lunch_out", "lunch_in", "shift_out"]),
    ).toBe("finished");
  });
});

describe("checkSequence", () => {
  it("accepts the next valid punch", () => {
    expect(checkSequence([], "shift_in").ok).toBe(true);
    expect(checkSequence(["shift_in"], "lunch_out").ok).toBe(true);
  });

  it("rejects skipping ahead", () => {
    const r = checkSequence([], "lunch_out");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("wrong_next_type");
      expect(r.expected).toBe("shift_in");
    }
  });

  it("rejects a duplicate", () => {
    const r = checkSequence(["shift_in"], "shift_in");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("duplicate");
  });

  it("rejects punches after shift_out", () => {
    const r = checkSequence(
      ["shift_in", "lunch_out", "lunch_in", "shift_out"],
      "shift_in",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("day_already_finished");
  });
});
