import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Sun,
  Moon,
  UtensilsCrossed,
  Coffee,
  Briefcase,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { addDays, startOfWeek } from "date-fns";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Schedule — Portside Time" };

const TZ = "Africa/Djibouti";

type Actuals = Partial<Record<string, string>>;

export default async function SchedulePage() {
  const session = await readSession();
  if (!session?.employeeId || session.role !== "employee") redirect("/login");

  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
    include: {
      defaultScheduleTemplate: {
        include: {
          dayPatterns: { orderBy: { dayOfWeek: "asc" } },
        },
      },
    },
  });
  if (!employee) redirect("/login");

  const now = new Date();
  const todayYmd = formatInTimeZone(now, TZ, "yyyy-MM-dd");
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Build a Sun=0..Sat=6 lookup of day patterns for the employee's template.
  const patternByDow = new Map<number, NonNullable<typeof employee.defaultScheduleTemplate>["dayPatterns"][number]>();
  if (employee.defaultScheduleTemplate) {
    for (const p of employee.defaultScheduleTemplate.dayPatterns) {
      patternByDow.set(p.dayOfWeek, p);
    }
  }

  // Pull this-week punches so we can overlay actuals.
  const weekStartUtc = new Date(weekStart);
  const punchesThisWeek = await db.punch.findMany({
    where: {
      employeeId: session.employeeId,
      punchedAt: { gte: weekStartUtc, lt: addDays(weekStartUtc, 7) },
    },
    select: { punchType: true, punchedAt: true },
    orderBy: { punchedAt: "asc" },
  });
  const actualByDay = new Map<string, Actuals>();
  for (const p of punchesThisWeek) {
    const ymd = formatInTimeZone(p.punchedAt, TZ, "yyyy-MM-dd");
    const hm = formatInTimeZone(p.punchedAt, TZ, "HH:mm");
    const existing = actualByDay.get(ymd) ?? {};
    existing[p.punchType] = hm;
    actualByDay.set(ymd, existing);
  }

  const templateLabel =
    employee.defaultScheduleTemplate?.name ?? "Unassigned";
  const weekRangeLabel = `${formatInTimeZone(weekStart, TZ, "d MMM")} – ${formatInTimeZone(
    addDays(weekStart, 6),
    TZ,
    "d MMM yyyy"
  )}`;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow flex items-center gap-1.5">
          <Link href="/me" className="hover:text-foreground">
            Today
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span>Schedule</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-tight md:text-4xl">
              This week
            </h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
              {weekRangeLabel} · {templateLabel}
            </p>
          </div>
          <Badge
            variant="outline"
            className="font-mono text-[10px] uppercase tracking-wider"
          >
            Africa/Djibouti
          </Badge>
        </div>
      </header>

      <div className="rule-double" aria-hidden />

      <section aria-label="Week schedule grid" className="flex flex-col gap-3">
        <div className="grid gap-2 md:grid-cols-7">
          {days.map((day) => {
            const ymd = formatInTimeZone(day, TZ, "yyyy-MM-dd");
            const dow = day.getDay(); // 0=Sun..6=Sat (in local TZ; for Djibouti this matches our convention)
            const pattern = patternByDow.get(dow);
            const isToday = ymd === todayYmd;
            const actuals = actualByDay.get(ymd) ?? {};
            const dayOff = pattern?.type === "day_off";

            return (
              <Card
                key={ymd}
                className={cn(
                  "flex flex-col gap-3 bg-card p-3 transition-colors",
                  isToday && "border-[var(--brass)] shadow-[0_0_0_1px_var(--brass)]",
                  dayOff && "bg-muted/30 opacity-80"
                )}
              >
                <header className="flex items-baseline justify-between">
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "label-eyebrow",
                        isToday && "text-[var(--brass)]"
                      )}
                    >
                      {formatInTimeZone(day, TZ, "EEE")}
                    </span>
                    <span className="font-display text-xl tabular-nums">
                      {formatInTimeZone(day, TZ, "d")}
                    </span>
                  </div>
                  {isToday ? (
                    <Badge className="border-[var(--brass)]/30 bg-[var(--brass)]/15 px-1.5 py-0 text-[9px] font-mono uppercase tracking-wider text-[var(--brass)] hover:bg-[var(--brass)]/15">
                      Today
                    </Badge>
                  ) : null}
                </header>

                <DayBody pattern={pattern} actuals={actuals} />
              </Card>
            );
          })}
        </div>
      </section>

      {!employee.defaultScheduleTemplate ? (
        <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          This employee has no day-pattern template assigned. Showing default
          split-day pattern. Admin can assign a template at{" "}
          <span className="font-mono">/admin/employees/&lt;id&gt;/edit</span>.
        </div>
      ) : null}
    </div>
  );
}

function DayBody({
  pattern,
  actuals,
}: {
  pattern:
    | {
        type: string;
        startTime: string | null;
        endTime: string | null;
        lunchOutTime: string | null;
        lunchInTime: string | null;
        lunchBreakMinutes: number | null;
        lunchOnSite: boolean;
      }
    | undefined;
  actuals: Actuals;
}) {
  if (!pattern || pattern.type === "day_off") {
    return (
      <div className="flex flex-1 items-center justify-center py-3 text-center">
        <div className="flex flex-col items-center gap-1.5">
          <Sun className="h-4 w-4 text-muted-foreground" />
          <span className="label-eyebrow">Day off</span>
        </div>
      </div>
    );
  }
  if (pattern.type === "half_day") {
    return (
      <ul className="flex flex-col gap-1.5">
        <Slot
          icon={Sun}
          label="Start"
          expected={pattern.startTime ?? "—"}
          actual={actuals["shift_in"]}
        />
        <Slot
          icon={Moon}
          label="End"
          expected={pattern.endTime ?? "—"}
          actual={actuals["shift_out"]}
        />
      </ul>
    );
  }
  if (pattern.type === "continuous_day") {
    return (
      <ul className="flex flex-col gap-1.5">
        <Slot
          icon={Sun}
          label="Start"
          expected={pattern.startTime ?? "—"}
          actual={actuals["shift_in"]}
        />
        <Slot
          icon={Coffee}
          label={`Lunch · ${pattern.lunchBreakMinutes ?? "?"}m on-site`}
          expected={pattern.lunchOutTime ?? "—"}
          actual={actuals["lunch_out"]}
        />
        <Slot
          icon={Briefcase}
          label="Back"
          expected={pattern.lunchInTime ?? "—"}
          actual={actuals["lunch_in"]}
        />
        <Slot
          icon={Moon}
          label="End"
          expected={pattern.endTime ?? "—"}
          actual={actuals["shift_out"]}
        />
      </ul>
    );
  }
  // split_day
  return (
    <ul className="flex flex-col gap-1.5">
      <Slot
        icon={Sun}
        label="Start"
        expected={pattern.startTime ?? "—"}
        actual={actuals["shift_in"]}
      />
      <Slot
        icon={UtensilsCrossed}
        label="Lunch out"
        expected={pattern.lunchOutTime ?? "—"}
        actual={actuals["lunch_out"]}
      />
      <Slot
        icon={Coffee}
        label="Lunch in"
        expected={pattern.lunchInTime ?? "—"}
        actual={actuals["lunch_in"]}
      />
      <Slot
        icon={Moon}
        label="End"
        expected={pattern.endTime ?? "—"}
        actual={actuals["shift_out"]}
      />
    </ul>
  );
}

function Slot({
  icon: Icon,
  label,
  expected,
  actual,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  expected: string;
  actual?: string;
}) {
  const done = !!actual;
  return (
    <li className="flex items-center gap-2 text-xs">
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          done ? "text-[var(--brass)]" : "text-muted-foreground/60"
        )}
      />
      <span className="flex-1 truncate text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums",
          done ? "text-[var(--brass)]" : "text-foreground/70"
        )}
      >
        {actual ?? expected}
      </span>
    </li>
  );
}
