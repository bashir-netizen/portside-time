import Link from "next/link";
import { Plus, CalendarClock, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Schedules — Portside Time" };

export default async function SchedulesPage() {
  const schedules = await db.schedule.findMany({ orderBy: { label: "asc" } });

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
              <span className="font-mono tabular-nums">{schedules.length}</span>{" "}
              template{schedules.length === 1 ? "" : "s"} · Fathi + Hawa
              day-pattern templates ship in a future PR
            </p>
          </div>
          <Button asChild className="gap-1.5">
            <Link href="/admin/schedules/new">
              <Plus className="h-4 w-4" /> New schedule
            </Link>
          </Button>
        </div>
      </header>

      <div className="rule-double" aria-hidden />

      {schedules.length === 0 ? (
        <Card className="bg-card p-8 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-display text-xl">No schedules yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the first template to assign to employees.
          </p>
        </Card>
      ) : (
        <Card className="bg-card p-0">
          <ul className="divide-y divide-border">
            {schedules.map((s) => {
              const days = JSON.parse(s.workDays) as string[];
              return (
                <li key={s.id}>
                  <Link
                    href={`/admin/schedules/${s.id}/edit`}
                    className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/40"
                  >
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-[var(--brass)]/40 bg-[var(--brass)]/10 text-[var(--brass)]"
                    >
                      <CalendarClock className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-medium">{s.label}</span>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {s.shiftStart}–{s.lunchStart} · {s.lunchEnd}–{s.shiftEnd}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {days.map((d) => (
                          <Badge
                            key={d}
                            variant="outline"
                            className="font-mono text-[9px] uppercase tracking-wider"
                          >
                            {d}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground"
                      strokeWidth={1.75}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
