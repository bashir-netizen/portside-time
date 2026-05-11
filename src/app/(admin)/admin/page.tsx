import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime, formatTime } from "@/lib/time";
import { djiboutiDayWindow } from "@/lib/punch/window";
import { dayStatus } from "@/lib/punch/sequence";
import type { PunchType } from "@/lib/punch/types";

export default async function AdminDashboard() {
  const { start, end } = djiboutiDayWindow();

  const [employees, todaysPunches, devices, pendingIps, recentAudit] =
    await Promise.all([
      db.employee.findMany({
        where: { status: "active" },
        orderBy: { fullName: "asc" },
      }),
      db.punch.findMany({
        where: { punchedAt: { gte: start, lt: end } },
        orderBy: { punchedAt: "asc" },
      }),
      db.device.count({ where: { status: "approved" } }),
      db.pendingIp.count({ where: { status: "open" } }),
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  // Bucket today's punches per employee
  const byEmployee = new Map<
    string,
    { punches: { type: PunchType; at: Date }[] }
  >();
  for (const e of employees) byEmployee.set(e.id, { punches: [] });
  for (const p of todaysPunches) {
    const bucket = byEmployee.get(p.employeeId);
    if (!bucket) continue;
    bucket.punches.push({ type: p.punchType as PunchType, at: p.punchedAt });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <Card label="Active employees" value={employees.length} />
        <Card label="Approved devices" value={devices} />
        <Card label="Pending IPs" value={pendingIps} accent={pendingIps > 0} />
        <Card
          label="Punches today"
          value={todaysPunches.length}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Who's in now
        </h2>
        <ul className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {employees.length === 0 && (
            <li className="px-4 py-3 text-sm text-zinc-500">
              No active employees.
            </li>
          )}
          {employees.map((e) => {
            const bucket = byEmployee.get(e.id)!;
            const types = bucket.punches.map((p) => p.type);
            const status = dayStatus(types);
            const last = bucket.punches.at(-1) ?? null;
            return (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <Link
                  href={`/admin/employees/${e.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {e.fullName}
                </Link>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  {last && (
                    <span className="hidden sm:inline">
                      last: {last.type.replace("_", " ")} at{" "}
                      {formatTime(last.at)}
                    </span>
                  )}
                  <StatusPill status={status} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Recent activity
        </h2>
        {recentAudit.length === 0 ? (
          <p className="text-sm text-zinc-500">No activity yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {recentAudit.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-0.5 px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
              >
                <span className="font-medium">{row.action}</span>
                <span className="text-xs text-zinc-500">
                  {row.entityType ? `${row.entityType} · ` : ""}
                  {formatDateTime(row.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/admin/audit"
          className="self-start text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          View full audit log →
        </Link>
      </section>
    </div>
  );
}

function Card({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "flex flex-col gap-1 rounded-md border bg-white p-4 dark:bg-zinc-950 " +
        (accent
          ? "border-amber-300 dark:border-amber-700"
          : "border-zinc-200 dark:border-zinc-800")
      }
    >
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: ReturnType<typeof dayStatus> }) {
  const config: Record<
    ReturnType<typeof dayStatus>,
    { label: string; className: string }
  > = {
    not_started: {
      label: "absent",
      className:
        "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    },
    working: {
      label: "in",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    },
    on_lunch: {
      label: "lunch",
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    },
    back_from_lunch: {
      label: "in",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    },
    finished: {
      label: "out",
      className:
        "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    },
  };
  const c = config[status];
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
        c.className
      }
    >
      {c.label}
    </span>
  );
}
