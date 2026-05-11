import { describe, expect, it } from "vitest";
import { buildCookieValue, newDeviceId, parseCookieValue } from "./cookie";

describe("device cookie HMAC", () => {
  it("round-trips a valid value", () => {
    const id = newDeviceId();
    const value = buildCookieValue(id);
    expect(parseCookieValue(value)).toEqual({ deviceId: id });
  });

  it("rejects tampered values", () => {
    const id = newDeviceId();
    const value = buildCookieValue(id);
    const tampered = value.slice(0, -2) + "00";
    expect(parseCookieValue(tampered)).toBeNull();
  });

  it("rejects malformed values", () => {
    expect(parseCookieValue(undefined)).toBeNull();
    expect(parseCookieValue("")).toBeNull();
    expect(parseCookieValue("not-a-cookie")).toBeNull();
    expect(parseCookieValue(".sigOnly")).toBeNull();
  });
});
