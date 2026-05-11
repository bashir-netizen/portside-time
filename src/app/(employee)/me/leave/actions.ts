"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { readSession } from "@/lib/auth/session";
import { resolveClientIp } from "@/lib/ip";
import { parseYmdInDjibouti } from "@/lib/time";
import { LeaveRequestSchema } from "@/schemas/leave";
import { djiboutiBusinessDays } from "@/lib/leave/accrual";

type Result = { ok: boolean; error?: string };

export async function requestLeaveAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const session = await readSession();
  if (!session || session.role !== "employee" || !session.employeeId) {
    return { ok: false, error: "Sign in as an employee first." };
  }
  const headerList = await headers();
  const ip = resolveClientIp(headerList);

  const parsed = LeaveRequestSchema.safeParse({
    leaveType: formData.get("leaveType"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Check the form." };

  const days = djiboutiBusinessDays(parsed.data.startDate, parsed.data.endDate);
  const isSick = parsed.data.leaveType === "sick";

  const lr = await db.leaveRequest.create({
    data: {
      employeeId: session.employeeId,
      leaveType: parsed.data.leaveType,
      startDate: parseYmdInDjibouti(parsed.data.startDate),
      endDate: parseYmdInDjibouti(parsed.data.endDate),
      days,
      status: isSick ? "pending_certificate" : "pending",
      notes: parsed.data.notes ?? null,
    },
  });
  await audit({
    actor: { type: "employee", id: session.employeeId },
    action: "leave_requested",
    entityType: "leave_request",
    entityId: lr.id,
    after: parsed.data,
    sourceIp: ip,
  });

  revalidatePath("/me/leave");
  return { ok: true };
}
