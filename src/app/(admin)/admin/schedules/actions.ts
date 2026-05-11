"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { ScheduleSchema, type Day } from "@/schemas/schedule";

type Result =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function parseFormData(formData: FormData) {
  const workDays = formData.getAll("workDays").map(String) as Day[];
  return ScheduleSchema.safeParse({
    label: formData.get("label"),
    shiftStart: formData.get("shiftStart"),
    lunchStart: formData.get("lunchStart"),
    lunchEnd: formData.get("lunchEnd"),
    shiftEnd: formData.get("shiftEnd"),
    workDays,
  });
}

export async function createScheduleAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await requireAdmin();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the form.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const schedule = await db.schedule.create({
    data: {
      label: parsed.data.label,
      shiftStart: parsed.data.shiftStart,
      lunchStart: parsed.data.lunchStart,
      lunchEnd: parsed.data.lunchEnd,
      shiftEnd: parsed.data.shiftEnd,
      workDays: JSON.stringify(parsed.data.workDays),
    },
  });

  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "schedule_created",
    entityType: "schedule",
    entityId: schedule.id,
    after: parsed.data,
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath("/admin/schedules");
  redirect("/admin/schedules");
}

export async function updateScheduleAction(
  scheduleId: string,
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await requireAdmin();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the form.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const before = await db.schedule.findUnique({ where: { id: scheduleId } });
  if (!before) return { ok: false, error: "Schedule not found." };

  const after = await db.schedule.update({
    where: { id: scheduleId },
    data: {
      label: parsed.data.label,
      shiftStart: parsed.data.shiftStart,
      lunchStart: parsed.data.lunchStart,
      lunchEnd: parsed.data.lunchEnd,
      shiftEnd: parsed.data.shiftEnd,
      workDays: JSON.stringify(parsed.data.workDays),
    },
  });

  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "schedule_updated",
    entityType: "schedule",
    entityId: scheduleId,
    before,
    after,
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath("/admin/schedules");
  redirect("/admin/schedules");
}
