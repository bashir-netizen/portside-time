import { db } from "../db";
import { calcDaily } from "../calc/daily";
import { calcMonthly } from "../calc/monthly";
import { getEffectivePunches } from "../punch/repo";
import type { PunchType } from "../punch/types";

export type EmployeeReport = {
  employeeId: string;
  fullName: string;
  workedHours: number;
  scheduledHours: number;
  lateCount: number;
  lateMinutes: number;
  lateDeductionDjf: number;
  overtimeHours: number;
  overtimeAmountDjf: number;
  sickDaysCertified: number;
  sickDaysUncertified: number;
  vacationDays: number;
  holidayDays: number;
  unauthAbsenceDays: number;
  unauthAbsenceDjf: number;
  adjustmentsDjf: number;
  netDeductionDjf: number;
  netAdditionDjf: number;
  monthlySalary: number;
  daily: Array<{
    date: Date;
    workedMinutes: number;
    lateMinutes: number;
    earlyLeaveMinutes: number;
    hasShiftIn: boolean;
    hasShiftOut: boolean;
  }>;
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Compute one employee's monthly summary by aggregating effective punches
 * across the period, against their default schedule.
 *
 * Adjustments (from prior locked periods that haven't been applied yet) are
 * pulled in too — their DJF amount appears in `adjustmentsDjf`.
 */
export async function computeEmployeeReport(args: {
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<EmployeeReport> {
  const employee = await db.employee.findUnique({
    where: { id: args.employeeId },
    include: { defaultSchedule: true },
  });
  if (!employee) throw new Error("Employee not found");

  const [effective, leave, holidays, adjustments] = await Promise.all([
    getEffectivePunches({
      employeeId: args.employeeId,
      start: args.periodStart,
      end: args.periodEnd,
    }),
    db.leaveRequest.findMany({
      where: {
        employeeId: args.employeeId,
        startDate: { lt: args.periodEnd },
        endDate: { gte: args.periodStart },
      },
    }),
    db.holiday.findMany({
      where: { date: { gte: args.periodStart, lt: args.periodEnd } },
    }),
    db.adjustment.findMany({
      where: {
        employeeId: args.employeeId,
        appliedInPeriodStart: null,
        appliesToPeriodStart: { lt: args.periodStart },
      },
    }),
  ]);

  const punchesByDay = new Map<string, typeof effective>();
  for (const p of effective) {
    if (p.voided) continue;
    const key = dayKey(p.punchedAt);
    if (!punchesByDay.has(key)) punchesByDay.set(key, []);
    punchesByDay.get(key)!.push(p);
  }

  const schedule = {
    shiftStart: employee.defaultSchedule.shiftStart,
    lunchStart: employee.defaultSchedule.lunchStart,
    lunchEnd: employee.defaultSchedule.lunchEnd,
    shiftEnd: employee.defaultSchedule.shiftEnd,
  };
  const workDays = JSON.parse(employee.defaultSchedule.workDays) as string[];
  const workDaySet = new Set(workDays);

  const daily: EmployeeReport["daily"] = [];
  let totalWorkedMin = 0;
  let totalLateMin = 0;
  let lateCount = 0;
  let scheduledHours = 0;
  let unauthAbsenceDays = 0;

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayMs = 24 * 60 * 60 * 1000;
  for (
    let d = new Date(args.periodStart);
    d.getTime() < args.periodEnd.getTime();
    d = new Date(d.getTime() + dayMs)
  ) {
    const dayName = DAY_NAMES[d.getUTCDay()]!;
    const isWorkDay = workDaySet.has(dayName);
    if (isWorkDay) scheduledHours += 8;

    const punches = (punchesByDay.get(dayKey(d)) ?? []).map((p) => ({
      punchType: p.punchType as PunchType,
      punchedAt: p.punchedAt,
    }));
    const r = calcDaily(d, schedule, punches);
    daily.push({
      date: new Date(d),
      workedMinutes: r.workedMinutes,
      lateMinutes: r.lateMinutes,
      earlyLeaveMinutes: r.earlyLeaveMinutes,
      hasShiftIn: r.hasShiftIn,
      hasShiftOut: r.hasShiftOut,
    });
    totalWorkedMin += r.workedMinutes;
    totalLateMin += r.lateMinutes;
    if (r.lateMinutes > 0) lateCount++;

    // Unauthorized absence: work day, no punches, no covering leave, not a paid holiday.
    if (isWorkDay && punches.length === 0) {
      const sameDayLeave = leave.find(
        (l) =>
          l.startDate.getTime() <= d.getTime() &&
          l.endDate.getTime() >= d.getTime(),
      );
      const sameDayHoliday = holidays.find(
        (h) => h.date.toISOString().slice(0, 10) === dayKey(d),
      );
      if (
        !sameDayHoliday &&
        (!sameDayLeave ||
          sameDayLeave.status === "unauthorized" ||
          sameDayLeave.status === "rejected")
      ) {
        unauthAbsenceDays++;
      }
    }
  }

  // Leave aggregations
  let sickDaysCertified = 0;
  let sickDaysUncertified = 0;
  let vacationDays = 0;
  for (const l of leave) {
    if (l.status === "certified_sick") sickDaysCertified += l.days;
    else if (l.status === "unauthorized") sickDaysUncertified += l.days;
    else if (l.status === "approved" && l.leaveType === "annual")
      vacationDays += l.days;
  }
  const holidayDays = holidays.filter((h) => h.isPaid).length;

  const workedHours = totalWorkedMin / 60;
  const overtimeHours = Math.max(0, workedHours - scheduledHours);
  const monthly = calcMonthly({
    monthlySalary: employee.monthlySalary,
    totalLateMinutes: totalLateMin,
    unauthAbsenceDays,
    overtimeHours,
  });

  const adjustmentsDjf = adjustments.reduce((s, a) => s + a.amountDjf, 0);
  const totalDeductions = monthly.lateDeductionDjf + monthly.absenceDeductionDjf;
  const totalAdditions = monthly.overtimeAmountDjf;
  const adjAddition = Math.max(0, adjustmentsDjf);
  const adjDeduction = Math.max(0, -adjustmentsDjf);

  return {
    employeeId: employee.id,
    fullName: employee.fullName,
    monthlySalary: employee.monthlySalary,
    workedHours: Math.round(workedHours * 100) / 100,
    scheduledHours,
    lateCount,
    lateMinutes: totalLateMin,
    lateDeductionDjf: monthly.lateDeductionDjf,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    overtimeAmountDjf: monthly.overtimeAmountDjf,
    sickDaysCertified,
    sickDaysUncertified,
    vacationDays,
    holidayDays,
    unauthAbsenceDays,
    unauthAbsenceDjf: monthly.absenceDeductionDjf,
    adjustmentsDjf,
    netDeductionDjf: totalDeductions + adjDeduction,
    netAdditionDjf: totalAdditions + adjAddition,
    daily,
  };
}

export async function computePeriodReport(args: {
  periodStart: Date;
  periodEnd: Date;
}): Promise<EmployeeReport[]> {
  const employees = await db.employee.findMany({
    where: { status: "active" },
    orderBy: { fullName: "asc" },
    select: { id: true },
  });
  return Promise.all(
    employees.map((e) =>
      computeEmployeeReport({
        employeeId: e.id,
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
      }),
    ),
  );
}
