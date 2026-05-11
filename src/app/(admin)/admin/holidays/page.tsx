import { db } from "@/lib/db";
import { formatDate } from "@/lib/time";
import { AddHolidayForm } from "./AddHolidayForm";
import { DeleteHolidayButton } from "./DeleteHolidayButton";

export default async function HolidaysPage() {
  const holidays = await db.holiday.findMany({ orderBy: { date: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Public holidays</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Add a holiday
        </h2>
        <AddHolidayForm />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Calendar
        </h2>
        {holidays.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-800">
            No holidays yet. Djibouti has ~10 national holidays per year.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {holidays.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-medium">{h.name}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {formatDate(h.date)}
                    {!h.isPaid && " · unpaid"}
                  </span>
                </span>
                <DeleteHolidayButton id={h.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
