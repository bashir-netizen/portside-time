import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

const TOKEN_VERSION = "v1";

function sign(payload: string): string {
  return createHmac("sha256", env.APPROVAL_TOKEN_SECRET)
    .update(payload)
    .digest("base64url");
}

/**
 * Sign a single-use IP-approval token tied to a PendingIp row.
 *
 * Single-use enforcement happens against `PendingIp.approvalToken` in the DB —
 * once the row is marked `approved` or `dismissed`, the token verification
 * function `verifyApprovalToken` only confirms format / signature / expiry,
 * and the caller checks the DB state.
 */
export function signApprovalToken(args: {
  pendingIpId: string;
  expiresAt: Date;
}): string {
  const nonce = randomBytes(16).toString("base64url");
  const expMs = args.expiresAt.getTime();
  const body = `${TOKEN_VERSION}.${args.pendingIpId}.${expMs}.${nonce}`;
  const sig = sign(body);
  return `${body}.${sig}`;
}

export type VerifiedApprovalToken =
  | { ok: true; pendingIpId: string; expiresAt: Date }
  | { ok: false; reason: "bad_format" | "bad_signature" | "expired" };

export function verifyApprovalToken(
  token: string,
): VerifiedApprovalToken {
  const parts = token.split(".");
  if (parts.length !== 5) return { ok: false, reason: "bad_format" };
  const [version, pendingIpId, expStr, nonce, sig] = parts as [
    string,
    string,
    string,
    string,
    string,
  ];
  if (version !== TOKEN_VERSION) return { ok: false, reason: "bad_format" };

  const body = `${version}.${pendingIpId}.${expStr}.${nonce}`;
  const expected = sign(body);
  if (sig.length !== expected.length) return { ok: false, reason: "bad_signature" };
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return { ok: false, reason: "bad_signature" };
    }
  } catch {
    return { ok: false, reason: "bad_signature" };
  }

  const expMs = Number(expStr);
  if (!Number.isFinite(expMs)) return { ok: false, reason: "bad_format" };
  const expiresAt = new Date(expMs);
  if (expiresAt <= new Date()) return { ok: false, reason: "expired" };

  return { ok: true, pendingIpId, expiresAt };
}
