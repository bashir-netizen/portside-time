"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";

type Result = { ok: boolean; error?: string };

/**
 * Admin decides on a late incident — `decision` is either "justified"
 * (accept the reason) or "manager_unjustified" (reject). Only valid when
 * the incident is in "submitted" status.
 */
export async function decideLateIncidentAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await requireAdmin();

  const incidentId = String(formData.get("incidentId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!incidentId) return { ok: false, error: "Missing incident id." };
  if (decision !== "justified" && decision !== "manager_unjustified") {
    return { ok: false, error: "Invalid decision." };
  }
  if (notes.length > 1000) {
    return { ok: false, error: "Notes too long (max 1000 characters)." };
  }

  const incident = await db.lateIncident.findUnique({ where: { id: incidentId } });
  if (!incident) return { ok: false, error: "Incident not found." };
  if (incident.status !== "submitted") {
    return {
      ok: false,
      error: "Only submitted incidents can be decided. This one is " + incident.status + ".",
    };
  }

  const before = { status: incident.status, decisionNotes: incident.decisionNotes };
  await db.lateIncident.update({
    where: { id: incidentId },
    data: {
      status: decision,
      decidedAt: new Date(),
      decidedBy: ctx.session.userId,
      decisionNotes: notes || null,
    },
  });

  if (!ctx.session.userId) {
    return { ok: false, error: "Admin session has no user id." };
  }
  await audit({
    actor: { type: "user", id: ctx.session.userId },
    action: decision === "justified" ? "late_incident_accepted" : "late_incident_rejected",
    entityType: "late_incident",
    entityId: incidentId,
    before,
    after: { status: decision, decisionNotes: notes || null },
  });

  revalidatePath("/admin/late");
  revalidatePath("/admin");
  return { ok: true };
}
