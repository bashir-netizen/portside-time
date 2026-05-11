import Link from "next/link";
import { db } from "@/lib/db";
import {
  formatDate,
  formatTime,
  parseYmdInDjibouti,
  todayYmd,
} from "@/lib/time";
import { PUNCH_LABELS, type PunchType } from "@/lib/punch/types";
import { PunchRowActions } from "./PunchRowActions";
import { AddPunchForm } from "./AddPunchForm";

export default async function PunchesPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string; date?: string }>;
}) {
  const { employee: employeeId, date } = await searchParams;
  const ymd = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayYmd();
  const start = parseYmdInDjibouti(ymd);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const employees = await db.employee.findMany({
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });
  const nameById = new Map(employees.map((e) => [e.id, e.fullName]));

  const raw = await db.punch.findMany({
    where: {
      punchedAt: { gte: start, lt: end },
      ...(employeeId ? { employeeId } : {}),
    },
    orderBy: [{ employeeId: "asc" }, { punchedAt: "asc" }],
    include: {
      corrections: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Punches</h1>

      <form className="flex flex-wrap gap-2 text-sm" action="/admin/punches">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Employee</span>
          <select
            name="employee"
            defaultValue={employeeId ?? ""}
            className="rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">All</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Day (Djibouti)</span>
          <input
            type="date"
            name="date"
            defaultValue={ymd}
            className="rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="self-end rounded-md bg-zinc-900 px-3 py-1.5 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Filter
        </button>
      </form>

      <p className="text-xs text-zinc-500">
        {formatDate(start)} · {raw.length} punches
      </p>

      <details className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          Add a missing punch
        </summary>
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <AddPunchForm employees={employees} defaultDate={ymd} />
        </div>
      </details>

      <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Employee</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {raw.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                  No punches on this day.
                </td>
              </tr>
            )}
            {raw.map((p) => {
              const c = p.corrections[0];
              const voided = c?.correctionType === "void";
              const editedTime =
                c?.correctionType === "edit" && c.newPunchedAt
                  ? c.newPunchedAt
                  : null;
              const effectiveTime = editedTime ?? p.punchedAt;
              return (
                <tr
                  key={p.id}
                  className={voided ? "opacity-50 line-through" : ""}
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/employees/${p.employeeId}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {nameById.get(p.employeeId) ?? p.employeeId.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {PUNCH_LABELS[p.punchType as PunchType]}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums">
                    {formatTime(effectiveTime)}
                    {editedTime && c?.originalPunchedAt && (
                      <span className="ml-2 text-xs text-zinc-500 line-through">
                        {formatTime(c.originalPunchedAt)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {voided ? (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 dark:bg-red-950 dark:text-red-300">
                        voided
                      </span>
                    ) : p.isCorrected ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        corrected
                      </span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {!voided && (
                      <PunchRowActions
                        punchId={p.id}
                        currentTime={effectiveTime.toISOString()}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
