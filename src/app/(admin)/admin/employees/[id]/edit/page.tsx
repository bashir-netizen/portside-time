import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateEmployeeAction } from "../../actions";
import { EmployeeEditForm } from "./EmployeeEditForm";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [employee, schedules] = await Promise.all([
    db.employee.findUnique({ where: { id } }),
    db.schedule.findMany({
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    }),
  ]);
  if (!employee) notFound();

  const bound = updateEmployeeAction.bind(null, employee.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Edit {employee.fullName}</h1>
      <EmployeeEditForm
        initial={{
          fullName: employee.fullName,
          position: employee.position,
          monthlySalary: employee.monthlySalary,
          defaultScheduleId: employee.defaultScheduleId,
        }}
        schedules={schedules}
        action={bound}
      />
    </div>
  );
}
