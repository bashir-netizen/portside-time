import { db } from "@/lib/db";
import { formatDate, formatDjf } from "@/lib/time";
import { periodWindow } from "@/lib/reports/period";
import { NewAdjustmentForm } from "./NewAdjustmentForm";

export default async function AdjustmentsPage() {
  const [employees, lockedPeriods, adjustments] = await Promise.all([
    db.employee.findMany({
      where: { status: "active" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    db.monthlyReport.findMany({
      where: { locked: true },
      orderBy: { periodStart: "desc" },
      distinct: ["periodStart"],
      select: { periodStart: true },
    }),
    db.adjustment.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const empById = new Map(employees.map((e) => [e.id, e.fullName]));
  const periodOptions = lockedPeriods.map((p) => {
    const ymd = p.periodStart.toISOString().slice(0, 10);
    return { ymd, label: periodWindow(ymd).label };
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Adjustments</h1>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Use adjustments to correct things that surface after a month is locked.
        The amount lands on the *current* open period's report. The locked file
        is never modified.
      </p>

      <details className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          Record an adjustment
        </summary>
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <NewAdjustmentForm
            employees={employees}
            periods={periodOptions}
          />
        </div>
      </details>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Recent adjustments
        </h2>
        {adjustments.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-800">
            No adjustments yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white text-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {adjustments.map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {empById.get(a.employeeId) ?? a.employeeId.slice(0, 8)}
                  </span>
                  <span
                    className={
                      "tabular-nums " +
                      (a.amountDjf >= 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300")
                    }
                  >
                    {a.amountDjf >= 0 ? "+" : "-"}{formatDjf(Math.abs(a.amountDjf))} DJF
                  </span>
                </div>
                <span className="text-xs text-zinc-500">
                  Applies to {formatDate(a.appliesToPeriodStart)} ·{" "}
                  {a.appliedInPeriodStart
                    ? `applied in ${formatDate(a.appliedInPeriodStart)}`
                    : "not yet applied"}
                </span>
                <span className="text-xs italic text-zinc-700 dark:text-zinc-300">
                  {a.reason}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
