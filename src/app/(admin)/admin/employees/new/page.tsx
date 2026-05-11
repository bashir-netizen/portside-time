import { db } from "@/lib/db";
import { todayYmd } from "@/lib/time";
import { EmployeeCreateForm } from "./EmployeeCreateForm";

export default async function NewEmployeePage() {
  const schedules = await db.schedule.findMany({
    select: { id: true, label: true },
    orderBy: { label: "asc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">New employee</h1>
      <EmployeeCreateForm
        schedules={schedules}
        defaultScheduleId={schedules[0]?.id ?? ""}
        today={todayYmd()}
      />
    </div>
  );
}
