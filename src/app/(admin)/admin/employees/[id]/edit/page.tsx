import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { updateEmployeeAction } from "../../actions";
import { EmployeeEditForm } from "./EmployeeEditForm";

const TZ = "Africa/Djibouti";

export const metadata = { title: "Edit employee — Portside Time" };

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [employee, schedules, templates] = await Promise.all([
    db.employee.findUnique({ where: { id } }),
    db.schedule.findMany({
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    }),
    db.scheduleTemplate.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!employee) notFound();

  const bound = updateEmployeeAction.bind(null, employee.id);

  return (
    <div className="flex flex-col gap-7">
      <div className="label-eyebrow flex items-center gap-1.5">
        <Link href="/admin" className="hover:text-foreground">Admin</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href="/admin/employees" className="hover:text-foreground">Employees</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link
          href={`/admin/employees/${employee.id}`}
          className="hover:text-foreground"
        >
          {employee.fullName}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span>Edit</span>
      </div>

      <header>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Edit {employee.fullName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every field is editable, including the hire date. Changes are
          audit-logged with before/after snapshots — editing the hire date
          immediately adjusts the accrued-leave calculation (Article 99).
        </p>
      </header>

      <Card className="bg-card p-5 md:p-6">
        <EmployeeEditForm
          initial={{
            fullName: employee.fullName,
            position: employee.position,
            monthlySalary: employee.monthlySalary,
            hireDate: formatInTimeZone(employee.hireDate, TZ, "yyyy-MM-dd"),
            defaultScheduleId: employee.defaultScheduleId,
            defaultScheduleTemplateId:
              employee.defaultScheduleTemplateId ?? "",
          }}
          schedules={schedules}
          templates={templates}
          action={bound}
        />
      </Card>
    </div>
  );
}
