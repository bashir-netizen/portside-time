import {
  CalendarClock,
  Sun,
  Moon,
  UtensilsCrossed,
  Coffee,
  Coins,
  Sparkles,
} from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Schedules — Portside Time" };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function SchedulesPage() {
  const templates = await db.scheduleTemplate.findMany({
    orderBy: { name: "asc" },
    include: {
      dayPatterns: { orderBy: { dayOfWeek: "asc" } },
      _count: { select: { employees: true } },
    },
  });

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow">Patterns</div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl tracking-tight md:text-5xl">
              Schedules
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">
                {templates.length}
              </span>{" "}
              day-pattern template{templates.length === 1 ? "" : "s"} · assigned
              to employees from <span className="font-mono">/admin/employees</span>
            </p>
          </div>
        </div>
      </header>

      <div className="rule-double" aria-hidden />

      <section
        aria-label="Day-pattern templates"
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--brass)]" />
          <h2 className="font-display text-2xl tracking-tight">
            Day-pattern templates
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Each template defines a 7-day pattern with different day types
          (split-day, continuous-day, half-day, day-off). The punch flow
          branches on today's day-pattern type for the employee's assigned
          template. Editing templates from the UI is on the backlog — for
          now, change via{" "}
          <span className="font-mono">prisma/seed.ts</span>.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      </section>
    </div>
  );
}

type DayPattern = {
  dayOfWeek: number;
  type: string;
  startTime: string | null;
  endTime: string | null;
  lunchOutTime: string | null;
  lunchInTime: string | null;
  lunchBreakMinutes: number | null;
  lunchOnSite: boolean;
};
type Template = {
  id: string;
  name: string;
  description: string | null;
  hasBusyDayExtension: boolean;
  busyDayEndTime: string | null;
  dayPatterns: DayPattern[];
  _count: { employees: number };
};

function TemplateCard({ template }: { template: Template }) {
  let totalMinutes = 0;
  for (const dp of template.dayPatterns) {
    if (dp.type === "day_off") continue;
    if (!dp.startTime || !dp.endTime) continue;
    const [sh, sm] = dp.startTime.split(":").map(Number) as [number, number];
    const [eh, em] = dp.endTime.split(":").map(Number) as [number, number];
    const span = eh * 60 + em - (sh * 60 + sm);
    const breakMin =
      dp.type === "split_day" && dp.lunchOutTime && dp.lunchInTime
        ? (() => {
            const [lh, lm] = dp.lunchOutTime!
              .split(":")
              .map(Number) as [number, number];
            const [rh, rm] = dp.lunchInTime!
              .split(":")
              .map(Number) as [number, number];
            return rh * 60 + rm - (lh * 60 + lm);
          })()
        : dp.lunchBreakMinutes ?? 0;
    totalMinutes += span - breakMin;
  }
  const hoursPerWeek = (totalMinutes / 60).toFixed(2);
  const employeeCount = template._count.employees;

  return (
    <Card className="border-[var(--brass)]/30 bg-[var(--brass)]/5 p-0">
      <div className="border-b border-[var(--brass)]/20 px-5 py-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-[var(--brass)]/40 bg-background text-[var(--brass)]"
          >
            <CalendarClock className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="flex flex-1 flex-col gap-0.5">
            <h3 className="font-display text-xl tracking-tight">
              {template.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {template.description}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className="font-mono text-[10px] uppercase tracking-wider"
              >
                {hoursPerWeek} h / wk
              </Badge>
              <Badge
                variant="outline"
                className="font-mono text-[10px] uppercase tracking-wider"
              >
                {employeeCount} employee{employeeCount === 1 ? "" : "s"}
              </Badge>
              {template.hasBusyDayExtension ? (
                <Badge className="border-[var(--warning)]/30 bg-[var(--warning)]/15 font-mono text-[10px] uppercase tracking-wider text-foreground hover:bg-[var(--warning)]/15">
                  <Coins className="mr-1 h-3 w-3" />
                  busy-day → {template.busyDayEndTime}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-[var(--brass)]/15">
        {template.dayPatterns.map((dp) => (
          <DayPatternRow key={dp.dayOfWeek} dp={dp} />
        ))}
      </ul>
    </Card>
  );
}

function DayPatternRow({ dp }: { dp: DayPattern }) {
  const day = DAY_LABELS[dp.dayOfWeek];
  const dayOff = dp.type === "day_off";
  const halfDay = dp.type === "half_day";
  const continuous = dp.type === "continuous_day";

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-5 py-2.5 text-xs",
        dayOff && "opacity-60"
      )}
    >
      <span
        className={cn(
          "w-9 font-mono uppercase tracking-wider tabular-nums",
          dayOff ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {day}
      </span>

      {dayOff ? (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Sun className="h-3 w-3" />
          Day off
        </span>
      ) : halfDay ? (
        <span className="flex items-center gap-2 font-mono tabular-nums">
          <Sun className="h-3 w-3 text-[var(--brass)]" />
          {dp.startTime}
          <span className="text-muted-foreground">→</span>
          <Moon className="h-3 w-3 text-muted-foreground" />
          {dp.endTime}
          <Badge
            variant="outline"
            className="ml-1 font-mono text-[9px] uppercase tracking-wider"
          >
            half day
          </Badge>
        </span>
      ) : continuous ? (
        <span className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
          <Sun className="h-3 w-3 text-[var(--brass)]" />
          {dp.startTime}
          <span className="text-muted-foreground">→</span>
          <Moon className="h-3 w-3 text-muted-foreground" />
          {dp.endTime}
          <Badge className="border-[var(--success)]/30 bg-[var(--success)]/15 font-mono text-[9px] uppercase tracking-wider text-[var(--success)] hover:bg-[var(--success)]/15">
            <Coffee className="mr-1 h-3 w-3" />
            {dp.lunchBreakMinutes}m on-site
          </Badge>
        </span>
      ) : (
        <span className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
          <Sun className="h-3 w-3 text-[var(--brass)]" />
          {dp.startTime}
          <span className="text-muted-foreground">→</span>
          <UtensilsCrossed className="h-3 w-3 text-[var(--warning)]" />
          {dp.lunchOutTime}
          <span className="text-muted-foreground">…</span>
          <Coffee className="h-3 w-3 text-[var(--warning)]" />
          {dp.lunchInTime}
          <span className="text-muted-foreground">→</span>
          <Moon className="h-3 w-3 text-muted-foreground" />
          {dp.endTime}
        </span>
      )}
    </li>
  );
}
