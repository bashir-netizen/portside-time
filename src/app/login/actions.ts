"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { resolveClientIp } from "@/lib/ip";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import {
  checkAccountLocked,
  checkIpRate,
  recordFailedLogin,
  resetFailedLogin,
} from "@/lib/auth/rate-limit";
import { AdminLoginSchema, EmployeeLoginSchema } from "@/schemas/auth";
import { readDeviceCookie } from "@/lib/device/cookie";
import { checkDevice } from "@/lib/device/check";
import { recordIpRejection } from "@/app/(admin)/admin/ip-allowlist/actions";

export type LoginActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      retryAfterSeconds?: number;
      fieldErrors?: Record<string, string[]>;
    };

export async function adminLoginAction(
  _prev: LoginActionResult | null,
  formData: FormData,
): Promise<LoginActionResult> {
  const headerList = await headers();
  const ip = resolveClientIp(headerList);

  const ipRate = checkIpRate(ip);
  if (!ipRate.allowed) {
    return {
      ok: false,
      error: "Too many attempts. Try again in a minute.",
      retryAfterSeconds: ipRate.retryAfterSeconds,
    };
  }

  const parsed = AdminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the form and try again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { email, password } = parsed.data;
  const lock = await checkAccountLocked(email);
  if (lock.locked) {
    return {
      ok: false,
      error: "This account is temporarily locked. Try again later.",
    };
  }

  const user = await db.user.findUnique({ where: { email } });
  const ok =
    user && user.status === "active"
      ? await verifyPassword(user.passwordHash, password)
      : false;

  if (!ok || !user) {
    if (user) await recordFailedLogin(email);
    await audit({
      actor: user ? { type: "user", id: user.id } : { type: "system" },
      action: "login_failed",
      entityType: "user",
      entityId: user?.id,
      sourceIp: ip,
      userAgent: headerList.get("user-agent"),
    });
    return { ok: false, error: "Invalid credentials." };
  }

  await resetFailedLogin(user.id);
  await createSession({
    role: "admin",
    userId: user.id,
    sourceIp: ip,
    markSensitive: true,
  });
  await audit({
    actor: { type: "user", id: user.id },
    action: "login_success",
    entityType: "user",
    entityId: user.id,
    sourceIp: ip,
    userAgent: headerList.get("user-agent"),
  });

  redirect("/admin");
}

export async function employeeLoginAction(
  _prev: LoginActionResult | null,
  formData: FormData,
): Promise<LoginActionResult> {
  const headerList = await headers();
  const ip = resolveClientIp(headerList);

  const ipRate = checkIpRate(ip);
  if (!ipRate.allowed) {
    return {
      ok: false,
      error: "Too many attempts. Try again in a minute.",
      retryAfterSeconds: ipRate.retryAfterSeconds,
    };
  }

  const parsed = EmployeeLoginSchema.safeParse({
    employeeId: formData.get("employeeId"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter your 6-digit PIN." };
  }

  // Office-only gate: IP allowlist
  const activeIps = await db.ipAllowlist.findMany({ where: { active: true } });
  const ipAllowed = ip ? activeIps.some((r) => r.ipAddress === ip) : false;
  if (!ipAllowed) {
    await audit({
      actor: { type: "system" },
      action: "employee_login_blocked",
      entityType: "employee",
      entityId: parsed.data.employeeId,
      sourceIp: ip,
      userAgent: headerList.get("user-agent"),
      checkFailed: "ip",
    });
    // Trigger PendingIp + email flow (idempotent: doesn't re-fire on every miss).
    if (ip) {
      const cookieForRejection = await readDeviceCookie();
      await recordIpRejection({
        ipAddress: ip,
        triggeringDeviceId: cookieForRejection?.deviceId ?? null,
      });
    }
    return { ok: false, error: "Access denied." };
  }

  // Office-only gate: approved device
  const cookie = await readDeviceCookie();
  const device = await checkDevice({ deviceId: cookie?.deviceId });
  if (!device.ok) {
    await audit({
      actor: { type: "system" },
      action: "employee_login_blocked",
      entityType: "employee",
      entityId: parsed.data.employeeId,
      sourceIp: ip,
      deviceId: cookie?.deviceId,
      userAgent: headerList.get("user-agent"),
      checkFailed: "device",
    });
    return { ok: false, error: "Access denied." };
  }

  const employee = await db.employee.findUnique({
    where: { id: parsed.data.employeeId },
  });
  if (!employee || employee.status !== "active" || !employee.pinHash) {
    return { ok: false, error: "Invalid PIN." };
  }
  const pinOk = await verifyPassword(employee.pinHash, parsed.data.pin);
  if (!pinOk) {
    await audit({
      actor: { type: "employee", id: employee.id },
      action: "login_failed",
      entityType: "employee",
      entityId: employee.id,
      sourceIp: ip,
      deviceId: device.device.id,
    });
    return { ok: false, error: "Invalid PIN." };
  }

  await createSession({
    role: "employee",
    employeeId: employee.id,
    deviceId: device.device.id,
    sourceIp: ip,
  });
  await audit({
    actor: { type: "employee", id: employee.id },
    action: "login_success",
    entityType: "employee",
    entityId: employee.id,
    sourceIp: ip,
    deviceId: device.device.id,
  });

  redirect("/me");
}

export async function logoutAction(): Promise<never> {
  await destroySession();
  redirect("/login");
}
