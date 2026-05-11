"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import {
  AdminLeaveCreateSchema,
  DecideLeaveSchema,
  HolidaySchema,
} from "@/schemas/leave";
import { parseYmdInDjibouti } from "@/lib/time";
import { djiboutiBusinessDays } from "@/lib/leave/accrual";

type Result = { ok: boolean; error?: string };

export async function createLeaveAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await requireAdmin();
  const parsed = AdminLeaveCreateSchema.safeParse({
    employeeId: formData.get("employeeId"),
    leaveType: formData.get("leaveType"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Check the form." };
  }

  const days = djiboutiBusinessDays(parsed.data.startDate, parsed.data.endDate);
  const isSick = parsed.data.leaveType === "sick";

  const lr = await db.leaveRequest.create({
    data: {
      employeeId: parsed.data.employeeId,
      leaveType: parsed.data.leaveType,
      startDate: parseYmdInDjibouti(parsed.data.startDate),
      endDate: parseYmdInDjibouti(parsed.data.endDate),
      days,
      status: isSick ? "pending_certificate" : "approved",
      approverId: isSick ? null : ctx.session.userId,
      decidedAt: isSick ? null : new Date(),
      notes: parsed.data.notes ?? null,
    },
  });

  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "leave_created_by_admin",
    entityType: "leave_request",
    entityId: lr.id,
    after: { ...parsed.data, days },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath("/admin/leave");
  return { ok: true };
}

export async function decideLeaveAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await requireAdmin();
  const parsed = DecideLeaveSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Bad request." };

  const before = await db.leaveRequest.findUnique({
    where: { id: parsed.data.requestId },
  });
  if (!before) return { ok: false, error: "Request not found." };

  await db.leaveRequest.update({
    where: { id: before.id },
    data: {
      status: parsed.data.decision,
      approverId: ctx.session.userId,
      decidedAt: new Date(),
      notes: parsed.data.notes ?? before.notes,
    },
  });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: `leave_${parsed.data.decision}`,
    entityType: "leave_request",
    entityId: before.id,
    before: { status: before.status },
    after: { status: parsed.data.decision },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidatePath("/admin/leave");
  return { ok: true };
}

export async function markCertifiedSickAction(
  requestId: string,
): Promise<Result> {
  const ctx = await requireAdmin();
  const before = await db.leaveRequest.findUnique({ where: { id: requestId } });
  if (!before) return { ok: false, error: "Not found." };
  await db.leaveRequest.update({
    where: { id: requestId },
    data: {
      status: "certified_sick",
      decidedAt: new Date(),
      approverId: ctx.session.userId,
    },
  });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "leave_certified_sick",
    entityType: "leave_request",
    entityId: requestId,
    before: { status: before.status },
    after: { status: "certified_sick" },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidatePath("/admin/leave");
  return { ok: true };
}

export async function markUnauthorizedAction(
  requestId: string,
): Promise<Result> {
  const ctx = await requireAdmin();
  const before = await db.leaveRequest.findUnique({ where: { id: requestId } });
  if (!before) return { ok: false, error: "Not found." };
  await db.leaveRequest.update({
    where: { id: requestId },
    data: {
      status: "unauthorized",
      decidedAt: new Date(),
      approverId: ctx.session.userId,
    },
  });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "leave_unauthorized",
    entityType: "leave_request",
    entityId: requestId,
    before: { status: before.status },
    after: { status: "unauthorized" },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidatePath("/admin/leave");
  return { ok: true };
}

export async function addHolidayAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await requireAdmin();
  const parsed = HolidaySchema.safeParse({
    date: formData.get("date"),
    name: formData.get("name"),
    isPaid: formData.get("isPaid") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: "Check the form." };
  }

  const date = parseYmdInDjibouti(parsed.data.date);
  const existing = await db.holiday.findUnique({ where: { date } });
  if (existing) return { ok: false, error: "Already on the calendar." };

  const created = await db.holiday.create({
    data: { date, name: parsed.data.name, isPaid: parsed.data.isPaid },
  });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "holiday_added",
    entityType: "holiday",
    entityId: created.id,
    after: parsed.data,
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidatePath("/admin/holidays");
  return { ok: true };
}

export async function deleteHolidayAction(id: string): Promise<void> {
  const ctx = await requireAdmin();
  const before = await db.holiday.findUnique({ where: { id } });
  if (!before) return;
  await db.holiday.delete({ where: { id } });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "holiday_deleted",
    entityType: "holiday",
    entityId: id,
    before,
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidatePath("/admin/holidays");
}
