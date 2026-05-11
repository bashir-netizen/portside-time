import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ScheduleForm } from "../../ScheduleForm";
import { updateScheduleAction } from "../../actions";

export default async function EditSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const schedule = await db.schedule.findUnique({ where: { id } });
  if (!schedule) notFound();

  const bound = updateScheduleAction.bind(null, schedule.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Edit schedule</h1>
      <ScheduleForm
        initial={{
          id: schedule.id,
          label: schedule.label,
          shiftStart: schedule.shiftStart,
          lunchStart: schedule.lunchStart,
          lunchEnd: schedule.lunchEnd,
          shiftEnd: schedule.shiftEnd,
          workDays: JSON.parse(schedule.workDays) as string[],
        }}
        action={bound}
        submitLabel="Save changes"
      />
    </div>
  );
}
