import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Sun, Moon, UtensilsCrossed, Coffee } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { addDays, startOfWeek } from "date-fns";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Schedule — Portside Time" };

const TZ = "Africa/Djibouti";

export default async function SchedulePage() {
  const session = await readSession();
  if (!session?.employeeId || session.role !== "employee") redirect("/login");

  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
    include: { defaultSchedule: true },
  });
  if (!employee) redirect("/login");

  // Week starts Sunday for Djibouti (week_start_day=0 per spec §4 CompanyConfig).
  const now = new Date();
  const todayYmd = formatInTimeZone(now, TZ, "yyyy-MM-dd");
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const fridayIdx = 5;

  const s = employee.defaultSchedule;
  const expectedStart = s.shiftStart;
  const expectedLunchOut = s.lunchStart;
  const expectedLunchIn = s.lunchEnd;
  const expectedEnd = s.shiftEnd;

  // Pull this-week punches so we can overlay actuals later in the design.
  const weekStartUtc = new Date(weekStart);
  const punchesThisWeek = await db.punch.findMany({
    where: {
      employeeId: session.employeeId,
      punchedAt: { gte: weekStartUtc, lt: addDays(weekStartUtc, 7) },
    },
    select: { punchType: true, punchedAt: true },
    orderBy: { punchedAt: "asc" },
  });

  // Index actual punches by day (yyyy-MM-dd) -> { shift_in, lunch_out, ... }
  type Actuals = Partial<Record<string, string>>;
  const actualByDay = new Map<string, Actuals>();
  for (const p of punchesThisWeek) {
    const ymd = formatInTimeZone(p.punchedAt, TZ, "yyyy-MM-dd");
    const hm = formatInTimeZone(p.punchedAt, TZ, "HH:mm");
    const existing = actualByDay.get(ymd) ?? {};
    existing[p.punchType] = hm;
    actualByDay.set(ymd, existing);
  }

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
              {weekRangeLabel} · {s.label}
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

      {/* Week grid */}
      <section aria-label="Week schedule grid" className="flex flex-col gap-3">
        <div className="grid gap-2 md:grid-cols-7">
          {days.map((day, idx) => {
            const ymd = formatInTimeZone(day, TZ, "yyyy-MM-dd");
            const dow = idx; // 0=Sun … 6=Sat
            const dayOff = dow === fridayIdx;
            const isToday = ymd === todayYmd;
            const actuals = actualByDay.get(ymd) ?? {};
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

                {dayOff ? (
                  <div className="flex flex-1 items-center justify-center py-3 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <Sun className="h-4 w-4 text-muted-foreground" />
                      <span className="label-eyebrow">Day off</span>
                    </div>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    <Slot
                      icon={Sun}
                      label="Start"
                      expected={expectedStart}
                      actual={actuals["shift_in"]}
                    />
                    <Slot
                      icon={UtensilsCrossed}
                      label="Lunch out"
                      expected={expectedLunchOut}
                      actual={actuals["lunch_out"]}
                    />
                    <Slot
                      icon={Coffee}
                      label="Lunch in"
                      expected={expectedLunchIn}
                      actual={actuals["lunch_in"]}
                    />
                    <Slot
                      icon={Moon}
                      label="End"
                      expected={expectedEnd}
                      actual={actuals["shift_out"]}
                    />
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Footnote */}
      <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        Schedule patterns (Fathi split-day, Hawa continuous-day, busy days) ship
        when the ScheduleTemplate workflow lands. For now everyone runs the
        default <span className="font-mono">{s.label}</span> template.
      </div>
    </div>
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
      <span className="flex-1 text-muted-foreground">{label}</span>
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
