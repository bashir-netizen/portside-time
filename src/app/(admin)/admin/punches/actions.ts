"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { parseYmdInDjibouti } from "@/lib/time";
import {
  AddPunchSchema,
  EditPunchSchema,
  VoidPunchSchema,
} from "@/schemas/punch";

type Result = { ok: boolean; error?: string };

function parseLocalDateTime(value: string): Date {
  // value is YYYY-MM-DDTHH:mm interpreted in Africa/Djibouti.
  const [ymd, hm] = value.split("T") as [string, string];
  const [hh, mm] = hm.split(":") as [string, string];
  const dayStart = parseYmdInDjibouti(ymd);
  return new Date(
    dayStart.getTime() + Number(hh) * 60 * 60 * 1000 + Number(mm) * 60 * 1000,
  );
}

async function assertNotLocked(at: Date): Promise<void> {
  // Block corrections inside a locked period — adjustments handle that path.
  const period = await db.monthlyReport.findFirst({
    where: {
      periodStart: { lte: at },
      periodEnd: { gt: at },
      locked: true,
    },
  });
  if (period) {
    throw new Error("Period is locked — use the Adjustments tool instead.");
  }
}

export async function addPunchAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await requireAdmin();
  const parsed = AddPunchSchema.safeParse({
    employeeId: formData.get("employeeId"),
    punchType: formData.get("punchType"),
    punchedAt: formData.get("punchedAt"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Check the form (reason needs ≥5 chars)." };
  }
  const at = parseLocalDateTime(parsed.data.punchedAt);
  try {
    await assertNotLocked(at);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const punch = await db.punch.create({
    data: {
      employeeId: parsed.data.employeeId,
      punchType: parsed.data.punchType,
      punchedAt: at,
      isCorrected: true,
      sourceIp: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });
  await db.punchCorrection.create({
    data: {
      punchId: punch.id,
      employeeId: parsed.data.employeeId,
      correctionType: "add",
      newPunchType: parsed.data.punchType,
      newPunchedAt: at,
      adminId: ctx.session.userId!,
      reason: parsed.data.reason,
    },
  });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "punch_correction_add",
    entityType: "punch",
    entityId: punch.id,
    after: { punchType: parsed.data.punchType, punchedAt: at, reason: parsed.data.reason },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidatePath("/admin/punches");
  revalidatePath(`/admin/employees/${parsed.data.employeeId}`);
  return { ok: true };
}

export async function editPunchAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await requireAdmin();
  const parsed = EditPunchSchema.safeParse({
    punchId: formData.get("punchId"),
    punchedAt: formData.get("punchedAt"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Check the form (reason needs ≥5 chars)." };
  }

  const original = await db.punch.findUnique({
    where: { id: parsed.data.punchId },
  });
  if (!original) return { ok: false, error: "Punch not found." };

  const newAt = parseLocalDateTime(parsed.data.punchedAt);
  try {
    await assertNotLocked(original.punchedAt);
    await assertNotLocked(newAt);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  // Punch table's append-only trigger allows only `is_corrected` to change.
  // So we record a correction row + flip the flag; the *displayed* time is
  // computed by joining to the most recent PunchCorrection.
  await db.punchCorrection.create({
    data: {
      punchId: original.id,
      employeeId: original.employeeId,
      correctionType: "edit",
      originalPunchType: original.punchType,
      originalPunchedAt: original.punchedAt,
      newPunchType: original.punchType,
      newPunchedAt: newAt,
      adminId: ctx.session.userId!,
      reason: parsed.data.reason,
    },
  });
  await db.punch.update({
    where: { id: original.id },
    data: { isCorrected: true },
  });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "punch_correction_edit",
    entityType: "punch",
    entityId: original.id,
    before: { punchedAt: original.punchedAt },
    after: { punchedAt: newAt, reason: parsed.data.reason },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidatePath("/admin/punches");
  revalidatePath(`/admin/employees/${original.employeeId}`);
  return { ok: true };
}

export async function voidPunchAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await requireAdmin();
  const parsed = VoidPunchSchema.safeParse({
    punchId: formData.get("punchId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Check the form (reason needs ≥5 chars)." };
  }

  const original = await db.punch.findUnique({
    where: { id: parsed.data.punchId },
  });
  if (!original) return { ok: false, error: "Punch not found." };
  try {
    await assertNotLocked(original.punchedAt);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  await db.punchCorrection.create({
    data: {
      punchId: original.id,
      employeeId: original.employeeId,
      correctionType: "void",
      originalPunchType: original.punchType,
      originalPunchedAt: original.punchedAt,
      adminId: ctx.session.userId!,
      reason: parsed.data.reason,
    },
  });
  await db.punch.update({
    where: { id: original.id },
    data: { isCorrected: true },
  });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "punch_correction_void",
    entityType: "punch",
    entityId: original.id,
    before: { punchedAt: original.punchedAt, punchType: original.punchType },
    after: { reason: parsed.data.reason },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidatePath("/admin/punches");
  revalidatePath(`/admin/employees/${original.employeeId}`);
  return { ok: true };
}
