import { redirect } from "next/navigation";
import {
  Wallet,
  Plane,
  Briefcase,
  Coins,
  CalendarCheck,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { accruedDaysSinceHire } from "@/lib/leave/accrual";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Pay & Leave — Portside Time",
};

const TZ = "Africa/Djibouti";

const DJF = new Intl.NumberFormat("fr-DJ", {
  style: "currency",
  currency: "DJF",
  maximumFractionDigits: 0,
});

export default async function PayPage() {
  const session = await readSession();
  if (!session?.employeeId || session.role !== "employee") redirect("/login");

  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
  });
  if (!employee) redirect("/login");

  // Annual leave: accrued via Article 99 (2.5/month), minus approved annual usage.
  const allApprovedAnnual = await db.leaveRequest.findMany({
    where: {
      employeeId: session.employeeId,
      leaveType: "annual",
      status: "approved",
    },
    select: { days: true },
  });
  const accrued = accruedDaysSinceHire(employee.hireDate);
  const usedAnnual = allApprovedAnnual.reduce((s, r) => s + r.days, 0);
  const remainingAnnual = Math.max(0, accrued - usedAnnual);

  // This-month-so-far: count distinct work-days they've punched in this month.
  const now = new Date();
  const monthStartLocal = formatInTimeZone(now, TZ, "yyyy-MM") + "-01T00:00:00";
  const monthStart = new Date(monthStartLocal + "+03:00");
  const punchesThisMonth = await db.punch.findMany({
    where: {
      employeeId: session.employeeId,
      punchType: "shift_in",
      punchedAt: { gte: monthStart, lte: now },
    },
    select: { punchedAt: true },
  });
  const daysWorkedThisMonth = new Set(
    punchesThisMonth.map((p) => formatInTimeZone(p.punchedAt, TZ, "yyyy-MM-dd"))
  ).size;

  // Tenure
  const hireMonths = monthsBetween(employee.hireDate, now);
  const hireYears = Math.floor(hireMonths / 12);
  const hireMonthsRem = hireMonths % 12;
  const tenureLabel =
    hireYears > 0
      ? `${hireYears}y ${hireMonthsRem}mo`
      : `${hireMonthsRem} month${hireMonthsRem === 1 ? "" : "s"}`;

  const monthLabel = formatInTimeZone(now, TZ, "LLLL yyyy");

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow flex items-center gap-1.5">
          <Link href="/me" className="hover:text-foreground">
            Today
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span>Pay &amp; Leave</span>
        </div>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          Pay &amp; Leave
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          What you've earned, what you've taken. Payroll runs externally — these
          numbers are information only, not a sanction or an entitlement
          notice.
        </p>
      </header>

      <div className="rule-double" aria-hidden />

      {/* Two hero cards: monthly salary + remaining annual leave */}
      <section className="grid gap-4 md:grid-cols-2">
        <HeroCard
          eyebrow="Monthly salary"
          icon={Wallet}
          primary={DJF.format(employee.monthlySalary)}
          secondary={`${employee.position} · ${tenureLabel} at Portside`}
        />
        <HeroCard
          eyebrow="Annual leave remaining"
          icon={Plane}
          primary={`${remainingAnnual.toFixed(1)} days`}
          secondary={`Accrued ${accrued.toFixed(1)} · Used ${usedAnnual.toFixed(1)}`}
          accent="success"
        />
      </section>

      {/* This-month-so-far */}
      <section aria-label="This month so far" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl tracking-tight">
            {monthLabel}
          </h2>
          <Badge
            variant="outline"
            className="font-mono text-[10px] uppercase tracking-wider"
          >
            Live · locks at month end
          </Badge>
        </div>
        <Card className="bg-card p-0">
          <div className="grid grid-cols-2 divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
            <Stat
              icon={CalendarCheck}
              eyebrow="Days worked"
              value={String(daysWorkedThisMonth)}
            />
            <Stat
              icon={Briefcase}
              eyebrow="Late incidents"
              value="0"
              hint="Pending lateness flow"
            />
            <Stat
              icon={Coins}
              eyebrow="Per-diem accrued"
              value="—"
              hint="Awaits busy-day spec"
              dim
            />
            <Stat
              icon={Plane}
              eyebrow="Leave taken"
              value={`${usedAnnual.toFixed(1)}d`}
              hint="Annual only"
            />
          </div>
        </Card>
      </section>

      {/* Why each number — small compliance footnote */}
      <section className="flex flex-col gap-3">
        <h2 className="label-eyebrow">How these numbers work</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <RuleCard
            title="Salary"
            body="Fixed monthly, paid externally. Days not worked are not paid (rémunération calculée sur le temps effectivement travaillé). Not a sanction — just no pay for time not on the clock."
          />
          <RuleCard
            title="Annual leave"
            body="2.5 days per completed month of service (Article 99 du Code du Travail djiboutien). Approved annual leave is deducted; sick / maternity / family-event leave is not."
          />
          <RuleCard
            title="Per diem"
            body="Owed on busy days when continuous-day employees take lunch on site (work past the normal end). Tracking lands when the busy-day workflow ships."
            soon
          />
          <RuleCard
            title="Late incidents"
            body="Recorded when you punch after the grace period (default 15 min). Justification flow lets you submit a reason within 48h. UI lands in the lateness PR."
            soon
          />
        </div>
      </section>
    </div>
  );
}

function HeroCard({
  eyebrow,
  icon: Icon,
  primary,
  secondary,
  accent = "brass",
}: {
  eyebrow: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  primary: string;
  secondary: string;
  accent?: "brass" | "success";
}) {
  const accentClass =
    accent === "success" ? "text-[var(--success)]" : "text-[var(--brass)]";
  return (
    <Card className="bg-card p-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className={`h-4 w-4 ${accentClass}`} strokeWidth={1.75} />
          <span className="label-eyebrow">{eyebrow}</span>
        </div>
        <div className="font-display text-4xl tracking-tight tabular-nums text-foreground md:text-5xl">
          {primary}
        </div>
        <div className="text-xs text-muted-foreground">{secondary}</div>
      </div>
    </Card>
  );
}

function Stat({
  icon: Icon,
  eyebrow,
  value,
  hint,
  dim = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  value: string;
  hint?: string;
  dim?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="label-eyebrow !text-[0.625rem]">{eyebrow}</span>
      </div>
      <div
        className={`font-display text-2xl tabular-nums ${
          dim ? "text-muted-foreground/60" : "text-foreground"
        }`}
      >
        {value}
      </div>
      {hint ? (
        <div className="text-[10px] text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

function RuleCard({
  title,
  body,
  soon = false,
}: {
  title: string;
  body: string;
  soon?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-sm border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        {soon ? (
          <Badge
            variant="outline"
            className="font-mono text-[9px] uppercase tracking-wider"
          >
            Soon
          </Badge>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function monthsBetween(from: Date, to: Date): number {
  const years = to.getUTCFullYear() - from.getUTCFullYear();
  const months = to.getUTCMonth() - from.getUTCMonth();
  let total = years * 12 + months;
  if (to.getUTCDate() < from.getUTCDate()) total -= 1;
  return Math.max(0, total);
}
