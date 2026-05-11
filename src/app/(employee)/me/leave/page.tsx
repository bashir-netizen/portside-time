import { redirect } from "next/navigation";
import Link from "next/link";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/time";
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/schemas/leave";
import { accruedDaysSinceHire } from "@/lib/leave/accrual";
import { RequestLeaveForm } from "./RequestLeaveForm";

export default async function MyLeavePage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "employee" || !session.employeeId) redirect("/admin");

  const [employee, requests] = await Promise.all([
    db.employee.findUnique({ where: { id: session.employeeId } }),
    db.leaveRequest.findMany({
      where: { employeeId: session.employeeId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  if (!employee) redirect("/login");

  // Accrual minus used annual days
  const accrued = accruedDaysSinceHire(employee.hireDate);
  const used = requests
    .filter((r) => r.leaveType === "annual" && r.status === "approved")
    .reduce((sum, r) => sum + r.days, 0);
  const remaining = Math.max(0, accrued - used);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-8">
      <div className="w-full max-w-md">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold">My leave</h1>
          <Link
            href="/me"
            className="text-xs text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            ← Back
          </Link>
        </header>

        <section className="mb-6 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Annual leave balance
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {remaining.toFixed(1)} days
          </p>
          <p className="text-xs text-zinc-500">
            Accrued {accrued.toFixed(1)} · Used {used.toFixed(1)}
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Request leave
          </h2>
          <RequestLeaveForm />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            My requests
          </h2>
          {requests.length === 0 ? (
            <p className="rounded-md border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
              No leave requests yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-0.5 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {LEAVE_TYPE_LABELS[r.leaveType as LeaveType]}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {formatDate(r.startDate)} → {formatDate(r.endDate)} ·{" "}
                    {r.days} day{r.days === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
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
