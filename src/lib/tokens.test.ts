import { describe, expect, it } from "vitest";
import { signApprovalToken, verifyApprovalToken } from "./tokens";

describe("approval tokens", () => {
  const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000);
  const oneSecondAgo = () => new Date(Date.now() - 1000);

  it("verifies a fresh token", () => {
    const token = signApprovalToken({
      pendingIpId: "pid_1",
      expiresAt: inOneHour(),
    });
    const v = verifyApprovalToken(token);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.pendingIpId).toBe("pid_1");
  });

  it("rejects an expired token", () => {
    const token = signApprovalToken({
      pendingIpId: "pid_1",
      expiresAt: oneSecondAgo(),
    });
    const v = verifyApprovalToken(token);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("expired");
  });

  it("rejects a tampered signature", () => {
    const token = signApprovalToken({
      pendingIpId: "pid_1",
      expiresAt: inOneHour(),
    });
    const tampered = token.slice(0, -2) + "00";
    const v = verifyApprovalToken(tampered);
    expect(v.ok).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifyApprovalToken("garbage").ok).toBe(false);
    expect(verifyApprovalToken("v1.x.y.z").ok).toBe(false);
  });
});
