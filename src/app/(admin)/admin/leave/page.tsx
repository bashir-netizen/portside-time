import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/time";
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/schemas/leave";
import { DecideButtons } from "./DecideButtons";
import { NewLeaveForm } from "./NewLeaveForm";

export default async function LeavePage() {
  const [pending, recent, employees] = await Promise.all([
    db.leaveRequest.findMany({
      where: { status: { in: ["pending", "pending_certificate"] } },
      orderBy: { createdAt: "desc" },
      include: { employee: { select: { fullName: true } } },
    }),
    db.leaveRequest.findMany({
      where: { status: { notIn: ["pending", "pending_certificate"] } },
      orderBy: { decidedAt: "desc" },
      take: 20,
      include: { employee: { select: { fullName: true } } },
    }),
    db.employee.findMany({
      where: { status: "active" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Leave</h1>
        <Link
          href="/admin/holidays"
          className="text-sm font-medium underline-offset-2 hover:underline"
        >
          Holiday calendar →
        </Link>
      </header>

      <details className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          Record a leave entry (admin-initiated)
        </summary>
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <NewLeaveForm employees={employees} />
        </div>
      </details>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Pending decisions
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-800">
            Nothing waiting on you.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((p) => (
              <li
                key={p.id}
                className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{p.employee.fullName}</span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {LEAVE_TYPE_LABELS[p.leaveType as LeaveType]} ·{" "}
                    {p.days} day{p.days === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  {formatDate(p.startDate)} → {formatDate(p.endDate)}
                </div>
                {p.notes && (
                  <p className="mt-1 text-xs italic text-zinc-700 dark:text-zinc-300">
                    {p.notes}
                  </p>
                )}
                <div className="mt-2">
                  <DecideButtons request={p} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Recently decided
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-zinc-500">No recent decisions.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white text-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {recent.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-0.5 px-3 py-2 md:flex-row md:items-center md:justify-between"
              >
                <span>
                  <span className="font-medium">{r.employee.fullName}</span>
                  {" · "}
                  {LEAVE_TYPE_LABELS[r.leaveType as LeaveType]}
                  {" · "}
                  {formatDate(r.startDate)} → {formatDate(r.endDate)}
                </span>
                <span className="text-xs text-zinc-500">
                  <StatusBadge status={r.status} />
                  {r.decidedAt && (
                    <> · {formatDateTime(r.decidedAt)}</>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    cancelled: "bg-zinc-200 text-zinc-700",
    certified_sick: "bg-emerald-100 text-emerald-700",
    unauthorized: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
    pending_certificate: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-zinc-200 text-zinc-700"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
