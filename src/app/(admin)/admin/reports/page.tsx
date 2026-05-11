import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/time";
import { currentPeriodYmd, periodWindow, previousPeriodYmd } from "@/lib/reports/period";

export default async function ReportsPage() {
  const current = currentPeriodYmd();
  const previous = previousPeriodYmd(current);
  const reports = await db.monthlyReport.findMany({
    orderBy: { periodStart: "desc" },
    select: {
      periodStart: true,
      locked: true,
      lockedAt: true,
      exportPath: true,
    },
    distinct: ["periodStart"],
  });
  const periodSet = new Set(
    reports.map((r) => r.periodStart.toISOString().slice(0, 10)),
  );

  const currentLabel = periodWindow(current).label;
  const previousLabel = periodWindow(previous).label;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Monthly reports</h1>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PeriodCard
          ymd={current}
          label={currentLabel}
          locked={false}
        />
        <PeriodCard
          ymd={previous}
          label={previousLabel}
          locked={Array.from(periodSet).some(
            (k) => k === periodWindow(previous).start.toISOString().slice(0, 10),
          )}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Locked periods
        </h2>
        {reports.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-800">
            No periods locked yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {reports
              .filter((r) => r.locked)
              .map((r) => {
                const ymd = r.periodStart.toISOString().slice(0, 10);
                const label = periodWindow(ymd).label;
                return (
                  <li
                    key={ymd}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <Link
                      href={`/admin/reports/${ymd}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {label}
                    </Link>
                    <span className="text-xs text-zinc-500">
                      Locked{" "}
                      {r.lockedAt ? formatDateTime(r.lockedAt) : "—"}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}

function PeriodCard({
  ymd,
  label,
  locked,
}: {
  ymd: string;
  label: string;
  locked: boolean;
}) {
  return (
    <Link
      href={`/admin/reports/${ymd}`}
      className="flex flex-col gap-1 rounded-md border border-zinc-200 bg-white p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
    >
      <span className="text-xs uppercase tracking-wider text-zinc-500">
        {locked ? "Locked" : "In progress"}
      </span>
      <span className="text-lg font-semibold">{label}</span>
      <span className="text-xs text-zinc-500">Review preview →</span>
    </Link>
  );
}
