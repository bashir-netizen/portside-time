"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import {
  RegisterDeviceSchema,
  RelabelDeviceSchema,
  RevokeDeviceSchema,
} from "@/schemas/device";
import { hashVisitorId } from "@/lib/device/fingerprint";
import { issueDeviceCookie, newDeviceId } from "@/lib/device/cookie";

type RegisterResult =
  | { ok: true; deviceId: string; alreadyRegisteredAs?: string }
  | { ok: false; error: string };

export async function registerDeviceAction(
  _prev: RegisterResult | null,
  formData: FormData,
): Promise<RegisterResult> {
  const ctx = await requireAdmin();

  const parsed = RegisterDeviceSchema.safeParse({
    label: formData.get("label"),
    visitorId: formData.get("visitorId"),
    userAgent: formData.get("userAgent") ?? "",
    screenResolution: formData.get("screenResolution") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Missing or malformed fingerprint data." };
  }

  const fingerprintHash = hashVisitorId(parsed.data.visitorId);
  const existing = await db.device.findUnique({
    where: { fingerprintHash },
  });
  if (existing) {
    // Re-issue cookie pointing at the existing device row so this browser stays bound.
    await issueDeviceCookie(existing.id);
    return {
      ok: true,
      deviceId: existing.id,
      alreadyRegisteredAs: existing.label,
    };
  }

  const id = newDeviceId();
  const device = await db.device.create({
    data: {
      id,
      fingerprintHash,
      userAgent: parsed.data.userAgent,
      screenResolution: parsed.data.screenResolution,
      label: parsed.data.label,
      status: "approved",
      approvedBy: ctx.session.userId,
      approvedAt: new Date(),
      lastSeenAt: new Date(),
      lastSeenIp: ctx.ip,
    },
  });

  await issueDeviceCookie(device.id);
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "device_registered",
    entityType: "device",
    entityId: device.id,
    after: { label: device.label, fingerprintHash: "[hashed]" },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
    deviceId: device.id,
  });

  revalidatePath("/admin/devices");
  return { ok: true, deviceId: device.id };
}

export async function revokeDeviceAction(
  deviceId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireAdmin();
  const parsed = RevokeDeviceSchema.safeParse({
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Provide a reason (min 5 chars)." };
  }

  const before = await db.device.findUnique({ where: { id: deviceId } });
  if (!before) return { ok: false, error: "Device not found." };

  await db.device.update({
    where: { id: deviceId },
    data: {
      status: "revoked",
      revokedAt: new Date(),
      revokeReason: parsed.data.reason,
    },
  });

  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "device_revoked",
    entityType: "device",
    entityId: deviceId,
    before: { status: before.status },
    after: { status: "revoked", reason: parsed.data.reason },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath("/admin/devices");
  return { ok: true };
}

export async function relabelDeviceAction(
  deviceId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireAdmin();
  const parsed = RelabelDeviceSchema.safeParse({
    label: formData.get("label"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Label is required." };
  }

  const before = await db.device.findUnique({ where: { id: deviceId } });
  if (!before) return { ok: false, error: "Device not found." };

  await db.device.update({
    where: { id: deviceId },
    data: { label: parsed.data.label },
  });

  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "device_relabeled",
    entityType: "device",
    entityId: deviceId,
    before: { label: before.label },
    after: { label: parsed.data.label },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath("/admin/devices");
  return { ok: true };
}
