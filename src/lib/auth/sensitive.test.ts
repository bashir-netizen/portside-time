import { describe, expect, it } from "vitest";
import { checkRecentSensitive } from "./sensitive";
import type { ActiveSession } from "./session";

function session(lastSensitive: Date | null): ActiveSession {
  return {
    id: "s1",
    role: "admin",
    userId: "u1",
    employeeId: null,
    deviceId: null,
    sourceIp: null,
    expiresAt: new Date(Date.now() + 60_000),
    lastSensitiveActionAt: lastSensitive,
  };
}

describe("checkRecentSensitive", () => {
  it("passes within the 15-minute window", () => {
    const r = checkRecentSensitive(session(new Date()));
    expect(r.ok).toBe(true);
  });

  it("fails when stale", () => {
    const r = checkRecentSensitive(
      session(new Date(Date.now() - 16 * 60 * 1000)),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("stale_sensitive");
  });

  it("fails when never sensitive", () => {
    const r = checkRecentSensitive(session(null));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("stale_sensitive");
  });

  it("fails when no session", () => {
    const r = checkRecentSensitive(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no_session");
  });
});
