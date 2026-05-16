"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { resolveClientIp } from "@/lib/ip";
import { readSession } from "@/lib/auth/session";
import { readDeviceCookie } from "@/lib/device/cookie";
import { checkDevice } from "@/lib/device/check";
import { getTodaysPunches } from "@/lib/punch/repo";
import { checkSequence } from "@/lib/punch/sequence";
import { isPunchType, type PunchType } from "@/lib/punch/types";

type PunchActionResult =
  | { ok: true; punchType: PunchType }
  | {
      ok: false;
      reason:
        | "no_session"
        | "wrong_role"
        | "ip"
        | "device"
        | "fingerprint_mismatch"
        | "sequence"
        | "bad_request";
      message: string;
    };

/**
 * Punch action — runs all four checks from CLAUDE.md §11 in order:
 *   1. Valid session
 *   2. Role = employee
 *   3. Source IP is allowlisted
 *   4. Device cookie matches an approved Device, and FingerprintJS visitorId
 *      hashes to the same fingerprint we stored at registration
 *   5. Requested punch is the next valid type in today's sequence
 *
 * Failures audit with `check_failed` set so the admin can troubleshoot. A
 * generic message is returned to the client so we don't leak which gate
 * failed.
 */
export async function punchAction(formData: FormData): Promise<PunchActionResult> {
  const headerList = await headers();
  const ip = resolveClientIp(headerList);
  const userAgent = headerList.get("user-agent");

  // Dev-only bypass of the IP allowlist + approved-device gates. Same opt-in
  // pattern as the login action. NEVER active in production: the NODE_ENV
  // check is the hard gate; the env var is just the explicit opt-in. The
  // session + sequence checks remain active even when bypassed.
  const devBypassGates =
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_BYPASS_OFFICE_GATES === "1";

  const session = await readSession();
  if (!session) {
    return { ok: false, reason: "no_session", message: "Sign in first." };
  }
  if (session.role !== "employee" || !session.employeeId) {
    await audit({
      actor: { type: "system" },
      action: "punch_blocked",
      sourceIp: ip,
      userAgent,
      checkFailed: "session",
    });
    return { ok: false, reason: "wrong_role", message: "Only employees can punch." };
  }

  const requestedRaw = String(formData.get("punchType") ?? "");
  if (!isPunchType(requestedRaw)) {
    return { ok: false, reason: "bad_request", message: "Bad punch type." };
  }
  const requested: PunchType = requestedRaw;
  const visitorId = String(formData.get("visitorId") ?? "");
  if (!visitorId && !devBypassGates) {
    return { ok: false, reason: "bad_request", message: "Missing fingerprint." };
  }

  // Check 3 — IP allowlist (skipped when dev-bypass is on)
  if (!devBypassGates) {
    const active = await db.ipAllowlist.findMany({ where: { active: true } });
    const ipOk = ip ? active.some((r) => r.ipAddress === ip) : false;
    if (!ipOk) {
      await audit({
        actor: { type: "employee", id: session.employeeId },
        action: "punch_blocked",
        entityType: "employee",
        entityId: session.employeeId,
        sourceIp: ip,
        userAgent,
        checkFailed: "ip",
      });
      return { ok: false, reason: "ip", message: "Access denied." };
    }
  }

  // Check 4 — Device + fingerprint (skipped when dev-bypass is on; punch is
  // recorded without a deviceId in that case)
  let deviceIdForPunch: string | null = null;
  if (!devBypassGates) {
    const cookie = await readDeviceCookie();
    const deviceCheck = await checkDevice({
      deviceId: cookie?.deviceId,
      visitorId,
    });
    if (!deviceCheck.ok) {
      const reason = deviceCheck.reason === "fingerprint_mismatch"
        ? "fingerprint_mismatch"
        : "device";
      await audit({
        actor: { type: "employee", id: session.employeeId },
        action: "punch_blocked",
        entityType: "employee",
        entityId: session.employeeId,
        sourceIp: ip,
        userAgent,
        deviceId: cookie?.deviceId,
        checkFailed: "device",
        after: { reason: deviceCheck.reason },
      });
      return {
        ok: false,
        reason,
        message:
          reason === "fingerprint_mismatch"
            ? "This browser doesn't match the approved device. Ask the admin to re-register."
            : "Access denied.",
      };
    }
    deviceIdForPunch = deviceCheck.device.id;
  }

  // Check 5 — sequence
  const todays = await getTodaysPunches(session.employeeId);
  const seq = checkSequence(
    todays.map((p) => p.punchType),
    requested,
  );
  if (!seq.ok) {
    await audit({
      actor: { type: "employee", id: session.employeeId },
      action: "punch_blocked",
      entityType: "employee",
      entityId: session.employeeId,
      sourceIp: ip,
      userAgent,
      deviceId: deviceIdForPunch ?? undefined,
      checkFailed: "sequence",
      after: { requested, reason: seq.reason, expected: seq.expected },
    });
    return {
      ok: false,
      reason: "sequence",
      message: seq.expected
        ? `Next valid punch is ${seq.expected.replace("_", " ")}.`
        : "Today's shift is already finished.",
    };
  }

  // All checks pass — record the punch.
  await db.punch.create({
    data: {
      employeeId: session.employeeId,
      punchType: requested,
      punchedAt: new Date(),
      sourceIp: ip,
      deviceId: deviceIdForPunch,
      userAgent,
    },
  });
  if (deviceIdForPunch) {
    await db.device.update({
      where: { id: deviceIdForPunch },
      data: { lastSeenAt: new Date(), lastSeenIp: ip },
    });
  }

  await audit({
    actor: { type: "employee", id: session.employeeId },
    action: "punch_recorded",
    entityType: "employee",
    entityId: session.employeeId,
    sourceIp: ip,
    userAgent,
    deviceId: deviceIdForPunch ?? undefined,
    after: { punchType: requested },
  });

  revalidatePath("/me");
  revalidatePath("/admin");
  return { ok: true, punchType: requested };
}
