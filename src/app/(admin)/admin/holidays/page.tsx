import { Calendar, PlusCircle, ChevronDown } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddHolidayForm } from "./AddHolidayForm";
import { DeleteHolidayButton } from "./DeleteHolidayButton";

export const metadata = { title: "Holidays — Portside Time" };

const TZ = "Africa/Djibouti";

export default async function HolidaysPage() {
  const holidays = await db.holiday.findMany({ orderBy: { date: "asc" } });
  const paid = holidays.filter((h) => h.isPaid).length;
  const unpaid = holidays.length - paid;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow">Calendar</div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl tracking-tight md:text-5xl">
              Public holidays
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{paid}</span> paid
              {unpaid > 0 ? (
                <>
                  {" · "}
                  <span className="font-mono tabular-nums">{unpaid}</span>{" "}
                  unpaid
                </>
              ) : null}
              {" · "}holidays don't count against annual leave balance
            </p>
          </div>
        </div>
      </header>

      <div className="rule-double" aria-hidden />

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/30">
          <PlusCircle className="h-4 w-4 text-[var(--brass)]" />
          <span className="text-sm font-medium">Add a holiday</span>
          <ChevronDown
            className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
            strokeWidth={1.75}
          />
        </summary>
        <Card className="mt-2 bg-card p-5">
          <AddHolidayForm />
        </Card>
      </details>

      <section aria-label="Holiday calendar" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-2xl tracking-tight">Calendar</h2>
        </div>

        {holidays.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <Calendar
              className="mx-auto h-6 w-6 text-muted-foreground"
              strokeWidth={1.5}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              No holidays yet. Djibouti has ~10 national holidays per year —
              Independence Day, Eid al-Fitr, Eid al-Adha, etc.
            </p>
          </div>
        ) : (
          <Card className="bg-card p-0">
            <ul className="divide-y divide-border">
              {holidays.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-sm border border-border bg-background"
                  >
                    <span className="font-display text-lg leading-none text-[var(--brass)] tabular-nums">
                      {formatInTimeZone(h.date, TZ, "d")}
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
                      {formatInTimeZone(h.date, TZ, "LLL")}
                    </span>
                  </span>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="font-medium">{h.name}</span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {formatInTimeZone(h.date, TZ, "EEEE d LLLL yyyy")}
                    </span>
                  </div>
                  {!h.isPaid ? (
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase tracking-wider"
                    >
                      Unpaid
                    </Badge>
                  ) : (
                    <Badge className="border-[var(--success)]/30 bg-[var(--success)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--success)] hover:bg-[var(--success)]/15">
                      Paid
                    </Badge>
                  )}
                  <DeleteHolidayButton id={h.id} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
