import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  History,
  CalendarClock,
  Sun,
  Coffee,
  UtensilsCrossed,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getTodaysPunches } from "@/lib/punch/repo";
import { djiboutiDayWindow } from "@/lib/punch/window";
import { nextPunchType, dayStatus } from "@/lib/punch/sequence";
import { getDayPatternForEmployee } from "@/lib/punch/day-pattern";
import { PUNCH_LABELS, type PunchType, type DayStatus } from "@/lib/punch/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SequenceRibbon } from "@/components/employee/sequence-ribbon";
import { PunchButton } from "./PunchButton";

const TZ = "Africa/Djibouti";

export default async function MePage() {
  const session = await readSession();
  if (!session?.employeeId || session.role !== "employee") redirect("/login");

  const [employee, todays, dayPattern] = await Promise.all([
    db.employee.findUnique({
      where: { id: session.employeeId },
      include: { defaultSchedule: true, defaultScheduleTemplate: true },
    }),
    getTodaysPunches(session.employeeId),
    getDayPatternForEmployee(session.employeeId),
  ]);
  if (!employee) redirect("/login");

  const typesToday = todays.map((p) => p.punchType);
  const next = nextPunchType(typesToday, dayPattern.type);
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

  const templateLabel =
    dayPattern.templateName ?? employee.defaultSchedule.label;
  const isDayOff = dayPattern.type === "day_off";

  return (
    <div className="flex flex-col gap-7">
      {/* Greeting + status pill */}
      <header className="flex flex-col gap-1.5">
        <div className="label-eyebrow">{greeting}</div>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-3xl tracking-tight md:text-4xl">
            {employee.fullName.split(" ")[0]}
          </h1>
          <StatusBadge status={status} isDayOff={isDayOff} />
        </div>
      </header>

      {/* Today's sequence — adapts to the day-pattern type */}
      <section
        aria-label="Today's punch sequence"
        className="flex flex-col gap-3"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl tracking-tight">Today</h2>
          <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground tabular-nums">
            <DayPatternBadge type={dayPattern.type} />
            {templateLabel}
          </span>
        </div>
        {isDayOff ? (
          <Card className="bg-card p-8 text-center">
            <Sun
              className="mx-auto h-8 w-8 text-[var(--brass)]"
              strokeWidth={1.5}
            />
            <p className="mt-3 font-display text-2xl tracking-tight">
              Enjoy your day off
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              No punches expected today.
            </p>
          </Card>
        ) : (
          <SequenceRibbon
            todaysPunches={todays}
            timezone={TZ}
            dayPatternType={dayPattern.type}
          />
        )}
      </section>

      {/* Hero punch button — only when there's a next punch */}
      {!isDayOff ? (
        <section aria-label="Next punch">
          <PunchButton nextPunch={next} />
        </section>
      ) : null}

      {/* Today's schedule strip — adapts to day-pattern type */}
      <ScheduleStrip
        templateLabel={templateLabel}
        dayPattern={dayPattern}
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

function DayPatternBadge({ type }: { type: string }) {
  const meta: Record<string, { label: string; className: string }> = {
    split_day: {
      label: "Split day",
      className:
        "border-border bg-card text-muted-foreground",
    },
    continuous_day: {
      label: "Continuous · lunch on-site",
      className:
        "border-[var(--success)]/30 bg-[var(--success)]/15 text-[var(--success)]",
    },
    half_day: {
      label: "Half day",
      className:
        "border-[var(--brass)]/30 bg-[var(--brass)]/15 text-[var(--brass)]",
    },
    day_off: {
      label: "Day off",
      className: "border-border bg-muted text-muted-foreground",
    },
  };
  const m = meta[type] ?? meta.split_day!;
  return (
    <Badge
      variant="outline"
      className={`border font-mono text-[10px] uppercase tracking-wider ${m.className}`}
    >
      {m.label}
    </Badge>
  );
}

function StatusBadge({
  status,
  isDayOff,
}: {
  status: DayStatus;
  isDayOff: boolean;
}) {
  if (isDayOff) {
    return (
      <Badge
        variant="outline"
        className="border-[var(--brass)]/30 bg-[var(--brass)]/10 font-mono text-[10px] uppercase tracking-wider text-[var(--brass)]"
      >
        Day off
      </Badge>
    );
  }
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
  templateLabel,
  dayPattern,
}: {
  templateLabel: string;
  dayPattern: {
    type: string;
    startTime: string | null;
    endTime: string | null;
    lunchOutTime: string | null;
    lunchInTime: string | null;
    lunchBreakMinutes: number | null;
  };
}) {
  const { type, startTime, endTime, lunchOutTime, lunchInTime, lunchBreakMinutes } =
    dayPattern;
  return (
    <section
      aria-label="Today's expected schedule"
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-xl tracking-tight">Schedule</h2>
        <span className="ml-auto label-eyebrow">{templateLabel}</span>
      </div>
      <Card className="bg-card p-0">
        {type === "day_off" ? (
          <div className="px-5 py-5 text-center text-sm text-muted-foreground">
            No shift scheduled for today.
          </div>
        ) : type === "half_day" ? (
          <div className="grid grid-cols-2 divide-x divide-border">
            <Block eyebrow="Start" time={startTime ?? "—"} />
            <Block eyebrow="End" time={endTime ?? "—"} />
          </div>
        ) : type === "continuous_day" ? (
          <div className="grid grid-cols-3 divide-x divide-border">
            <Block eyebrow="Start" time={startTime ?? "—"} />
            <Block
              eyebrow={
                lunchBreakMinutes
                  ? `Lunch · ${lunchBreakMinutes}m on-site`
                  : "Lunch on-site"
              }
              icon={Coffee}
              time={lunchOutTime ?? "—"}
            />
            <Block eyebrow="End" time={endTime ?? "—"} />
          </div>
        ) : (
          <div className="grid grid-cols-4 divide-x divide-border">
            <Block eyebrow="Start" time={startTime ?? "—"} />
            <Block
              eyebrow="Lunch out"
              icon={UtensilsCrossed}
              time={lunchOutTime ?? "—"}
            />
            <Block eyebrow="Lunch in" icon={Coffee} time={lunchInTime ?? "—"} />
            <Block eyebrow="End" time={endTime ?? "—"} />
          </div>
        )}
      </Card>
    </section>
  );
}

function Block({
  eyebrow,
  time,
  icon: Icon,
}: {
  eyebrow: string;
  time: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3 text-center">
      <span className="label-eyebrow !text-[0.625rem] inline-flex items-center justify-center gap-1">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {eyebrow}
      </span>
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
