import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Edit3,
  PowerOff,
  Power,
  Briefcase,
  CalendarDays,
  CalendarClock,
  Wallet,
  Plane,
  Lock,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { accruedDaysSinceHire } from "@/lib/leave/accrual";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toggleEmployeeStatusAction } from "../actions";
import { ResetPinButton } from "./ResetPinButton";

const TZ = "Africa/Djibouti";

const DJF = new Intl.NumberFormat("fr-DJ", {
  style: "currency",
  currency: "DJF",
  maximumFractionDigits: 0,
});

export default async function EmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await db.employee.findUnique({
    where: { id },
    include: { defaultSchedule: true },
  });
  if (!employee) notFound();

  const accrued = accruedDaysSinceHire(employee.hireDate);
  const usedLeave = await db.leaveRequest
    .findMany({
      where: {
        employeeId: employee.id,
        leaveType: "annual",
        status: "approved",
      },
      select: { days: true },
    })
    .then((rs) => rs.reduce((s, r) => s + r.days, 0));
  const remainingLeave = Math.max(0, accrued - usedLeave);

  const toggleBound = toggleEmployeeStatusAction.bind(null, employee.id);
  const isActive = employee.status === "active";

  return (
    <div className="flex flex-col gap-7">
      <div className="label-eyebrow flex items-center gap-1.5">
        <Link href="/admin" className="hover:text-foreground">
          Admin
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href="/admin/employees" className="hover:text-foreground">
          Employees
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span>{employee.fullName}</span>
      </div>

      {/* Hero card */}
      <Card className="bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border border-[var(--brass)]/40 bg-[var(--brass)]/10 font-display text-2xl tracking-tight text-[var(--brass)]"
            >
              {initialsOf(employee.fullName)}
            </span>
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-3xl tracking-tight md:text-4xl">
                {employee.fullName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {employee.position}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {isActive ? (
                  <Badge className="border-[var(--success)]/30 bg-[var(--success)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--success)] hover:bg-[var(--success)]/15">
                    Active
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-border bg-muted font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    Inactive
                  </Badge>
                )}
                {!employee.pinHash ? (
                  <Badge className="border-[var(--warning)]/30 bg-[var(--warning)]/15 font-mono text-[10px] uppercase tracking-wider text-foreground hover:bg-[var(--warning)]/15">
                    PIN not set
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild className="gap-1.5">
              <Link href={`/admin/employees/${employee.id}/edit`}>
                <Edit3 className="h-4 w-4" />
                Edit profile
              </Link>
            </Button>
            <ResetPinButton employeeId={employee.id} />
            <form action={toggleBound}>
              <Button type="submit" variant="outline" className="gap-1.5">
                {isActive ? (
                  <>
                    <PowerOff className="h-4 w-4" /> Deactivate
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4" /> Reactivate
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </Card>

      <section aria-label="Profile details" className="flex flex-col gap-3">
        <h2 className="label-eyebrow">Profile</h2>
        <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          <Field
            icon={Briefcase}
            label="Position"
            value={employee.position}
          />
          <Field
            icon={CalendarDays}
            label="Hired"
            value={formatInTimeZone(employee.hireDate, TZ, "d LLLL yyyy")}
            mono
          />
          <Field
            icon={CalendarClock}
            label="Default schedule"
            value={employee.defaultSchedule.label}
          />
          <Field
            icon={Wallet}
            label="Monthly salary"
            value={DJF.format(employee.monthlySalary)}
            mono
            accent="brass"
          />
          <Field
            icon={Plane}
            label="Annual leave"
            value={`${remainingLeave.toFixed(1)} / ${accrued.toFixed(1)} days`}
            mono
            accent="success"
            hint={`${usedLeave.toFixed(1)} used`}
          />
          <Field
            icon={Lock}
            label="PIN"
            value={employee.pinHash ? "Set" : "Not set"}
            accent={employee.pinHash ? undefined : "warning"}
          />
        </div>
      </section>

      <Separator />

      <p className="text-xs text-muted-foreground">
        Leave balance derived from{" "}
        <span className="font-mono">accruedDaysSinceHire(hire_date)</span>{" "}
        minus approved annual leave. Article 99 du Code du Travail djiboutien.
      </p>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  hint,
  mono = false,
  accent,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  accent?: "brass" | "success" | "warning";
}) {
  const colorClass =
    accent === "brass"
      ? "text-[var(--brass)]"
      : accent === "success"
        ? "text-[var(--success)]"
        : "text-foreground";
  const iconClass =
    accent === "brass"
      ? "text-[var(--brass)]"
      : accent === "success"
        ? "text-[var(--success)]"
        : accent === "warning"
          ? "text-[var(--warning)]"
          : "text-muted-foreground";
  return (
    <div className="flex flex-col gap-2 bg-card p-5">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconClass}`} strokeWidth={1.75} />
        <span className="label-eyebrow">{label}</span>
      </div>
      <div
        className={`font-display text-xl ${colorClass} ${mono ? "font-mono tabular-nums tracking-tight" : ""}`}
      >
        {value}
      </div>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
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
