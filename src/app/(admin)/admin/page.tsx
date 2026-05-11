import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";

export default async function AdminDashboard() {
  const [employees, devices, pendingIps, recentAudit] = await Promise.all([
    db.employee.count({ where: { status: "active" } }),
    db.device.count({ where: { status: "approved" } }),
    db.pendingIp.count({ where: { status: "open" } }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <Card label="Active employees" value={employees} />
        <Card label="Approved devices" value={devices} />
        <Card label="Pending IPs" value={pendingIps} accent={pendingIps > 0} />
        <Card label="Audit events (recent)" value={recentAudit.length} />
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

      <section className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Punching, calculation, leave, and monthly reports are coming in Phase 2.
        Phase 1 covers auth + device approval + IP allowlist + employee CRUD.
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
