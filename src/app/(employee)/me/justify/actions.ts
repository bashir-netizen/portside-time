"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { readSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { resolveClientIp } from "@/lib/ip";

type SubmitResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Employee submits a justification for one of their late incidents.
 *
 * Allowed only when:
 *  - The session is an employee session
 *  - The incident belongs to this employee
 *  - The incident is in `pending_justification` status (already submitted /
 *    decided incidents can't be edited from here)
 */
export async function submitJustificationAction(
  formData: FormData,
): Promise<SubmitResult> {
  const headerList = await headers();
  const ip = resolveClientIp(headerList);
  const userAgent = headerList.get("user-agent");

  const session = await readSession();
  if (!session?.employeeId || session.role !== "employee") {
    return { ok: false, message: "Sign in first." };
  }

  const incidentId = String(formData.get("incidentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!incidentId) return { ok: false, message: "Missing incident id." };
  if (reason.length < 3) {
    return { ok: false, message: "Reason must be at least 3 characters." };
  }
  if (reason.length > 2000) {
    return { ok: false, message: "Reason is too long (max 2000 characters)." };
  }

  const incident = await db.lateIncident.findUnique({ where: { id: incidentId } });
  if (!incident || incident.employeeId !== session.employeeId) {
    return { ok: false, message: "Incident not found." };
  }
  if (incident.status !== "pending_justification") {
    return {
      ok: false,
      message: "This incident is no longer open for justification.",
    };
  }

  const before = { status: incident.status, reason: incident.reason };
  await db.lateIncident.update({
    where: { id: incidentId },
    data: {
      reason,
      submittedAt: new Date(),
      status: "submitted",
    },
  });

  await audit({
    actor: { type: "employee", id: session.employeeId },
    action: "late_incident_justified",
    entityType: "late_incident",
    entityId: incidentId,
    sourceIp: ip,
    userAgent,
    before,
    after: { status: "submitted", reasonLength: reason.length },
  });

  revalidatePath("/me/justify");
  revalidatePath("/admin/late");
  return { ok: true };
}
