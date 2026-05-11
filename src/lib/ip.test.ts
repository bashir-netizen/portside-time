import { describe, expect, it } from "vitest";
import { isValidIp, resolveClientIp } from "./ip";

function headers(map: Record<string, string>) {
  return {
    get: (n: string) => map[n.toLowerCase()] ?? null,
  };
}

describe("resolveClientIp", () => {
  it("prefers x-portside-client-ip when forwarded headers aren't trusted", () => {
    expect(
      resolveClientIp(headers({ "x-portside-client-ip": "10.0.0.7" })),
    ).toBe("10.0.0.7");
  });

  it("returns null when nothing's set", () => {
    expect(resolveClientIp(headers({}))).toBeNull();
  });
});

describe("isValidIp", () => {
  it("accepts valid IPv4", () => {
    expect(isValidIp("196.207.10.4")).toBe(true);
    expect(isValidIp("10.0.0.1")).toBe(true);
  });

  it("rejects out-of-range IPv4", () => {
    expect(isValidIp("256.0.0.1")).toBe(false);
    expect(isValidIp("not.an.ip.at.all")).toBe(false);
  });

  it("accepts basic IPv6", () => {
    expect(isValidIp("2001:db8::1")).toBe(true);
  });
});
