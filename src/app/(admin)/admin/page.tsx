import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatTime } from "@/lib/time";
import { djiboutiDayWindow } from "@/lib/punch/window";
import { dayStatus } from "@/lib/punch/sequence";
import type { PunchType } from "@/lib/punch/types";

export default async function AdminDashboard() {
  const { start: dayStart, end: dayEnd } = djiboutiDayWindow();
  // Week window: 6 days back to today (Djibouti).
  const weekStart = new Date(dayStart.getTime() - 5 * 24 * 60 * 60 * 1000);

  const [
    employees,
    todaysPunches,
    weekPunches,
    pendingLeave,
    pendingIps,
    blockedAttempts,
  ] = await Promise.all([
    db.employee.findMany({
      where: { status: "active" },
      orderBy: { fullName: "asc" },
    }),
    db.punch.findMany({
      where: { punchedAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { punchedAt: "asc" },
      include: { corrections: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    db.punch.findMany({
      where: { punchedAt: { gte: weekStart, lt: dayEnd } },
      select: { employeeId: true, punchedAt: true, punchType: true },
    }),
    db.leaveRequest.count({
      where: { status: { in: ["pending", "pending_certificate"] } },
    }),
    db.pendingIp.count({ where: { status: "open" } }),
    db.auditLog.count({
      where: {
        action: { in: ["punch_blocked", "employee_login_blocked"] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  // Today's status per employee (effective times)
  const todayByEmp = new Map<string, { type: PunchType; at: Date }[]>();
  for (const e of employees) todayByEmp.set(e.id, []);
  for (const p of todaysPunches) {
    const c = p.corrections[0];
    if (c?.correctionType === "void") continue;
    const at =
      c?.correctionType === "edit" && c.newPunchedAt
        ? c.newPunchedAt
        : p.punchedAt;
    todayByEmp.get(p.employeeId)?.push({
      type: p.punchType as PunchType,
      at,
    });
  }

  // Heatmap rows: each employee × 6 days, showing worked-minute heat
  const dayMs = 24 * 60 * 60 * 1000;
  const days: Date[] = [];
  for (let i = 0; i < 6; i++) {
    days.push(new Date(weekStart.getTime() + i * dayMs));
  }
  const weekByEmpDay = new Map<string, Map<string, number>>();
  for (const e of employees)
    weekByEmpDay.set(e.id, new Map(days.map((d) => [keyOf(d), 0])));
  // crude minutes proxy: count punches as 240 if shift_in→lunch_out paired,
  // but we already have getEffectivePunches in step 9; for the heatmap we just
  // show punch count (saturation = activity)
  for (const p of weekPunches) {
    const m = weekByEmpDay.get(p.employeeId);
    if (!m) continue;
    const key = keyOf(p.punchedAt);
    m.set(key, (m.get(key) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <Card label="Active employees" value={employees.length} />
        <Card
          label="Pending leave"
          value={pendingLeave}
          accent={pendingLeave > 0}
        />
        <Card label="Pending IPs" value={pendingIps} accent={pendingIps > 0} />
        <Card
          label="Blocked attempts 24h"
          value={blockedAttempts}
          accent={blockedAttempts > 0}
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
            const punches = todayByEmp.get(e.id) ?? [];
            const types = punches.map((p) => p.type);
            const status = dayStatus(types);
            const last = punches.at(-1) ?? null;
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

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          This week
        </h2>
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left">Employee</th>
                {days.map((d) => (
                  <th key={keyOf(d)} className="px-2 py-2 text-center">
                    {formatDate(d).slice(0, 6)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2 font-medium">{e.fullName}</td>
                  {days.map((d) => {
                    const count = weekByEmpDay.get(e.id)?.get(keyOf(d)) ?? 0;
                    return (
                      <td key={keyOf(d)} className="px-2 py-2 text-center">
                        <HeatCell count={count} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500">
          Saturation = punches recorded that day. Click an employee for details.
        </p>
      </section>
    </div>
  );
}

function HeatCell({ count }: { count: number }) {
  const level = count === 0 ? 0 : Math.min(4, Math.ceil(count / 1));
  const colors = [
    "bg-zinc-100 dark:bg-zinc-900",
    "bg-emerald-100 dark:bg-emerald-950",
    "bg-emerald-200 dark:bg-emerald-900",
    "bg-emerald-300 dark:bg-emerald-800",
    "bg-emerald-500 dark:bg-emerald-700",
  ];
  return (
    <span
      title={`${count} punch${count === 1 ? "" : "es"}`}
      className={`inline-block size-6 rounded ${colors[level]}`}
    />
  );
}

function keyOf(d: Date): string {
  return d.toISOString().slice(0, 10);
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
