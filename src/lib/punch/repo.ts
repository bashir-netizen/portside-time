import { db } from "../db";
import type { PunchType } from "./types";
import { djiboutiDayWindow } from "./window";

export type PunchRow = {
  id: string;
  punchType: PunchType;
  punchedAt: Date;
  isCorrected: boolean;
};

export type EffectivePunch = PunchRow & {
  voided: boolean;
  originalPunchedAt: Date | null;
};

/**
 * Resolve effective punches across [start, end) for an employee, applying
 * the latest PunchCorrection per punch:
 *   - `void`  → mark voided; excluded from calc reads
 *   - `edit`  → use the new time
 *   - `add`   → the punch is the correction's new state (handled by the
 *               punch row already inserted at the corrected time)
 */
export async function getEffectivePunches(args: {
  employeeId?: string;
  start: Date;
  end: Date;
}): Promise<EffectivePunch[]> {
  const where = {
    punchedAt: { gte: args.start, lt: args.end },
    ...(args.employeeId ? { employeeId: args.employeeId } : {}),
  };
  const rows = await db.punch.findMany({
    where,
    include: {
      corrections: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { punchedAt: "asc" },
  });
  return rows.map((r) => {
    const latest = r.corrections[0];
    const voided = latest?.correctionType === "void";
    const editedTime =
      latest?.correctionType === "edit" && latest.newPunchedAt
        ? latest.newPunchedAt
        : null;
    return {
      id: r.id,
      punchType: r.punchType as PunchType,
      punchedAt: editedTime ?? r.punchedAt,
      isCorrected: r.isCorrected,
      voided,
      originalPunchedAt: latest ? latest.originalPunchedAt : null,
    };
  });
}

/**
 * Today's punches for an employee, ordered by punchedAt ascending.
 * Africa/Djibouti calendar day boundary.
 */
export async function getTodaysPunches(
  employeeId: string,
  now: Date = new Date(),
): Promise<PunchRow[]> {
  const { start, end } = djiboutiDayWindow(now);
  const effective = await getEffectivePunches({ employeeId, start, end });
  return effective.filter((p) => !p.voided);
}
