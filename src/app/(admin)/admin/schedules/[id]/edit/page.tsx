import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ScheduleForm } from "../../ScheduleForm";
import { updateScheduleAction } from "../../actions";

export const metadata = { title: "Edit schedule — Portside Time" };

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
    <div className="flex flex-col gap-7">
      <div className="label-eyebrow flex items-center gap-1.5">
        <Link href="/admin" className="hover:text-foreground">Admin</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href="/admin/schedules" className="hover:text-foreground">Schedules</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span>{schedule.label}</span>
      </div>

      <header>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Edit schedule
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
          {schedule.label} · {schedule.shiftStart}–{schedule.shiftEnd}
        </p>
      </header>

      <Card className="bg-card p-5 md:p-6">
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
      </Card>
    </div>
  );
}
