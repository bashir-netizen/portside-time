import Link from "next/link";
import {
  Users,
  Plane,
  Globe,
  ShieldAlert,
  CalendarRange,
  ChevronRight,
  Clock,
  TrendingUp,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { djiboutiDayWindow } from "@/lib/punch/window";
import { dayStatus } from "@/lib/punch/sequence";
import type { PunchType, DayStatus } from "@/lib/punch/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard — Portside Time" };

const TZ = "Africa/Djibouti";

export default async function AdminDashboard() {
  const { start: dayStart, end: dayEnd } = djiboutiDayWindow();
  // 7-day rolling window for the heatmap (yesterday-6 .. today)
  const weekStart = new Date(dayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  // Upcoming leave window: next 14 days
  const upcomingEnd = new Date(dayStart.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [
    employees,
    todaysPunches,
    weekPunches,
    pendingLeave,
    upcomingLeave,
    pendingIps,
    blockedAttempts,
  ] = await Promise.all([
    db.employee.findMany({
      where: { status: "active" },
      orderBy: { fullName: "asc" },
    }),
    db.punch.findMany({
      where: { punchedAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { punchedAt: "asc" },
      include: { corrections: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    db.punch.findMany({
      where: { punchedAt: { gte: weekStart, lt: dayEnd } },
      select: { employeeId: true, punchedAt: true },
    }),
    db.leaveRequest.count({
      where: { status: { in: ["pending", "pending_certificate"] } },
    }),
    db.leaveRequest.findMany({
      where: {
        status: "approved",
        startDate: { lte: upcomingEnd },
        endDate: { gte: dayStart },
      },
      orderBy: { startDate: "asc" },
      include: {
        employee: { select: { fullName: true } },
      },
      take: 10,
    }),
    db.pendingIp.count({ where: { status: "open" } }),
    db.auditLog.count({
      where: {
        action: { in: ["punch_blocked", "employee_login_blocked"] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  // Build today's per-employee state, including last effective punch.
  type TodayState = {
    types: PunchType[];
    last: { type: PunchType; at: Date } | null;
  };
  const todayByEmp = new Map<string, TodayState>();
  for (const e of employees) todayByEmp.set(e.id, { types: [], last: null });
  for (const p of todaysPunches) {
    const c = p.corrections[0];
    if (c?.correctionType === "void") continue;
    const at =
      c?.correctionType === "edit" && c.newPunchedAt
        ? c.newPunchedAt
        : p.punchedAt;
    const slot = todayByEmp.get(p.employeeId);
    if (!slot) continue;
    slot.types.push(p.punchType as PunchType);
    if (!slot.last || at > slot.last.at) {
      slot.last = { type: p.punchType as PunchType, at };
    }
  }

  // Week heatmap counts
  const dayMs = 24 * 60 * 60 * 1000;
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) days.push(new Date(weekStart.getTime() + i * dayMs));
  const weekByEmpDay = new Map<string, Map<string, number>>();
  for (const e of employees)
    weekByEmpDay.set(e.id, new Map(days.map((d) => [keyOf(d), 0])));
  for (const p of weekPunches) {
    const m = weekByEmpDay.get(p.employeeId);
    if (!m) continue;
    const k = keyOf(p.punchedAt);
    m.set(k, (m.get(k) ?? 0) + 1);
  }

  // Rollup: how many in / on lunch / finished / absent right now
  const liveTally = { in: 0, lunch: 0, finished: 0, absent: 0 };
  for (const e of employees) {
    const s = dayStatus(todayByEmp.get(e.id)?.types ?? []);
    if (s === "working" || s === "back_from_lunch") liveTally.in++;
    else if (s === "on_lunch") liveTally.lunch++;
    else if (s === "finished") liveTally.finished++;
    else liveTally.absent++;
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Page header — brass-tinted hero band so the top of the page reads
          as colored from the first glance, not a slab of cream. */}
      <header
        className="relative overflow-hidden rounded-sm border border-[var(--brass)]/40 bg-gradient-to-br from-[var(--brass)]/15 via-[var(--brass)]/8 to-transparent p-5 md:p-7"
      >
        {/* Decorative compass-rose mark in the corner */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full border border-[var(--brass)]/20"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-1.5rem] top-[-1.5rem] h-20 w-20 rounded-full border border-[var(--brass)]/30"
        />

        <div className="relative flex flex-col gap-1">
          <div className="label-eyebrow text-[var(--brass)]">
            Today · {todayLabel()}
          </div>
          <div className="flex items-end justify-between gap-3">
            <h1 className="font-display text-4xl tracking-tight md:text-5xl">
              Dashboard
            </h1>
            <div className="hidden text-right md:block">
              <div className="label-eyebrow text-[var(--brass)]">Live snapshot</div>
              <div className="font-mono text-xs text-muted-foreground">
                auto-refresh on navigation
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero: Live team tally */}
      <section aria-label="Live team status">
        <div className="grid gap-3 md:grid-cols-4">
          <LiveCard
            eyebrow="Working"
            value={liveTally.in}
            of={employees.length}
            accent="brass"
            icon={Clock}
          />
          <LiveCard
            eyebrow="On lunch"
            value={liveTally.lunch}
            of={employees.length}
            accent="warning"
            icon={Clock}
          />
          <LiveCard
            eyebrow="Finished today"
            value={liveTally.finished}
            of={employees.length}
            accent="success"
            icon={Clock}
          />
          <LiveCard
            eyebrow="Not started"
            value={liveTally.absent}
            of={employees.length}
            accent="muted"
            icon={Clock}
          />
        </div>
      </section>

      {/* Pending approvals + alerts strip */}
      <section
        aria-label="Pending approvals"
        className="grid gap-3 md:grid-cols-3"
      >
        <ApprovalCard
          href="/admin/leave"
          eyebrow="Leave requests"
          count={pendingLeave}
          icon={Plane}
          singular="pending request"
          plural="pending requests"
        />
        <ApprovalCard
          href="/admin/ip-allowlist"
          eyebrow="New IP approvals"
          count={pendingIps}
          icon={Globe}
          singular="pending IP"
          plural="pending IPs"
        />
        <ApprovalCard
          href="/admin/audit"
          eyebrow="Blocked attempts (24h)"
          count={blockedAttempts}
          icon={ShieldAlert}
          singular="incident"
          plural="incidents"
        />
      </section>

      {/* Team status grid */}
      <section aria-label="Who's in now" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-2xl tracking-tight">
              Who's in now
            </h2>
          </div>
          <Link
            href="/admin/employees"
            className="label-eyebrow hover:text-foreground"
          >
            All employees <ChevronRight className="inline-block h-3 w-3" />
          </Link>
        </div>

        {employees.length === 0 ? (
          <EmptyHint text="No active employees yet. Create one under Employees." />
        ) : (
          <Card className="bg-card p-0">
            <ul className="divide-y divide-border">
              {employees.map((e) => {
                const slot = todayByEmp.get(e.id);
                const types = slot?.types ?? [];
                const last = slot?.last ?? null;
                const status = dayStatus(types);
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    {/* Avatar mark */}
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-background font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                    >
                      {initialsOf(e.fullName)}
                    </span>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Link
                        href={`/admin/employees/${e.id}`}
                        className="truncate text-sm font-medium hover:underline-brass"
                      >
                        {e.fullName}
                      </Link>
                      <span className="truncate text-xs text-muted-foreground">
                        {e.position}
                      </span>
                    </div>

                    {last ? (
                      <div className="hidden text-right md:flex md:flex-col md:leading-tight">
                        <span className="label-eyebrow !text-[0.625rem]">
                          {labelOf(last.type)}
                        </span>
                        <span className="font-mono text-xs tabular-nums text-foreground/80">
                          {formatInTimeZone(last.at, TZ, "HH:mm")}
                        </span>
                      </div>
                    ) : (
                      <span className="hidden font-mono text-xs text-muted-foreground/60 md:inline-block">
                        no punch yet
                      </span>
                    )}

                    <LiveStatusBadge status={status} />
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      {/* Upcoming leave */}
      <section aria-label="Upcoming leave" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-2xl tracking-tight">
              Upcoming leave
            </h2>
            <span className="label-eyebrow">next 14 days</span>
          </div>
          <Link
            href="/admin/leave"
            className="label-eyebrow hover:text-foreground"
          >
            All leave <ChevronRight className="inline-block h-3 w-3" />
          </Link>
        </div>
        {upcomingLeave.length === 0 ? (
          <EmptyHint text="No approved leave in the next two weeks." />
        ) : (
          <Card className="bg-card p-0">
            <ul className="divide-y divide-border">
              {upcomingLeave.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  <Plane
                    className="h-4 w-4 shrink-0 text-[var(--success)]"
                    strokeWidth={1.75}
                  />
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="font-medium">{l.employee.fullName}</span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {formatInTimeZone(l.startDate, TZ, "d LLL")} →{" "}
                      {formatInTimeZone(l.endDate, TZ, "d LLL yyyy")} ·{" "}
                      {l.days} day{l.days === 1 ? "" : "s"}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] uppercase tracking-wider"
                  >
                    {l.leaveType}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* Weekly heatmap */}
      <section aria-label="This week activity" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-2xl tracking-tight">This week</h2>
            <span className="label-eyebrow">last 7 days</span>
          </div>
          <Link
            href="/admin/punches"
            className="label-eyebrow hover:text-foreground"
          >
            Punch log <ChevronRight className="inline-block h-3 w-3" />
          </Link>
        </div>
        <Card className="overflow-x-auto bg-card p-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="label-eyebrow px-4 py-2.5 text-left">
                  Employee
                </th>
                {days.map((d) => (
                  <th
                    key={keyOf(d)}
                    className="label-eyebrow px-2 py-2.5 text-center"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px]">
                        {formatInTimeZone(d, TZ, "EEE")}
                      </span>
                      <span className="font-mono text-[11px] text-foreground/70 tabular-nums">
                        {formatInTimeZone(d, TZ, "d")}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="label-eyebrow px-3 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => {
                const empWeek = weekByEmpDay.get(e.id);
                const total = Array.from(empWeek?.values() ?? []).reduce(
                  (s, n) => s + n,
                  0
                );
                return (
                  <tr
                    key={e.id}
                    className="border-t border-border first:border-t-0"
                  >
                    <td className="px-4 py-2 font-medium">{e.fullName}</td>
                    {days.map((d) => {
                      const count = empWeek?.get(keyOf(d)) ?? 0;
                      return (
                        <td
                          key={keyOf(d)}
                          className="px-2 py-1.5 text-center"
                        >
                          <HeatCell count={count} />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Separator />
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs text-muted-foreground">
            <span>Cell darkness = number of punches recorded that day</span>
            <div className="flex items-center gap-2">
              <span>0</span>
              <HeatCell count={0} />
              <HeatCell count={1} />
              <HeatCell count={2} />
              <HeatCell count={3} />
              <HeatCell count={5} />
              <span>5+</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

// ───────────────────────── helpers ─────────────────────────

function todayLabel() {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date());
}

function keyOf(d: Date): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
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

const PUNCH_SHORT: Record<PunchType, string> = {
  shift_in: "in",
  lunch_out: "lunch out",
  lunch_in: "lunch in",
  shift_out: "out",
};
function labelOf(t: PunchType): string {
  return `last · ${PUNCH_SHORT[t]}`;
}

function LiveCard({
  eyebrow,
  value,
  of,
  accent,
  icon: Icon,
}: {
  eyebrow: string;
  value: number;
  of: number;
  accent: "brass" | "warning" | "success" | "muted";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  // Each card gets a tinted background + border + icon medallion in its accent
  // so the row reads as actually colored, not a row of cream rectangles.
  const tint =
    accent === "brass"
      ? "border-[var(--brass)]/40 bg-[var(--brass)]/10"
      : accent === "warning"
        ? "border-[var(--warning)]/40 bg-[var(--warning)]/12"
        : accent === "success"
          ? "border-[var(--success)]/40 bg-[var(--success)]/10"
          : "border-border bg-muted/40";
  const textAccent =
    accent === "brass"
      ? "text-[var(--brass)]"
      : accent === "warning"
        ? "text-[color-mix(in_oklch,var(--warning)_70%,var(--foreground))]"
        : accent === "success"
          ? "text-[var(--success)]"
          : "text-muted-foreground";
  const medallion =
    accent === "brass"
      ? "border-[var(--brass)]/60 bg-background text-[var(--brass)]"
      : accent === "warning"
        ? "border-[var(--warning)]/60 bg-background text-[var(--warning)]"
        : accent === "success"
          ? "border-[var(--success)]/60 bg-background text-[var(--success)]"
          : "border-border bg-background text-muted-foreground";
  return (
    <Card className={cn("p-5", tint)}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border",
            medallion
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <span className={cn("label-eyebrow", textAccent)}>{eyebrow}</span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "font-display text-4xl tracking-tight tabular-nums",
                textAccent
              )}
            >
              {value}
            </span>
            <span className="text-sm text-muted-foreground">/ {of}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ApprovalCard({
  href,
  eyebrow,
  count,
  icon: Icon,
  singular,
  plural,
}: {
  href: string;
  eyebrow: string;
  count: number;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  singular: string;
  plural: string;
}) {
  const has = count > 0;
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-sm border p-4 transition-colors",
        has
          ? "border-[var(--brass)]/50 bg-[var(--brass)]/10 hover:border-[var(--brass)] hover:bg-[var(--brass)]/15"
          : "border-border bg-card hover:border-foreground/30 hover:bg-muted/50"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border",
          has
            ? "border-[var(--brass)]/60 bg-background text-[var(--brass)]"
            : "border-border bg-background text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "label-eyebrow",
            has ? "text-[var(--brass)]" : "text-muted-foreground"
          )}
        >
          {eyebrow}
        </span>
        <span className="text-sm">
          <span
            className={cn(
              "font-display text-2xl tracking-tight tabular-nums",
              has ? "text-[var(--brass)]" : "text-muted-foreground"
            )}
          >
            {count}
          </span>{" "}
          <span className="text-xs text-muted-foreground">
            {count === 1 ? singular : plural}
          </span>
        </span>
      </div>
      <ChevronRight
        className={cn(
          "h-4 w-4 transition-transform group-hover:translate-x-1",
          has ? "text-[var(--brass)]" : "text-muted-foreground"
        )}
      />
    </Link>
  );
}

function LiveStatusBadge({ status }: { status: DayStatus }) {
  switch (status) {
    case "working":
      return (
        <Badge className="border-[var(--brass)]/30 bg-[var(--brass)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--brass)] hover:bg-[var(--brass)]/15">
          In
        </Badge>
      );
    case "back_from_lunch":
      return (
        <Badge className="border-[var(--brass)]/30 bg-[var(--brass)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--brass)] hover:bg-[var(--brass)]/15">
          In
        </Badge>
      );
    case "on_lunch":
      return (
        <Badge className="border-[var(--warning)]/30 bg-[var(--warning)]/15 font-mono text-[10px] uppercase tracking-wider text-foreground hover:bg-[var(--warning)]/15">
          Lunch
        </Badge>
      );
    case "finished":
      return (
        <Badge className="border-[var(--success)]/30 bg-[var(--success)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--success)] hover:bg-[var(--success)]/15">
          Done
        </Badge>
      );
    case "not_started":
      return (
        <Badge
          variant="outline"
          className="border-border bg-card font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          Absent
        </Badge>
      );
  }
}

function HeatCell({ count }: { count: number }) {
  // 5 saturation levels, brass-based — fits the maritime palette
  const level = count === 0 ? 0 : Math.min(4, Math.ceil(count / 1));
  const classes = [
    "bg-muted/40",
    "bg-[color-mix(in_oklch,var(--brass)_15%,var(--muted))]",
    "bg-[color-mix(in_oklch,var(--brass)_30%,var(--muted))]",
    "bg-[color-mix(in_oklch,var(--brass)_50%,var(--muted))]",
    "bg-[var(--brass)]",
  ];
  return (
    <span
      title={`${count} punch${count === 1 ? "" : "es"}`}
      className={cn(
        "inline-block size-5 rounded-sm border border-border/50",
        classes[level]
      )}
    />
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
