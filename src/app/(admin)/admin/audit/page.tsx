import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const { action, page } = await searchParams;
  const pageNum = Math.max(1, Number(page ?? "1") || 1);

  const where = action ? { action } : {};
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Audit log</h1>

      <form className="flex gap-2 text-sm" action="/admin/audit">
        <input
          name="action"
          defaultValue={action ?? ""}
          placeholder="Filter by action (e.g. login_success)"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Filter
        </button>
      </form>

      <p className="text-xs text-zinc-500">
        Showing {rows.length} of {total} matching rows. Page {pageNum} of{" "}
        {totalPages}.
      </p>

      <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Check failed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatDateTime(row.createdAt)}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.action}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.entityType ?? "—"}
                  {row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ""}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.actorUserId
                    ? `user:${row.actorUserId.slice(0, 6)}…`
                    : row.actorEmployeeId
                      ? `emp:${row.actorEmployeeId.slice(0, 6)}…`
                      : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.sourceIp ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {row.checkFailed ? (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 dark:bg-red-950 dark:text-red-300">
                      {row.checkFailed}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-zinc-500"
                >
                  No matching rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="flex justify-between text-sm">
        <a
          href={`/admin/audit?${new URLSearchParams({
            action: action ?? "",
            page: String(Math.max(1, pageNum - 1)),
          })}`}
          aria-disabled={pageNum === 1}
          className={
            "rounded-md border border-zinc-200 px-3 py-1.5 dark:border-zinc-800 " +
            (pageNum === 1 ? "pointer-events-none opacity-50" : "")
          }
        >
          ← Previous
        </a>
        <a
          href={`/admin/audit?${new URLSearchParams({
            action: action ?? "",
            page: String(Math.min(totalPages, pageNum + 1)),
          })}`}
          aria-disabled={pageNum === totalPages}
          className={
            "rounded-md border border-zinc-200 px-3 py-1.5 dark:border-zinc-800 " +
            (pageNum === totalPages ? "pointer-events-none opacity-50" : "")
          }
        >
          Next →
        </a>
      </nav>
    </div>
  );
}
