import Link from "next/link";
import { Plus, Users, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const metadata = { title: "Employees — Portside Time" };

const DJF = new Intl.NumberFormat("fr-DJ", {
  style: "currency",
  currency: "DJF",
  maximumFractionDigits: 0,
});

export default async function EmployeesPage() {
  const employees = await db.employee.findMany({
    orderBy: [{ status: "asc" }, { fullName: "asc" }],
    include: { defaultScheduleTemplate: true },
  });

  const active = employees.filter((e) => e.status === "active").length;
  const inactive = employees.length - active;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow">Roster</div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl tracking-tight md:text-5xl">
              Employees
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{active}</span> active
              {inactive > 0 ? (
                <>
                  {" · "}
                  <span className="font-mono tabular-nums">{inactive}</span>{" "}
                  inactive
                </>
              ) : null}
            </p>
          </div>
          <Button asChild className="gap-1.5">
            <Link href="/admin/employees/new">
              <Plus className="h-4 w-4" /> New employee
            </Link>
          </Button>
        </div>
      </header>

      <div className="rule-double" aria-hidden />

      {employees.length === 0 ? (
        <Card className="bg-card p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-display text-xl">No employees yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the first one to start tracking attendance.
          </p>
          <Button asChild className="mt-4 gap-1.5">
            <Link href="/admin/employees/new">
              <Plus className="h-4 w-4" /> New employee
            </Link>
          </Button>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {employees.map((e) => (
              <li key={e.id}>
                <Link href={`/admin/employees/${e.id}`}>
                  <Card
                    className={cn(
                      "bg-card p-4 transition-colors hover:border-[var(--brass)]/50",
                      e.status !== "active" && "opacity-65"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border bg-background font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                      >
                        {initialsOf(e.fullName)}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">
                            {e.fullName}
                          </span>
                          <StatusPill status={e.status} />
                        </div>
                        <span className="truncate text-xs text-muted-foreground">
                          {e.position}
                        </span>
                        <span className="mt-1.5 font-mono text-xs text-foreground/80 tabular-nums">
                          {DJF.format(e.monthlySalary)} / mo ·{" "}
                          {e.defaultScheduleTemplate?.name ?? "Unassigned"}
                        </span>
                      </div>
                      <ChevronRight
                        className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                        strokeWidth={1.75}
                      />
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <Card className="hidden bg-card p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="label-eyebrow">Name</TableHead>
                  <TableHead className="label-eyebrow">Position</TableHead>
                  <TableHead className="label-eyebrow">Schedule</TableHead>
                  <TableHead className="label-eyebrow text-right">
                    Monthly salary
                  </TableHead>
                  <TableHead className="label-eyebrow">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((e) => (
                  <TableRow
                    key={e.id}
                    className={cn(
                      "border-border transition-colors",
                      e.status !== "active" && "opacity-60"
                    )}
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/employees/${e.id}`}
                        className="group inline-flex items-center gap-2.5"
                      >
                        <span
                          aria-hidden
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-background font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                        >
                          {initialsOf(e.fullName)}
                        </span>
                        <span className="group-hover:underline-brass">
                          {e.fullName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.position}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.defaultScheduleTemplate?.name ?? "Unassigned"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-foreground">
                      {DJF.format(e.monthlySalary)}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={e.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge className="border-[var(--success)]/30 bg-[var(--success)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--success)] hover:bg-[var(--success)]/15">
        Active
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-border bg-muted font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
    >
      {status}
    </Badge>
  );
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "??"
  );
}
