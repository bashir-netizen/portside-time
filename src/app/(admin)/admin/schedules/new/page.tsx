import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScheduleForm } from "../ScheduleForm";
import { createScheduleAction } from "../actions";

export const metadata = { title: "New schedule — Portside Time" };

export default function NewSchedulePage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="label-eyebrow flex items-center gap-1.5">
        <Link href="/admin" className="hover:text-foreground">Admin</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href="/admin/schedules" className="hover:text-foreground">Schedules</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span>New</span>
      </div>

      <header>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          New schedule
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define one work-day pattern that gets applied to employees on this
          template. Times in HH:mm, 24-hour, Africa/Djibouti.
        </p>
      </header>

      <Card className="bg-card p-5 md:p-6">
        <ScheduleForm
          initial={{
            label: "",
            shiftStart: "08:00",
            lunchStart: "12:00",
            lunchEnd: "13:00",
            shiftEnd: "17:00",
            workDays: ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"],
          }}
          action={createScheduleAction}
          submitLabel="Create schedule"
        />
      </Card>
    </div>
  );
}
