import { db } from "../db";
import type { PunchType } from "./types";
import { djiboutiDayWindow } from "./window";

export type PunchRow = {
  id: string;
  punchType: PunchType;
  punchedAt: Date;
  isCorrected: boolean;
};

/**
 * Today's punches for an employee, ordered by punchedAt ascending.
 * Africa/Djibouti calendar day boundary.
 */
export async function getTodaysPunches(
  employeeId: string,
  now: Date = new Date(),
): Promise<PunchRow[]> {
  const { start, end } = djiboutiDayWindow(now);
  const rows = await db.punch.findMany({
    where: {
      employeeId,
      punchedAt: { gte: start, lt: end },
    },
    orderBy: { punchedAt: "asc" },
    select: {
      id: true,
      punchType: true,
      punchedAt: true,
      isCorrected: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    punchType: r.punchType as PunchType,
    punchedAt: r.punchedAt,
    isCorrected: r.isCorrected,
  }));
}
