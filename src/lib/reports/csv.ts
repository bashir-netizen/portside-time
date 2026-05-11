import type { EmployeeReport } from "./compute";

/**
 * Combined CSV per CLAUDE.md §13. UTF-8 with BOM so Excel opens it cleanly.
 * One row per employee.
 */
export function renderCombinedCsv(args: {
  periodLabel: string;
  rows: EmployeeReport[];
}): string {
  const headers = [
    "Period",
    "Employee",
    "Monthly salary (DJF)",
    "Worked hours",
    "Scheduled hours",
    "Late count",
    "Late minutes",
    "Late deduction (DJF)",
    "Overtime hours",
    "Overtime amount (DJF)",
    "Sick days (certified)",
    "Sick days (uncertified)",
    "Vacation days",
    "Holiday days",
    "Unauthorized absence days",
    "Unauthorized absence deduction (DJF)",
    "Adjustments (DJF)",
    "Net deduction (DJF)",
    "Net addition (DJF)",
  ];

  const lines: string[] = [headers.map(escape).join(",")];
  for (const r of args.rows) {
    lines.push(
      [
        args.periodLabel,
        r.fullName,
        r.monthlySalary,
        r.workedHours,
        r.scheduledHours,
        r.lateCount,
        r.lateMinutes,
        r.lateDeductionDjf,
        r.overtimeHours,
        r.overtimeAmountDjf,
        r.sickDaysCertified,
        r.sickDaysUncertified,
        r.vacationDays,
        r.holidayDays,
        r.unauthAbsenceDays,
        r.unauthAbsenceDjf,
        r.adjustmentsDjf,
        r.netDeductionDjf,
        r.netAdditionDjf,
      ]
        .map(String)
        .map(escape)
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

function escape(s: string): string {
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
