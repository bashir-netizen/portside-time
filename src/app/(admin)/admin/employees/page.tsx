import Link from "next/link";
import { db } from "@/lib/db";
import { formatDjf } from "@/lib/time";

export default async function EmployeesPage() {
  const employees = await db.employee.findMany({
    orderBy: [{ status: "asc" }, { fullName: "asc" }],
    include: { defaultSchedule: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Employees</h1>
        <Link
          href="/admin/employees/new"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          New employee
        </Link>
      </header>

      <ul className="md:hidden flex flex-col gap-2">
        {employees.map((e) => (
          <li
            key={e.id}
            className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <Link
              href={`/admin/employees/${e.id}`}
              className="flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{e.fullName}</span>
                <StatusPill status={e.status} />
              </div>
              <span className="text-xs text-zinc-500">{e.position}</span>
              <span className="text-xs text-zinc-500">
                {e.defaultSchedule.label}
                {" · "}
                {formatDjf(e.monthlySalary)} DJF/mo
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden md:block overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Position</th>
              <th className="px-4 py-2">Schedule</th>
              <th className="px-4 py-2 text-right">Salary (DJF)</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {employees.map((e) => (
              <tr key={e.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <td className="px-4 py-2 font-medium">
                  <Link href={`/admin/employees/${e.id}`}>{e.fullName}</Link>
                </td>
                <td className="px-4 py-2">{e.position}</td>
                <td className="px-4 py-2">{e.defaultSchedule.label}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatDjf(e.monthlySalary)}
                </td>
                <td className="px-4 py-2">
                  <StatusPill status={e.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
        (status === "active"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")
      }
    >
      {status}
    </span>
  );
}
