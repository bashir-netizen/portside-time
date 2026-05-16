import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock4,
  Hourglass,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { flipExpiredJustifications } from "@/lib/punch/late-incident";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LateDecisionForm } from "./LateDecisionForm";

export const metadata = { title: "Late incidents — Portside Time" };

const TZ = "Africa/Djibouti";

const KIND_LABEL: Record<string, string> = {
  late_arrival: "Late arrival",
  early_leave: "Left early",
  missed_punch_out: "Missed punch-out",
};

const STATUS_META: Record<
  string,
  { label: string; tone: "warn" | "info" | "ok" | "bad" | "muted"; icon: typeof CheckCircle2 }
> = {
  pending_justification: { label: "Awaiting employee", tone: "warn", icon: Hourglass },
  submitted: { label: "Awaiting your decision", tone: "info", icon: Clock4 },
  justified: { label: "Justified", tone: "ok", icon: CheckCircle2 },
  manager_unjustified: { label: "Rejected", tone: "bad", icon: XCircle },
  auto_unjustified: { label: "Auto — window elapsed", tone: "bad", icon: XCircle },
};

export default async function LateIncidentsPage() {
  // Opportunistic auto-flip: any incidents older than the justification
  // window without a submission flip to auto_unjustified on every page load.
  // Cheap (one indexed query); no cron infra needed for MVP.
  await flipExpiredJustifications();

  const [incidents, employees] = await Promise.all([
    db.lateIncident.findMany({
      orderBy: [{ status: "asc" }, { incidentDate: "desc" }],
      take: 200,
    }),
    db.employee.findMany({
      where: { status: "active" },
      select: { id: true, fullName: true, position: true },
    }),
  ]);
  const empById = new Map(employees.map((e) => [e.id, e]));

  // Article 59 al. 9 — count unjustified incidents per employee in the last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const unjustified = await db.lateIncident.groupBy({
    by: ["employeeId"],
    where: {
      status: { in: ["manager_unjustified", "auto_unjustified"] },
      incidentDate: { gte: since },
    },
    _count: { _all: true },
  });
  const flagged = unjustified.filter((u) => u._count._all >= 3);

  const buckets = {
    submitted: incidents.filter((i) => i.status === "submitted"),
    pending: incidents.filter((i) => i.status === "pending_justification"),
    decided: incidents.filter((i) =>
      ["justified", "manager_unjustified", "auto_unjustified"].includes(i.status),
    ),
  };

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow">Discipline</div>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Late incidents
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Punches that landed late or shifts that ended early. Employees have
          a justification window to explain; you accept or reject each one.
          Three rejected/auto-unjustified incidents in 30 days flags an
          employee under{" "}
          <span className="font-mono">Article 59 al. 9</span>.
        </p>
      </header>

      <div className="rule-double" aria-hidden />

      {/* KPI strip */}
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi
          label="Awaiting decision"
          value={buckets.submitted.length}
          tone="info"
          icon={Clock4}
        />
        <Kpi
          label="Awaiting employee"
          value={buckets.pending.length}
          tone="warn"
          icon={Hourglass}
        />
        <Kpi
          label="30d unjustified"
          value={unjustified.reduce((s, u) => s + u._count._all, 0)}
          tone="muted"
          icon={XCircle}
        />
        <Kpi
          label="Flagged employees"
          value={flagged.length}
          tone={flagged.length > 0 ? "bad" : "muted"}
          icon={ShieldAlert}
        />
      </div>

      {flagged.length > 0 ? (
        <Card className="border-[var(--destructive)]/40 bg-[var(--destructive)]/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-[var(--destructive)]" />
            <div>
              <h2 className="font-display text-lg tracking-tight">
                {flagged.length} employee{flagged.length === 1 ? "" : "s"}{" "}
                over the 3-in-30 threshold
              </h2>
              <ul className="mt-1.5 flex flex-col gap-1 text-xs">
                {flagged.map((f) => {
                  const e = empById.get(f.employeeId);
                  return (
                    <li key={f.employeeId}>
                      <Link
                        href={`/admin/employees/${f.employeeId}`}
                        className="hover:text-foreground hover:underline"
                      >
                        <span className="font-medium">
                          {e?.fullName ?? f.employeeId}
                        </span>
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        — {f._count._all} unjustified in last 30 days
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Awaiting admin decision */}
      <Section
        title="Awaiting your decision"
        icon={Clock4}
        items={buckets.submitted}
        empty="Nothing waiting on you — refresh after the next late punch."
        render={(i) => (
          <Row incident={i} employee={empById.get(i.employeeId)}>
            {i.reason ? (
              <p className="mt-2 rounded-sm border border-border bg-muted/40 px-3 py-2 text-xs">
                <span className="font-mono uppercase tracking-wider text-muted-foreground">
                  Reason:
                </span>{" "}
                {i.reason}
              </p>
            ) : null}
            <Separator className="my-3" />
            <LateDecisionForm incidentId={i.id} />
          </Row>
        )}
      />

      {/* Awaiting employee */}
      <Section
        title="Awaiting employee"
        icon={Hourglass}
        items={buckets.pending}
        empty="No incidents currently waiting on employee input."
        render={(i) => <Row incident={i} employee={empById.get(i.employeeId)} />}
      />

      {/* Decided / history */}
      <Section
        title="History (most recent first)"
        icon={CheckCircle2}
        items={buckets.decided.slice(0, 30)}
        empty="No decided incidents yet."
        render={(i) => (
          <Row incident={i} employee={empById.get(i.employeeId)}>
            {i.reason ? (
              <p className="mt-2 rounded-sm border border-border bg-muted/40 px-3 py-2 text-xs">
                <span className="font-mono uppercase tracking-wider text-muted-foreground">
                  Reason:
                </span>{" "}
                {i.reason}
              </p>
            ) : null}
            {i.decisionNotes ? (
              <p className="mt-2 text-xs">
                <span className="font-mono uppercase tracking-wider text-muted-foreground">
                  Admin:
                </span>{" "}
                {i.decisionNotes}
              </p>
            ) : null}
          </Row>
        )}
      />
    </div>
  );
}

function Section<T>({
  title,
  icon: Icon,
  items,
  empty,
  render,
}: {
  title: string;
  icon: typeof AlertTriangle;
  items: T[];
  empty: string;
  render: (i: T) => React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-2xl tracking-tight">{title}</h2>
        <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
          {items.length}
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid gap-3">{items.map(render)}</div>
      )}
    </section>
  );
}

function Row({
  incident,
  employee,
  children,
}: {
  incident: {
    id: string;
    incidentDate: Date;
    createdAt: Date;
    kind: string;
    minutes: number;
    status: string;
    employeeId: string;
  };
  employee?: { id: string; fullName: string; position: string };
  children?: React.ReactNode;
}) {
  const meta = STATUS_META[incident.status] ?? STATUS_META.pending_justification!;
  const Icon = meta.icon;
  const toneClass =
    meta.tone === "warn"
      ? "border-[var(--warning)]/30 bg-[var(--warning)]/5"
      : meta.tone === "info"
        ? "border-[var(--brass)]/30 bg-[var(--brass)]/5"
        : meta.tone === "ok"
          ? "border-[var(--success)]/30 bg-[var(--success)]/5"
          : meta.tone === "bad"
            ? "border-[var(--destructive)]/30 bg-[var(--destructive)]/5"
            : "border-border bg-card";
  const badgeColor =
    meta.tone === "warn"
      ? "text-[var(--warning)]"
      : meta.tone === "info"
        ? "text-[var(--brass)]"
        : meta.tone === "ok"
          ? "text-[var(--success)]"
          : meta.tone === "bad"
            ? "text-[var(--destructive)]"
            : "text-muted-foreground";
  return (
    <Card className={`${toneClass} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/employees/${incident.employeeId}`}
              className="font-display text-lg tracking-tight hover:underline"
            >
              {employee?.fullName ?? incident.employeeId}
            </Link>
            <Badge variant="outline" className="font-mono text-[10px]">
              {KIND_LABEL[incident.kind] ?? incident.kind}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
              {incident.minutes} min
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {employee?.position ?? "—"} ·{" "}
            {formatInTimeZone(incident.incidentDate, TZ, "EEEE d MMMM")} ·
            recorded{" "}
            {formatInTimeZone(incident.createdAt, TZ, "HH:mm")}
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-sm border border-border bg-background px-2 py-1 text-[10px] font-mono uppercase tracking-wider ${badgeColor}`}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>
      {children}
    </Card>
  );
}

function Kpi({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "warn" | "info" | "bad" | "muted";
  icon: typeof AlertTriangle;
}) {
  const accent =
    tone === "warn"
      ? "border-[var(--warning)]/30 bg-[var(--warning)]/5 text-[var(--warning)]"
      : tone === "info"
        ? "border-[var(--brass)]/30 bg-[var(--brass)]/5 text-[var(--brass)]"
        : tone === "bad"
          ? "border-[var(--destructive)]/30 bg-[var(--destructive)]/5 text-[var(--destructive)]"
          : "border-border bg-card text-muted-foreground";
  return (
    <Card className={`flex items-center gap-3 p-4 ${accent}`}>
      <Icon className="h-5 w-5" />
      <div className="flex flex-col">
        <span className="text-[10px] font-mono uppercase tracking-wider">
          {label}
        </span>
        <span className="font-display text-3xl tracking-tight tabular-nums text-foreground">
          {value}
        </span>
      </div>
    </Card>
  );
}
