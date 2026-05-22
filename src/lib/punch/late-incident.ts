import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { getCompanyConfig } from "@/lib/config";
import type { DayPatternResolved } from "./day-pattern";
import type { PunchType } from "./types";

const TZ = "Africa/Djibouti";

/**
 * Decide whether the just-recorded punch warrants a LateIncident, and if so,
 * create it. Called from `punchAction` after the punch row is inserted.
 *
 * Rules:
 *  - shift_in landing more than `gracePeriodMinutes` past the scheduled
 *    start triggers a `late_arrival` incident.
 *  - shift_out landing more than `gracePeriodMinutes` before the scheduled
 *    end (split_day / continuous_day) triggers an `early_leave` incident.
 *    Half-day uses startTime+4h as the effective end and follows the same
 *    rule. (Spec §5.6 "late punch-out" is the missed-punch-out case which
 *    a periodic job creates, not this function.)
 *
 * Returns the created incident, or null if no incident was warranted.
 *
 * Idempotency: if an incident of the same kind already exists for this
 * employee on the same Djibouti calendar day, do nothing (a corrective
 * second punch shouldn't double-count).
 */
export async function maybeRecordLateIncident(args: {
  employeeId: string;
  punchId: string;
  punchType: PunchType;
  punchedAt: Date;
  pattern: DayPatternResolved;
}): Promise<{ id: string; kind: string; minutes: number } | null> {
  const { employeeId, punchId, punchType, punchedAt, pattern } = args;

  // Day-off patterns can't have late incidents (the sequence check already
  // blocked the punch).
  if (pattern.type === "day_off") return null;

  const cfg = await getCompanyConfig();
  const graceMin = cfg.gracePeriodMinutes;

  let kind: "late_arrival" | "early_leave" | null = null;
  let minutes = 0;

  if (punchType === "shift_in") {
    if (!pattern.startTime) return null;
    const scheduledStart = atDjiboutiTimeOnSameDayAs(pattern.startTime, punchedAt);
    const lateMin = Math.floor(
      (punchedAt.getTime() - scheduledStart.getTime()) / 60000,
    );
    if (lateMin > graceMin) {
      kind = "late_arrival";
      minutes = lateMin - graceMin;
    }
  } else if (punchType === "shift_out") {
    if (!pattern.endTime) return null;
    const scheduledEnd = atDjiboutiTimeOnSameDayAs(pattern.endTime, punchedAt);
    const earlyMin = Math.floor(
      (scheduledEnd.getTime() - punchedAt.getTime()) / 60000,
    );
    if (earlyMin > graceMin) {
      kind = "early_leave";
      minutes = earlyMin - graceMin;
    }
  }

  if (!kind) return null;

  const incidentDate = djiboutiMidnightUtc(punchedAt);

  // Idempotency — don't create a second incident of the same kind for the
  // same day (e.g. if an admin corrects then re-records a punch).
  const existing = await db.lateIncident.findFirst({
    where: { employeeId, incidentDate, kind },
    select: { id: true, kind: true, minutes: true },
  });
  if (existing) return existing;

  return db.lateIncident.create({
    data: {
      employeeId,
      punchId,
      incidentDate,
      kind,
      minutes,
      status: "pending_justification",
    },
    select: { id: true, kind: true, minutes: true },
  });
}

/**
 * Build a UTC instant for a Djibouti-local "HH:mm" time on the same calendar
 * day as the reference instant.
 */
function atDjiboutiTimeOnSameDayAs(hhmm: string, ref: Date): Date {
  const ymd = formatInTimeZone(ref, TZ, "yyyy-MM-dd");
  return new Date(`${ymd}T${hhmm}:00+03:00`);
}

function djiboutiMidnightUtc(ref: Date): Date {
  const ymd = formatInTimeZone(ref, TZ, "yyyy-MM-dd");
  return new Date(`${ymd}T00:00:00+03:00`);
}

/**
 * Periodic job: flip incidents past their justification window to
 * `auto_unjustified`. Called from the `cron` worker (or from
 * docker/entrypoint.sh on container start, as a backstop).
 *
 * Returns the number of incidents flipped.
 */
export async function flipExpiredJustifications(now: Date = new Date()): Promise<number> {
  const cfg = await getCompanyConfig();
  const cutoff = new Date(
    now.getTime() - cfg.justificationWindowHours * 60 * 60 * 1000,
  );
  const candidates = await db.lateIncident.findMany({
    where: {
      status: "pending_justification",
      createdAt: { lt: cutoff },
    },
    select: { id: true },
  });
  if (candidates.length === 0) return 0;
  await db.lateIncident.updateMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    data: { status: "auto_unjustified", autoFlippedAt: now },
  });
  return candidates.length;
}

/**
 * Count of incidents in the last 30 days that are unjustified — used for
 * the Article 59 al. 9 disciplinary flag (3+ in 30 days).
 */
export async function unjustifiedCountLast30Days(employeeId: string, now: Date = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return db.lateIncident.count({
    where: {
      employeeId,
      incidentDate: { gte: since },
      status: { in: ["manager_unjustified", "auto_unjustified"] },
    },
  });
}
