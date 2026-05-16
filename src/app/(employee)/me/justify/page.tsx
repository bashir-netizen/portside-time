import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  AlertTriangle,
  Clock4,
  CheckCircle2,
  XCircle,
  Hourglass,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getCompanyConfig } from "@/lib/config";
import { flipExpiredJustifications } from "@/lib/punch/late-incident";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { JustifyForm } from "./JustifyForm";

export const metadata = { title: "Justify — Portside Time" };

const TZ = "Africa/Djibouti";

const STATUS_META: Record<
  string,
  { label: string; tone: "warn" | "info" | "ok" | "bad"; icon: typeof CheckCircle2 }
> = {
  pending_justification: { label: "Awaiting your reason", tone: "warn", icon: Hourglass },
  submitted: { label: "Submitted — awaiting decision", tone: "info", icon: Clock4 },
  justified: { label: "Justified", tone: "ok", icon: CheckCircle2 },
  manager_unjustified: { label: "Rejected by admin", tone: "bad", icon: XCircle },
  auto_unjustified: { label: "Auto — window elapsed", tone: "bad", icon: XCircle },
};

const KIND_LABEL: Record<string, string> = {
  late_arrival: "Late arrival",
  early_leave: "Left early",
  missed_punch_out: "Missed punch-out",
};

export default async function JustifyPage() {
  const session = await readSession();
  if (!session?.employeeId || session.role !== "employee") redirect("/login");

  // Same lazy auto-flip pattern as /admin/late — keeps statuses honest
  // without depending on a separate cron sidecar.
  await flipExpiredJustifications();

  const [incidents, config] = await Promise.all([
    db.lateIncident.findMany({
      where: { employeeId: session.employeeId },
      orderBy: [{ status: "asc" }, { incidentDate: "desc" }],
      take: 60,
    }),
    getCompanyConfig(),
  ]);

  const open = incidents.filter((i) => i.status === "pending_justification");
  const submitted = incidents.filter((i) => i.status === "submitted");
  const decided = incidents.filter(
    (i) => !["pending_justification", "submitted"].includes(i.status),
  );

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow flex items-center gap-1.5">
          <Link href="/me" className="hover:text-foreground">
            Today
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span>Justify</span>
        </div>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Justify a late incident
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          When a punch lands late (or you leave early), the system flags it
          here. You have{" "}
          <span className="font-mono">{config.justificationWindowHours}h</span>{" "}
          to explain — after that it auto-flips to unjustified and may count
          toward the disciplinary threshold.
        </p>
      </header>

      <div className="rule-double" aria-hidden />

      {open.length === 0 && submitted.length === 0 ? (
        <Card className="border-[var(--success)]/30 bg-[var(--success)]/5 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
            <div>
              <h2 className="font-display text-lg tracking-tight">
                Nothing to justify — you&apos;re all clear.
              </h2>
              <p className="text-xs text-muted-foreground">
                Keep punching on time. If something comes up, this page is
                where you&apos;ll handle it.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {open.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeader
            icon={AlertTriangle}
            label="Needs your justification"
            count={open.length}
            tone="warn"
          />
          <div className="grid gap-3">
            {open.map((i) => {
              const hoursRemaining = Math.max(
                0,
                Math.ceil(
                  (i.createdAt.getTime() +
                    config.justificationWindowHours * 60 * 60 * 1000 -
                    Date.now()) /
                    (60 * 60 * 1000),
                ),
              );
              return (
                <IncidentCard key={i.id} incident={i}>
                  <Separator className="my-3" />
                  <JustifyForm
                    incidentId={i.id}
                    hoursRemaining={hoursRemaining}
                  />
                </IncidentCard>
              );
            })}
          </div>
        </section>
      ) : null}

      {submitted.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeader
            icon={Clock4}
            label="Submitted — awaiting admin decision"
            count={submitted.length}
            tone="info"
          />
          <div className="grid gap-3">
            {submitted.map((i) => (
              <IncidentCard key={i.id} incident={i}>
                {i.reason ? (
                  <p className="mt-2 rounded-sm border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    &ldquo;{i.reason}&rdquo;
                  </p>
                ) : null}
              </IncidentCard>
            ))}
          </div>
        </section>
      ) : null}

      {decided.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeader
            icon={CheckCircle2}
            label="History"
            count={decided.length}
            tone="muted"
          />
          <div className="grid gap-3">
            {decided.map((i) => (
              <IncidentCard key={i.id} incident={i}>
                {i.reason ? (
                  <p className="mt-2 rounded-sm border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    &ldquo;{i.reason}&rdquo;
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
              </IncidentCard>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  count,
  tone,
}: {
  icon: typeof AlertTriangle;
  label: string;
  count: number;
  tone: "warn" | "info" | "muted";
}) {
  const color =
    tone === "warn"
      ? "text-[var(--warning)]"
      : tone === "info"
        ? "text-[var(--brass)]"
        : "text-muted-foreground";
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <h2 className="font-display text-xl tracking-tight">{label}</h2>
      <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
        {count}
      </Badge>
    </div>
  );
}

function IncidentCard({
  incident,
  children,
}: {
  incident: {
    id: string;
    incidentDate: Date;
    kind: string;
    minutes: number;
    status: string;
    createdAt: Date;
  };
  children?: React.ReactNode;
}) {
  const meta = STATUS_META[incident.status] ?? STATUS_META.pending_justification!;
  const Icon = meta.icon;
  const dateLabel = formatInTimeZone(incident.incidentDate, TZ, "EEEE d MMMM");
  const toneClass =
    meta.tone === "warn"
      ? "border-[var(--warning)]/30 bg-[var(--warning)]/5"
      : meta.tone === "info"
        ? "border-[var(--brass)]/30 bg-[var(--brass)]/5"
        : meta.tone === "ok"
          ? "border-[var(--success)]/30 bg-[var(--success)]/5"
          : "border-[var(--destructive)]/30 bg-[var(--destructive)]/5";
  const badgeColor =
    meta.tone === "warn"
      ? "text-[var(--warning)]"
      : meta.tone === "info"
        ? "text-[var(--brass)]"
        : meta.tone === "ok"
          ? "text-[var(--success)]"
          : "text-[var(--destructive)]";

  return (
    <Card className={`${toneClass} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg tracking-tight">
              {KIND_LABEL[incident.kind] ?? incident.kind}
            </span>
            <Badge
              variant="outline"
              className="font-mono text-[10px] tabular-nums"
            >
              {incident.minutes} min
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {dateLabel} · recorded{" "}
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
