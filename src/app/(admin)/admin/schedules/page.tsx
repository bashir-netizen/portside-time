import Link from "next/link";
import { db } from "@/lib/db";

export default async function SchedulesPage() {
  const schedules = await db.schedule.findMany({ orderBy: { label: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Schedules</h1>
        <Link
          href="/admin/schedules/new"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          New schedule
        </Link>
      </header>

      <ul className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
        {schedules.map((s) => {
          const days = JSON.parse(s.workDays) as string[];
          return (
            <li key={s.id}>
              <Link
                href={`/admin/schedules/${s.id}/edit`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <span>
                  <span className="block font-medium">{s.label}</span>
                  <span className="block text-xs text-zinc-500">
                    {s.shiftStart}–{s.lunchStart} · {s.lunchEnd}–{s.shiftEnd}
                    {" · "}
                    {days.join(", ")}
                  </span>
                </span>
                <span aria-hidden className="text-zinc-400">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
