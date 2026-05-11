import { describe, expect, it } from "vitest";
import {
  generateRandomPassword,
  generateRandomPin,
  hashPassword,
  verifyPassword,
} from "./password";

describe("password / PIN hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("hunter2!");
    expect(await verifyPassword(hash, "hunter2!")).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("hunter2!");
    expect(await verifyPassword(hash, "hunter3!")).toBe(false);
  });

  it("returns false on a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("not-a-real-hash", "anything")).toBe(false);
  });
});

describe("random helpers", () => {
  it("generates a 6-digit PIN by default", () => {
    const pin = generateRandomPin();
    expect(pin).toMatch(/^\d{6}$/);
  });

  it("generates a 4-digit PIN when asked", () => {
    expect(generateRandomPin(4)).toMatch(/^\d{4}$/);
  });

  it("generates passwords of requested length", () => {
    expect(generateRandomPassword(20)).toHaveLength(20);
  });
});
