import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { logoutAction } from "@/app/login/actions";
import { formatDate, formatTime } from "@/lib/time";
import { getTodaysPunches } from "@/lib/punch/repo";
import { djiboutiDayWindow } from "@/lib/punch/window";
import { nextPunchType, dayStatus } from "@/lib/punch/sequence";
import { PUNCH_LABELS, type PunchType } from "@/lib/punch/types";
import { PunchButton } from "./PunchButton";

export default async function MePage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "employee") redirect("/admin");
  if (!session.employeeId) redirect("/login");

  const [employee, todays] = await Promise.all([
    db.employee.findUnique({
      where: { id: session.employeeId },
      include: { defaultSchedule: true },
    }),
    getTodaysPunches(session.employeeId),
  ]);
  if (!employee) redirect("/login");

  const typesToday = todays.map((p) => p.punchType);
  const next = nextPunchType(typesToday);
  const status = dayStatus(typesToday);

  const { start } = djiboutiDayWindow();
  const recent = await db.punch.findMany({
    where: {
      employeeId: session.employeeId,
      punchedAt: { lt: start },
    },
    orderBy: { punchedAt: "desc" },
    take: 12,
  });

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-8">
      <div className="w-full max-w-md">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{employee.fullName}</h1>
            <p className="text-xs text-zinc-500">
              {formatDate(new Date())} · {employee.defaultSchedule.label}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-xs text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="mb-6 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Status
          </p>
          <p className="text-base font-medium">
            <StatusLabel status={status} />
          </p>
          {todays.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {todays.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{PUNCH_LABELS[p.punchType]}</span>
                  <span className="font-mono tabular-nums text-zinc-500">
                    {formatTime(p.punchedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-6">
          <PunchButton nextPunch={next} />
        </section>

        {recent.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-xs uppercase tracking-wider text-zinc-500">
              Recent activity
            </h2>
            <ul className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
              {recent.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span>{PUNCH_LABELS[p.punchType as PunchType]}</span>
                  <span className="font-mono tabular-nums text-xs text-zinc-500">
                    {formatDate(p.punchedAt)} · {formatTime(p.punchedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function StatusLabel({
  status,
}: {
  status: ReturnType<typeof dayStatus>;
}) {
  switch (status) {
    case "not_started":
      return <>Not punched in yet</>;
    case "working":
      return <>Working</>;
    case "on_lunch":
      return <>On lunch</>;
    case "back_from_lunch":
      return <>Working (after lunch)</>;
    case "finished":
      return <>Shift finished</>;
  }
}
