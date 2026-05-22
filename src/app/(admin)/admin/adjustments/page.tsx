import { Wrench, PlusCircle, ChevronDown, History } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { periodWindow } from "@/lib/reports/period";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NewAdjustmentForm } from "./NewAdjustmentForm";

export const metadata = { title: "Adjustments — Portside Time" };

const TZ = "Africa/Djibouti";

const DJF = new Intl.NumberFormat("fr-DJ", {
  style: "currency",
  currency: "DJF",
  maximumFractionDigits: 0,
});

export default async function AdjustmentsPage() {
  const [employees, lockedPeriods, adjustments] = await Promise.all([
    db.employee.findMany({
      where: { status: "active" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    db.monthlyReport.findMany({
      where: { locked: true },
      orderBy: { periodStart: "desc" },
      distinct: ["periodStart"],
      select: { periodStart: true },
    }),
    db.adjustment.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const empById = new Map(employees.map((e) => [e.id, e.fullName]));
  const periodOptions = lockedPeriods.map((p) => {
    const ymd = p.periodStart.toISOString().slice(0, 10);
    return { ymd, label: periodWindow(ymd).label };
  });

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow">Payroll · post-close corrections</div>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Adjustments
        </h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          For things that surface after a month is locked. The amount lands on
          the <em>current</em> open period's report — the locked file is never
          modified. Each adjustment is audit-logged with the reason.
        </p>
      </header>

      <div className="rule-double" aria-hidden />

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/30">
          <PlusCircle className="h-4 w-4 text-[var(--brass)]" />
          <span className="text-sm font-medium">Record an adjustment</span>
          <span className="ml-auto label-eyebrow">audit-logged</span>
          <ChevronDown
            className="ml-2 h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
            strokeWidth={1.75}
          />
        </summary>
        <Card className="mt-2 bg-card p-5">
          <NewAdjustmentForm employees={employees} periods={periodOptions} />
        </Card>
      </details>

      <section aria-label="Recent adjustments" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-2xl tracking-tight">
            Recent adjustments
          </h2>
        </div>

        {adjustments.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <Wrench
              className="mx-auto h-6 w-6 text-muted-foreground"
              strokeWidth={1.5}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              No adjustments recorded yet.
            </p>
          </div>
        ) : (
          <Card className="bg-card p-0">
            <ul className="divide-y divide-border">
              {adjustments.map((a) => {
                const positive = a.amountDjf >= 0;
                return (
                  <li key={a.id} className="flex flex-col gap-2 px-5 py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">
                        {empById.get(a.employeeId) ??
                          a.employeeId.slice(0, 8)}
                      </span>
                      <span
                        className={`font-mono text-sm font-semibold tabular-nums ${
                          positive
                            ? "text-[var(--success)]"
                            : "text-destructive"
                        }`}
                      >
                        {positive ? "+" : "−"}
                        {DJF.format(Math.abs(a.amountDjf))}
                      </span>
                    </div>
                    <Separator className="my-0" />
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Applies to{" "}
                        {formatInTimeZone(
                          a.appliesToPeriodStart,
                          TZ,
                          "LLLL yyyy"
                        )}
                        {" · "}
                        {a.appliedInPeriodStart
                          ? `applied in ${formatInTimeZone(a.appliedInPeriodStart, TZ, "LLLL yyyy")}`
                          : "not yet applied"}
                      </span>
                      <p className="text-xs italic text-foreground/85">
                        "{a.reason}"
                      </p>
                    </div>
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
