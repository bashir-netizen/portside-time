"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { AdjustmentSchema } from "@/schemas/adjustment";
import { parseYmdInDjibouti } from "@/lib/time";

type Result = { ok: boolean; error?: string };

export async function createAdjustmentAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await requireAdmin();
  const parsed = AdjustmentSchema.safeParse({
    employeeId: formData.get("employeeId"),
    appliesToPeriod: formData.get("appliesToPeriod"),
    amountDjf: formData.get("amountDjf"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { ok: false, error: "Check the form (reason ≥ 5 chars)." };

  const appliesToPeriodStart = parseYmdInDjibouti(parsed.data.appliesToPeriod);
  // The referenced period must be locked.
  const locked = await db.monthlyReport.findFirst({
    where: { periodStart: appliesToPeriodStart, locked: true },
  });
  if (!locked) {
    return {
      ok: false,
      error: "That period isn't locked. Use the correction tool instead.",
    };
  }

  const adj = await db.adjustment.create({
    data: {
      employeeId: parsed.data.employeeId,
      appliesToPeriodStart,
      amountDjf: parsed.data.amountDjf,
      reason: parsed.data.reason,
      adminId: ctx.session.userId!,
    },
  });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "adjustment_created",
    entityType: "adjustment",
    entityId: adj.id,
    after: parsed.data,
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidatePath("/admin/adjustments");
  return { ok: true };
}
