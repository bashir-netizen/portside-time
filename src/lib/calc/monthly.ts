import {
  MONTHLY_HOURS_BASE,
  OVERTIME_PREMIUM,
  WORKING_DAYS_PER_MONTH,
} from "./constants";

export type MonthlyInputs = {
  monthlySalary: number; // DJF, whole
  totalLateMinutes: number;
  unauthAbsenceDays: number;
  overtimeHours: number;
  nightOvertimeHours?: number;
};

export type MonthlyResult = {
  perMinuteRate: number;
  perDayRate: number;
  hourlyRate: number;
  lateDeductionDjf: number;
  absenceDeductionDjf: number;
  overtimeAmountDjf: number;
};

/**
 * Pay-relevant figures for one month per employee. Spec §12.
 *
 * Rounding rule: nearest whole DJF.
 */
export function calcMonthly(input: MonthlyInputs): MonthlyResult {
  const perMinuteRate = input.monthlySalary / MONTHLY_HOURS_BASE / 60;
  const perDayRate = input.monthlySalary / WORKING_DAYS_PER_MONTH;
  const hourlyRate = input.monthlySalary / MONTHLY_HOURS_BASE;

  const lateDeductionDjf = Math.round(input.totalLateMinutes * perMinuteRate);
  const absenceDeductionDjf = Math.round(input.unauthAbsenceDays * perDayRate);

  const baseOt = input.overtimeHours * hourlyRate * OVERTIME_PREMIUM;
  const nightOt =
    (input.nightOvertimeHours ?? 0) * hourlyRate * 1.75; // NIGHT_OVERTIME_PREMIUM
  const overtimeAmountDjf = Math.round(baseOt + nightOt);

  return {
    perMinuteRate,
    perDayRate,
    hourlyRate,
    lateDeductionDjf,
    absenceDeductionDjf,
    overtimeAmountDjf,
  };
}
