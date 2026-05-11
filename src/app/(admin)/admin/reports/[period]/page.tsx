import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { computePeriodReport } from "@/lib/reports/compute";
import { periodWindow } from "@/lib/reports/period";
import { formatDjf, formatDateTime } from "@/lib/time";
import { lockAndExportAction } from "../actions";

export default async function ReviewPeriodPage({
  params,
}: {
  params: Promise<{ period: string }>;
}) {
  const { period: periodYmd } = await params;
  if (!/^\d{4}-\d{2}-01$/.test(periodYmd)) notFound();
  const period = periodWindow(periodYmd);

  // If locked, show the persisted rows.
  const persisted = await db.monthlyReport.findMany({
    where: { periodStart: period.start },
    include: { employee: { select: { fullName: true } } },
    orderBy: { employee: { fullName: "asc" } },
  });
  const locked = persisted.length > 0 && persisted.every((r) => r.locked);

  const rows = locked
    ? persisted.map((r) => ({
        employeeId: r.employeeId,
        fullName: r.employee.fullName,
        workedHours: r.workedHours,
        scheduledHours: r.scheduledHours,
        lateMinutes: r.lateMinutes,
        lateDeductionDjf: r.lateDeductionDjf,
        overtimeHours: r.overtimeHours,
        overtimeAmountDjf: r.overtimeAmountDjf,
        unauthAbsenceDays: r.unauthAbsenceDays,
        unauthAbsenceDjf: r.unauthAbsenceDjf,
        vacationDays: r.vacationDays,
        sickDaysCertified: r.sickDaysCertified,
        sickDaysUncertified: r.sickDaysUncertified,
        holidayDays: r.holidayDays,
        adjustmentsDjf: r.adjustmentsDjf,
        netDeductionDjf: r.netDeductionDjf,
        netAdditionDjf: r.netAdditionDjf,
      }))
    : await computePeriodReport({
        periodStart: period.start,
        periodEnd: period.end,
      });

  const lockedAt = persisted[0]?.lockedAt ?? null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{period.label}</h1>
        {locked ? (
          <p className="text-xs text-zinc-500">
            Locked {lockedAt ? formatDateTime(lockedAt) : ""}.{" "}
            <a
              href={`/api/exports/${periodYmd}/zip`}
              className="font-medium underline-offset-2 hover:underline"
            >
              Download ZIP →
            </a>
          </p>
        ) : (
          <p className="text-xs text-zinc-500">
            Preview — review before locking. Locked periods are immutable.
          </p>
        )}
      </header>

      <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Employee</th>
              <th className="px-3 py-2 text-right">Worked h</th>
              <th className="px-3 py-2 text-right">Late min</th>
              <th className="px-3 py-2 text-right">Late DJF</th>
              <th className="px-3 py-2 text-right">OT h</th>
              <th className="px-3 py-2 text-right">OT DJF</th>
              <th className="px-3 py-2 text-right">Absent d</th>
              <th className="px-3 py-2 text-right">Absent DJF</th>
              <th className="px-3 py-2 text-right">Adj DJF</th>
              <th className="px-3 py-2 text-right">Net − DJF</th>
              <th className="px-3 py-2 text-right">Net + DJF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.employeeId}>
                <td className="px-3 py-2 font-medium">{r.fullName}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.workedHours.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.lateMinutes}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatDjf(r.lateDeductionDjf)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.overtimeHours.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatDjf(r.overtimeAmountDjf)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.unauthAbsenceDays}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatDjf(r.unauthAbsenceDjf)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatDjf(r.adjustmentsDjf)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-red-700 dark:text-red-300">
                  {formatDjf(r.netDeductionDjf)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatDjf(r.netAdditionDjf)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!locked && (
        <form action={lockAndExportAction} className="self-start">
          <input type="hidden" name="period" value={periodYmd} />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Lock & Export
          </button>
          <p className="mt-2 text-xs text-zinc-500">
            After locking, this period is read-only. Mistakes go through the
            adjustments flow.
          </p>
        </form>
      )}
    </div>
  );
}
