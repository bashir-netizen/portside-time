import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatDjf } from "@/lib/time";
import { toggleEmployeeStatusAction } from "../actions";
import { ResetPinButton } from "./ResetPinButton";

export default async function EmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await db.employee.findUnique({
    where: { id },
    include: { defaultSchedule: true },
  });
  if (!employee) notFound();

  const toggleBound = toggleEmployeeStatusAction.bind(null, employee.id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{employee.fullName}</h1>
        <p className="text-sm text-zinc-500">{employee.position}</p>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-zinc-500">Status</dt>
          <dd className="font-medium capitalize">{employee.status}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Hire date</dt>
          <dd className="font-medium">{formatDate(employee.hireDate)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Schedule</dt>
          <dd className="font-medium">{employee.defaultSchedule.label}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Monthly salary</dt>
          <dd className="font-medium tabular-nums">
            {formatDjf(employee.monthlySalary)} DJF
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Annual leave balance</dt>
          <dd className="font-medium">
            {employee.annualLeaveBalanceDays.toFixed(1)} days
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">PIN set</dt>
          <dd className="font-medium">{employee.pinHash ? "Yes" : "No"}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/employees/${employee.id}/edit`}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Edit profile
        </Link>
        <ResetPinButton employeeId={employee.id} />
        <form action={toggleBound}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700"
          >
            {employee.status === "active" ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </div>
    </div>
  );
}
