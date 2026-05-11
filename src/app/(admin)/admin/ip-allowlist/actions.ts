"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { sendIpApprovalEmail } from "@/lib/email";
import { signApprovalToken, verifyApprovalToken } from "@/lib/tokens";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/time";
import { AddIpSchema, ApproveIpSchema, DismissIpSchema } from "@/schemas/ip";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function addIpAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireAdmin();
  const parsed = AddIpSchema.safeParse({
    ipAddress: formData.get("ipAddress"),
    label: formData.get("label"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid IP and label." };
  }

  const existing = await db.ipAllowlist.findFirst({
    where: { ipAddress: parsed.data.ipAddress, active: true },
  });
  if (existing) {
    return { ok: false, error: "This IP is already on the allowlist." };
  }

  const row = await db.ipAllowlist.create({
    data: {
      ipAddress: parsed.data.ipAddress,
      label: parsed.data.label,
      addedBy: ctx.session.userId!,
    },
  });

  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "ip_added",
    entityType: "ip_allowlist",
    entityId: row.id,
    after: parsed.data,
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath("/admin/ip-allowlist");
  return { ok: true };
}

export async function deactivateIpAction(
  ipAllowlistId: string,
): Promise<void> {
  const ctx = await requireAdmin();
  const before = await db.ipAllowlist.findUnique({
    where: { id: ipAllowlistId },
  });
  if (!before) return;
  await db.ipAllowlist.update({
    where: { id: ipAllowlistId },
    data: { active: false, deactivatedAt: new Date() },
  });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "ip_deactivated",
    entityType: "ip_allowlist",
    entityId: ipAllowlistId,
    before,
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidatePath("/admin/ip-allowlist");
}

export async function approvePendingIpAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireAdmin();
  const parsed = ApproveIpSchema.safeParse({
    pendingIpId: formData.get("pendingIpId"),
    label: formData.get("label"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Provide a label." };
  }

  const pending = await db.pendingIp.findUnique({
    where: { id: parsed.data.pendingIpId },
  });
  if (!pending || pending.status !== "open") {
    return { ok: false, error: "Already resolved." };
  }

  const created = await db.ipAllowlist.create({
    data: {
      ipAddress: pending.ipAddress,
      label: parsed.data.label,
      addedBy: ctx.session.userId!,
    },
  });
  await db.pendingIp.update({
    where: { id: pending.id },
    data: { status: "approved", resolvedAt: new Date() },
  });

  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "ip_approved_from_detection",
    entityType: "ip_allowlist",
    entityId: created.id,
    after: { ipAddress: pending.ipAddress, label: parsed.data.label },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath("/admin/ip-allowlist");
  revalidatePath("/admin");
  return { ok: true };
}

export async function dismissPendingIpAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireAdmin();
  const parsed = DismissIpSchema.safeParse({
    pendingIpId: formData.get("pendingIpId"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const before = await db.pendingIp.findUnique({
    where: { id: parsed.data.pendingIpId },
  });
  if (!before || before.status !== "open") {
    return { ok: false, error: "Already resolved." };
  }

  await db.pendingIp.update({
    where: { id: before.id },
    data: { status: "dismissed", resolvedAt: new Date() },
  });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "ip_approval_dismissed",
    entityType: "pending_ip",
    entityId: before.id,
    before,
    after: { reason: parsed.data.reason },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath("/admin/ip-allowlist");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Server-side trigger that fires the new-IP email + creates a PendingIp row
 * with a signed, single-use approval token. Called from the employee-PIN
 * login server action when an IP isn't in the allowlist.
 *
 * Idempotent: if a row already exists in `open` state, we update last_seen_at
 * + observation count, and re-fire the email only if the existing token has
 * expired.
 */
export async function recordIpRejection(args: {
  ipAddress: string;
  triggeringDeviceId: string | null;
}): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);

  const existing = await db.pendingIp.findUnique({
    where: { ipAddress: args.ipAddress },
  });

  let pendingId: string;
  let firstSeen: Date;
  let triggeringDeviceLabel = "unknown device";

  if (existing && existing.status === "open") {
    const token = existing.tokenExpiresAt && existing.tokenExpiresAt > now
      ? existing.approvalToken
      : signApprovalToken({ pendingIpId: existing.id, expiresAt });
    await db.pendingIp.update({
      where: { id: existing.id },
      data: {
        lastSeenAt: now,
        observationCount: existing.observationCount + 1,
        approvalToken: token,
        tokenExpiresAt: expiresAt,
        triggeringDeviceId: args.triggeringDeviceId,
      },
    });
    pendingId = existing.id;
    firstSeen = existing.firstSeenAt;
    // No email re-fire on each observation — only fired on initial creation.
    // (Spec §7: ~30 sec admin effort; we don't want to spam the admin.)
    return;
  }

  if (existing) {
    // Was dismissed / approved / expired — reopen.
    await db.pendingIp.update({
      where: { id: existing.id },
      data: {
        status: "open",
        firstSeenAt: now,
        lastSeenAt: now,
        observationCount: 1,
        triggeringDeviceId: args.triggeringDeviceId,
        resolvedAt: null,
      },
    });
    pendingId = existing.id;
    firstSeen = now;
  } else {
    const created = await db.pendingIp.create({
      data: {
        ipAddress: args.ipAddress,
        triggeringDeviceId: args.triggeringDeviceId,
      },
    });
    pendingId = created.id;
    firstSeen = created.firstSeenAt;
  }

  const token = signApprovalToken({ pendingIpId: pendingId, expiresAt });
  await db.pendingIp.update({
    where: { id: pendingId },
    data: { approvalToken: token, tokenExpiresAt: expiresAt },
  });

  if (args.triggeringDeviceId) {
    const device = await db.device.findUnique({
      where: { id: args.triggeringDeviceId },
    });
    if (device) triggeringDeviceLabel = device.label;
  }

  await audit({
    actor: { type: "system" },
    action: "pending_ip_observed",
    entityType: "pending_ip",
    entityId: pendingId,
    after: { ipAddress: args.ipAddress },
    sourceIp: args.ipAddress,
  });

  const approvalUrl = `${env.APP_URL}/admin/ip-allowlist/approve?token=${encodeURIComponent(token)}`;
  await sendIpApprovalEmail({
    to: env.ADMIN_ALERT_EMAIL,
    ip: args.ipAddress,
    deviceLabel: triggeringDeviceLabel,
    observedAt: formatDateTime(firstSeen),
    approvalUrl,
    expiresAtFormatted: formatDateTime(expiresAt),
  });
}

export async function approveFromTokenAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireAdmin();
  const token = String(formData.get("token") ?? "");
  const label = String(formData.get("label") ?? "");
  if (!token || !label) {
    return { ok: false, error: "Missing token or label." };
  }
  const v = verifyApprovalToken(token);
  if (!v.ok) return { ok: false, error: `Bad token: ${v.reason}` };

  const pending = await db.pendingIp.findUnique({
    where: { id: v.pendingIpId },
  });
  if (!pending) return { ok: false, error: "Detection not found." };
  if (pending.status !== "open") {
    return { ok: false, error: "Already resolved." };
  }
  if (pending.approvalToken !== token) {
    return { ok: false, error: "Token is stale." };
  }

  const created = await db.ipAllowlist.create({
    data: {
      ipAddress: pending.ipAddress,
      label,
      addedBy: ctx.session.userId!,
    },
  });
  await db.pendingIp.update({
    where: { id: pending.id },
    data: { status: "approved", resolvedAt: new Date() },
  });

  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "ip_approved_from_email",
    entityType: "ip_allowlist",
    entityId: created.id,
    after: { ipAddress: pending.ipAddress, label },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath("/admin/ip-allowlist");
  revalidatePath("/admin");
  redirect("/admin/ip-allowlist");
}
