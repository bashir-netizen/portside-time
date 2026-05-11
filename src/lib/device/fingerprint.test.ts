import { describe, expect, it } from "vitest";
import { hashVisitorId } from "./fingerprint";

describe("hashVisitorId", () => {
  it("is deterministic for the same input", () => {
    expect(hashVisitorId("abc123")).toBe(hashVisitorId("abc123"));
  });

  it("differs across visitor ids", () => {
    expect(hashVisitorId("a")).not.toBe(hashVisitorId("b"));
  });

  it("doesn't return the raw input", () => {
    expect(hashVisitorId("abc123")).not.toContain("abc123");
  });
});
