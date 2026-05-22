import Link from "next/link";
import {
  FileBarChart2,
  Lock,
  Activity,
  ChevronRight,
  Archive,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import {
  currentPeriodYmd,
  periodWindow,
  previousPeriodYmd,
} from "@/lib/reports/period";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Reports — Portside Time" };

const TZ = "Africa/Djibouti";

export default async function ReportsPage() {
  const current = currentPeriodYmd();
  const previous = previousPeriodYmd(current);
  const reports = await db.monthlyReport.findMany({
    orderBy: { periodStart: "desc" },
    select: {
      periodStart: true,
      locked: true,
      lockedAt: true,
      exportPath: true,
    },
    distinct: ["periodStart"],
  });
  const periodSet = new Set(
    reports.map((r) => r.periodStart.toISOString().slice(0, 10))
  );

  const currentLabel = periodWindow(current).label;
  const previousLabel = periodWindow(previous).label;
  const previousIsLocked = periodSet.has(
    periodWindow(previous).start.toISOString().slice(0, 10)
  );

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow">Payroll · monthly</div>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Monthly reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Locked reports become the source of truth for payroll. The current
          period is mutable until it locks at end-of-month.
        </p>
      </header>

      <div className="rule-double" aria-hidden />

      <section aria-label="Active periods" className="grid gap-3 md:grid-cols-2">
        <PeriodCard
          ymd={current}
          label={currentLabel}
          locked={false}
        />
        <PeriodCard
          ymd={previous}
          label={previousLabel}
          locked={previousIsLocked}
        />
      </section>

      <section aria-label="Locked archive" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-2xl tracking-tight">
            Locked archive
          </h2>
        </div>
        {reports.filter((r) => r.locked).length === 0 ? (
          <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <Lock
              className="mx-auto h-6 w-6 text-muted-foreground"
              strokeWidth={1.5}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              No periods locked yet.
            </p>
          </div>
        ) : (
          <Card className="bg-card p-0">
            <ul className="divide-y divide-border">
              {reports
                .filter((r) => r.locked)
                .map((r) => {
                  const ymd = r.periodStart.toISOString().slice(0, 10);
                  const label = periodWindow(ymd).label;
                  return (
                    <li key={ymd}>
                      <Link
                        href={`/admin/reports/${ymd}`}
                        className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                      >
                        <span
                          aria-hidden
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]"
                        >
                          <Lock className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                        <div className="flex flex-1 flex-col gap-0.5">
                          <span className="font-medium">{label}</span>
                          <span className="font-mono text-xs text-muted-foreground tabular-nums">
                            Locked{" "}
                            {r.lockedAt
                              ? formatInTimeZone(
                                  r.lockedAt,
                                  TZ,
                                  "d LLL yyyy · HH:mm"
                                )
                              : "—"}
                          </span>
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
      </section>
    </div>
  );
}

function PeriodCard({
  ymd,
  label,
  locked,
}: {
  ymd: string;
  label: string;
  locked: boolean;
}) {
  const accent = locked
    ? "border-[var(--success)]/40 bg-[var(--success)]/10"
    : "border-[var(--brass)]/40 bg-[var(--brass)]/10";
  const iconAccent = locked
    ? "text-[var(--success)]"
    : "text-[var(--brass)]";
  return (
    <Link href={`/admin/reports/${ymd}`}>
      <Card
        className={`group p-5 transition-colors hover:border-foreground/30 ${accent}`}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border bg-background ${iconAccent}`}
          >
            {locked ? (
              <Lock className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Activity className="h-4 w-4" strokeWidth={1.75} />
            )}
          </span>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className={`label-eyebrow ${iconAccent}`}>
                {locked ? "Locked" : "In progress"}
              </span>
              <Badge
                variant="outline"
                className="font-mono text-[10px] uppercase tracking-wider"
              >
                {locked ? "Source of truth" : "Live"}
              </Badge>
            </div>
            <span className="font-display text-2xl tracking-tight">
              {label}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              Review preview
              <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
