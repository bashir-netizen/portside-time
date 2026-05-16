import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, History, CalendarClock } from "lucide-react";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatInTimeZone } from "date-fns-tz";
import { getTodaysPunches } from "@/lib/punch/repo";
import { djiboutiDayWindow } from "@/lib/punch/window";
import { nextPunchType, dayStatus } from "@/lib/punch/sequence";
import { PUNCH_LABELS, type PunchType, type DayStatus } from "@/lib/punch/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SequenceRibbon } from "@/components/employee/sequence-ribbon";
import { PunchButton } from "./PunchButton";

const TZ = "Africa/Djibouti";

export default async function MePage() {
  const session = await readSession();
  if (!session?.employeeId || session.role !== "employee") redirect("/login");

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
    take: 6,
    select: { id: true, punchType: true, punchedAt: true },
  });

  const greeting = greetingForHour(
    Number(formatInTimeZone(new Date(), TZ, "H"))
  );

  return (
    <div className="flex flex-col gap-7">
      {/* Greeting + status pill */}
      <header className="flex flex-col gap-1.5">
        <div className="label-eyebrow">{greeting}</div>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-3xl tracking-tight md:text-4xl">
            {employee.fullName.split(" ")[0]}
          </h1>
          <StatusBadge status={status} />
        </div>
      </header>

      {/* Today's sequence — the visible 4-step ribbon answering
          "where am I in the day?" */}
      <section aria-label="Today's punch sequence" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl tracking-tight">
            Today
          </h2>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {employee.defaultSchedule.label}
          </span>
        </div>
        <SequenceRibbon todaysPunches={todays} timezone={TZ} />
      </section>

      {/* Hero punch button — the one action that matters most */}
      <section aria-label="Next punch">
        <PunchButton nextPunch={next} />
      </section>

      {/* Today's schedule strip */}
      <ScheduleStrip
        scheduleLabel={employee.defaultSchedule.label}
        shiftStart={employee.defaultSchedule.shiftStart}
        lunchStart={employee.defaultSchedule.lunchStart}
        lunchEnd={employee.defaultSchedule.lunchEnd}
        shiftEnd={employee.defaultSchedule.shiftEnd}
      />

      {/* Recent activity */}
      {recent.length > 0 ? (
        <section aria-label="Recent activity" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-xl tracking-tight">Recent</h2>
            </div>
            <Link
              href="/me/schedule"
              className="label-eyebrow hover:text-foreground"
            >
              View week
              <ChevronRight className="ml-0.5 inline-block h-3 w-3" />
            </Link>
          </div>
          <Card className="bg-card p-0">
            <ul className="divide-y divide-border">
              {recent.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="text-foreground">
                    {PUNCH_LABELS[p.punchType as PunchType]}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {formatInTimeZone(p.punchedAt, TZ, "EEE d LLL · HH:mm")}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: DayStatus }) {
  switch (status) {
    case "not_started":
      return (
        <Badge
          variant="outline"
          className="border-border bg-card font-mono text-[10px] uppercase tracking-wider"
        >
          Not started
        </Badge>
      );
    case "working":
      return (
        <Badge className="border-[var(--brass)]/30 bg-[var(--brass)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--brass)] hover:bg-[var(--brass)]/15">
          Working
        </Badge>
      );
    case "on_lunch":
      return (
        <Badge className="border-[var(--warning)]/30 bg-[var(--warning)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--foreground)] hover:bg-[var(--warning)]/15">
          On lunch
        </Badge>
      );
    case "back_from_lunch":
      return (
        <Badge className="border-[var(--brass)]/30 bg-[var(--brass)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--brass)] hover:bg-[var(--brass)]/15">
          Working
        </Badge>
      );
    case "finished":
      return (
        <Badge className="border-[var(--success)]/30 bg-[var(--success)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--success)] hover:bg-[var(--success)]/15">
          Finished
        </Badge>
      );
  }
}

function ScheduleStrip({
  scheduleLabel,
  shiftStart,
  lunchStart,
  lunchEnd,
  shiftEnd,
}: {
  scheduleLabel: string;
  shiftStart: string;
  lunchStart: string;
  lunchEnd: string;
  shiftEnd: string;
}) {
  return (
    <section aria-label="Today's expected schedule" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-xl tracking-tight">Schedule</h2>
        <span className="ml-auto label-eyebrow">{scheduleLabel}</span>
      </div>
      <Card className="bg-card p-0">
        <div className="grid grid-cols-4 divide-x divide-border">
          <Block eyebrow="Start" time={shiftStart} />
          <Block eyebrow="Lunch out" time={lunchStart} />
          <Block eyebrow="Lunch in" time={lunchEnd} />
          <Block eyebrow="End" time={shiftEnd} />
        </div>
      </Card>
    </section>
  );
}

function Block({ eyebrow, time }: { eyebrow: string; time: string }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3 text-center">
      <span className="label-eyebrow !text-[0.625rem]">{eyebrow}</span>
      <span className="font-mono text-lg font-medium text-foreground tabular-nums">
        {time}
      </span>
    </div>
  );
}

function greetingForHour(h: number): string {
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
