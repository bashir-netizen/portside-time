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
import { getLocale, getTranslations } from "next-intl/server";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { accruedDaysSinceHire } from "@/lib/leave/accrual";
import { getCompanyConfig } from "@/lib/config";
import { dateLocaleFor } from "@/i18n/date";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata() {
  const t = await getTranslations("pay");
  const tCommon = await getTranslations("common");
  return { title: `${t("title")} — ${tCommon("appName")}` };
}

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
  const config = await getCompanyConfig();
  const accrued = accruedDaysSinceHire(
    employee.hireDate,
    new Date(),
    config.annualLeaveAccrualPerMonth,
  );
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

  const [t, tCommon, locale] = await Promise.all([
    getTranslations("pay"),
    getTranslations("common"),
    getLocale(),
  ]);
  const dateLocale = dateLocaleFor(locale as "fr" | "en");

  // Tenure
  const hireMonths = monthsBetween(employee.hireDate, now);
  const hireYears = Math.floor(hireMonths / 12);
  const hireMonthsRem = hireMonths % 12;
  const tenureLabel =
    hireYears > 0
      ? t("tenureYearsMonths", { years: hireYears, months: hireMonthsRem })
      : t("tenureMonths", { months: hireMonthsRem });

  const monthLabel = formatInTimeZone(now, TZ, "LLLL yyyy", { locale: dateLocale });

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow flex items-center gap-1.5">
          <Link href="/me" className="hover:text-foreground">
            {tCommon("today")}
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span>{t("crumb")}</span>
        </div>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          {t("intro")}
        </p>
      </header>

      <div className="rule-double" aria-hidden />

      {/* Two hero cards: monthly salary + remaining annual leave */}
      <section className="grid gap-4 md:grid-cols-2">
        <HeroCard
          eyebrow={t("monthlySalary")}
          icon={Wallet}
          primary={DJF.format(employee.monthlySalary)}
          secondary={t("secondarySalary", {
            position: employee.position,
            tenure: tenureLabel,
          })}
        />
        <HeroCard
          eyebrow={t("annualLeaveRemaining")}
          icon={Plane}
          primary={t("daysSuffix", { count: Number(remainingAnnual.toFixed(1)) })}
          secondary={t("secondaryLeave", {
            accrued: accrued.toFixed(1),
            used: usedAnnual.toFixed(1),
          })}
          accent="success"
        />
      </section>

      {/* This-month-so-far */}
      <section aria-label={monthLabel} className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl tracking-tight">
            {monthLabel}
          </h2>
          <Badge
            variant="outline"
            className="font-mono text-[10px] uppercase tracking-wider"
          >
            {t("liveLock")}
          </Badge>
        </div>
        <Card className="bg-card p-0">
          <div className="grid grid-cols-2 divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
            <Stat
              icon={CalendarCheck}
              eyebrow={t("stats.daysWorked")}
              value={String(daysWorkedThisMonth)}
            />
            <Stat
              icon={Briefcase}
              eyebrow={t("stats.lateIncidents")}
              value="0"
            />
            <Stat
              icon={Coins}
              eyebrow={t("stats.perDiem")}
              value="—"
              hint={t("stats.perDiemHint")}
              dim
            />
            <Stat
              icon={Plane}
              eyebrow={t("stats.leaveTaken")}
              value={t("daysAbbrev", { count: usedAnnual.toFixed(1) })}
              hint={t("stats.leaveTakenHint")}
            />
          </div>
        </Card>
      </section>

      {/* Why each number — small compliance footnote */}
      <section className="flex flex-col gap-3">
        <h2 className="label-eyebrow">{t("rules.header")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <RuleCard
            title={t("rules.salaryTitle")}
            body={t("rules.salaryBody")}
            soonLabel={t("rules.soon")}
          />
          <RuleCard
            title={t("rules.leaveTitle")}
            body={t("rules.leaveBody")}
            soonLabel={t("rules.soon")}
          />
          <RuleCard
            title={t("rules.perDiemTitle")}
            body={t("rules.perDiemBody")}
            soonLabel={t("rules.soon")}
            soon
          />
          <RuleCard
            title={t("rules.lateTitle")}
            body={t("rules.lateBody")}
            soonLabel={t("rules.soon")}
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
  soonLabel,
}: {
  title: string;
  body: string;
  soon?: boolean;
  soonLabel: string;
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
            {soonLabel}
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
