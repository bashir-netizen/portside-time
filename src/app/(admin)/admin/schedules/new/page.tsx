import { ScheduleForm } from "../ScheduleForm";
import { createScheduleAction } from "../actions";

export default function NewSchedulePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">New schedule</h1>
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
    </div>
  );
}
