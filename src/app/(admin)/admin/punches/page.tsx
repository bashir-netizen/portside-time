import Link from "next/link";
import {
  Clock,
  Filter,
  PlusCircle,
  ChevronDown,
  History,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { parseYmdInDjibouti, todayYmd } from "@/lib/time";
import { PUNCH_LABELS, type PunchType } from "@/lib/punch/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PunchRowActions } from "./PunchRowActions";
import { AddPunchForm } from "./AddPunchForm";

export const metadata = { title: "Punches — Portside Time" };

const TZ = "Africa/Djibouti";

const PUNCH_ICON_TONE: Record<PunchType, string> = {
  shift_in: "text-[var(--success)] border-[var(--success)]/30 bg-[var(--success)]/10",
  lunch_out: "text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--warning)]/10",
  lunch_in: "text-[var(--brass)] border-[var(--brass)]/30 bg-[var(--brass)]/10",
  shift_out: "text-muted-foreground border-border bg-muted",
};

export default async function PunchesPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string; date?: string }>;
}) {
  const { employee: employeeId, date } = await searchParams;
  const ymd = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayYmd();
  const start = parseYmdInDjibouti(ymd);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const employees = await db.employee.findMany({
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });
  const nameById = new Map(employees.map((e) => [e.id, e.fullName]));

  const raw = await db.punch.findMany({
    where: {
      punchedAt: { gte: start, lt: end },
      ...(employeeId ? { employeeId } : {}),
    },
    orderBy: [{ employeeId: "asc" }, { punchedAt: "asc" }],
    include: {
      corrections: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const selectedEmployee = employeeId
    ? employees.find((e) => e.id === employeeId)
    : null;
  const dateLabel = formatInTimeZone(start, TZ, "EEEE d LLLL yyyy");
  const isToday = ymd === todayYmd();

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow">Time-tracking · Log</div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl tracking-tight md:text-5xl">
              Punches
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isToday ? "Today" : dateLabel}
              {selectedEmployee ? (
                <>
                  {" · "}filtered to {selectedEmployee.fullName}
                </>
              ) : null}
              {" · "}
              <span className="font-mono tabular-nums">
                {raw.length}
              </span>{" "}
              punch{raw.length === 1 ? "" : "es"}
            </p>
          </div>
        </div>
      </header>

      <div className="rule-double" aria-hidden />

      {/* Filter bar */}
      <Card className="bg-card p-4">
        <form
          action="/admin/punches"
          className="flex flex-col gap-3 md:flex-row md:items-end"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="employee-filter" className="label-eyebrow">
              Employee
            </Label>
            <Select name="employee" defaultValue={employeeId ?? "__all__"}>
              <SelectTrigger
                id="employee-filter"
                className="bg-background md:max-w-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All employees</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date-filter" className="label-eyebrow">
              Day (Djibouti)
            </Label>
            <Input
              id="date-filter"
              type="date"
              name="date"
              defaultValue={ymd}
              className="bg-background font-mono md:max-w-[10rem]"
            />
          </div>
          <Button type="submit" className="gap-1.5 md:self-end">
            <Filter className="h-4 w-4" />
            Apply
          </Button>
        </form>
      </Card>

      {/* Manual correction tool — collapsed */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/30">
          <PlusCircle className="h-4 w-4 text-[var(--brass)]" />
          <span className="text-sm font-medium">Add a missing punch</span>
          <span className="ml-auto label-eyebrow">audit-logged</span>
          <ChevronDown
            className="ml-2 h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
            strokeWidth={1.75}
          />
        </summary>
        <Card className="mt-2 bg-card p-5">
          <AddPunchForm employees={employees} defaultDate={ymd} />
        </Card>
      </details>

      {/* Log */}
      <section aria-label="Punch log" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-2xl tracking-tight">Log</h2>
        </div>

        {raw.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
            <Clock
              className="mx-auto h-6 w-6 text-muted-foreground"
              strokeWidth={1.5}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              No punches recorded for this day.
            </p>
          </div>
        ) : (
          <Card className="overflow-x-auto bg-card p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="label-eyebrow">Employee</TableHead>
                  <TableHead className="label-eyebrow">Type</TableHead>
                  <TableHead className="label-eyebrow">Time</TableHead>
                  <TableHead className="label-eyebrow">State</TableHead>
                  <TableHead className="label-eyebrow text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {raw.map((p) => {
                  const c = p.corrections[0];
                  const voided = c?.correctionType === "void";
                  const editedTime =
                    c?.correctionType === "edit" && c.newPunchedAt
                      ? c.newPunchedAt
                      : null;
                  const effectiveTime = editedTime ?? p.punchedAt;
                  const ptype = p.punchType as PunchType;
                  return (
                    <TableRow
                      key={p.id}
                      className={cn(
                        "border-border",
                        voided && "opacity-50"
                      )}
                    >
                      <TableCell>
                        <Link
                          href={`/admin/employees/${p.employeeId}`}
                          className="text-sm font-medium hover:underline-brass"
                        >
                          {nameById.get(p.employeeId) ??
                            p.employeeId.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-sm border text-[10px] font-mono uppercase",
                              PUNCH_ICON_TONE[ptype]
                            )}
                          >
                            {ptype === "shift_in"
                              ? "IN"
                              : ptype === "lunch_out"
                                ? "LO"
                                : ptype === "lunch_in"
                                  ? "LI"
                                  : "OUT"}
                          </span>
                          <span className="text-sm">
                            {PUNCH_LABELS[ptype]}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-mono text-sm tabular-nums",
                            voided && "line-through"
                          )}
                        >
                          {formatInTimeZone(effectiveTime, TZ, "HH:mm:ss")}
                        </span>
                        {editedTime && c?.originalPunchedAt ? (
                          <span className="ml-2 font-mono text-[10px] text-muted-foreground line-through tabular-nums">
                            {formatInTimeZone(
                              c.originalPunchedAt,
                              TZ,
                              "HH:mm:ss"
                            )}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {voided ? (
                          <Badge className="border-destructive/30 bg-destructive/15 font-mono text-[10px] uppercase tracking-wider text-destructive hover:bg-destructive/15">
                            Voided
                          </Badge>
                        ) : p.isCorrected ? (
                          <Badge className="border-[var(--warning)]/30 bg-[var(--warning)]/15 font-mono text-[10px] uppercase tracking-wider text-foreground hover:bg-[var(--warning)]/15">
                            Corrected
                          </Badge>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground/60">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!voided ? (
                          <PunchRowActions
                            punchId={p.id}
                            currentTime={effectiveTime.toISOString()}
                          />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Every correction is audit-logged with the operator's identity, the
        original timestamp, and the new value. Voids are soft-deletes — the
        original punch stays in the database for compliance.
      </p>
    </div>
  );
}
