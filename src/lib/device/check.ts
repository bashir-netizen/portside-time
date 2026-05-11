import { db } from "../db";
import { hashVisitorId } from "./fingerprint";

export type DeviceCheckResult =
  | {
      ok: true;
      device: {
        id: string;
        label: string;
        fingerprintHash: string;
        status: string;
      };
    }
  | {
      ok: false;
      reason:
        | "no_cookie"
        | "unknown"
        | "fingerprint_mismatch"
        | "revoked"
        | "pending";
    };

/**
 * Verify a device by its ID (already extracted + signature-verified by
 * `readDeviceCookie`) plus an optional live FingerprintJS `visitorId`.
 *
 * Callers:
 *   - the employee-PIN login server action (Step 4)
 *   - future: the punch action (Step 7)
 *
 * If `visitorId` is omitted, only the cookie-to-DB binding is checked.
 * That's the right call on routes where we haven't run FingerprintJS yet
 * but want to gate access by a previously-registered device.
 */
export async function checkDevice(args: {
  deviceId: string | undefined;
  visitorId?: string;
}): Promise<DeviceCheckResult> {
  if (!args.deviceId) return { ok: false, reason: "no_cookie" };

  const device = await db.device.findUnique({
    where: { id: args.deviceId },
  });
  if (!device) return { ok: false, reason: "unknown" };
  if (device.status === "revoked") return { ok: false, reason: "revoked" };
  if (device.status === "pending") return { ok: false, reason: "pending" };

  if (args.visitorId !== undefined) {
    const liveHash = hashVisitorId(args.visitorId);
    if (liveHash !== device.fingerprintHash) {
      return { ok: false, reason: "fingerprint_mismatch" };
    }
  }

  return {
    ok: true,
    device: {
      id: device.id,
      label: device.label,
      fingerprintHash: device.fingerprintHash,
      status: device.status,
    },
  };
}
