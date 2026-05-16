import Link from "next/link";
import {
  Inbox,
  History,
  Calendar,
  ChevronDown,
  PlusCircle,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/schemas/leave";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DecideButtons } from "./DecideButtons";
import { NewLeaveForm } from "./NewLeaveForm";

export const metadata = { title: "Leave — Portside Time" };

const TZ = "Africa/Djibouti";

export default async function LeavePage() {
  const [pending, recent, employees] = await Promise.all([
    db.leaveRequest.findMany({
      where: { status: { in: ["pending", "pending_certificate"] } },
      orderBy: { createdAt: "desc" },
      include: { employee: { select: { fullName: true } } },
    }),
    db.leaveRequest.findMany({
      where: { status: { notIn: ["pending", "pending_certificate"] } },
      orderBy: { decidedAt: "desc" },
      take: 20,
      include: { employee: { select: { fullName: true } } },
    }),
    db.employee.findMany({
      where: { status: "active" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow">Approvals · Inbox</div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl tracking-tight md:text-5xl">
              Leave
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{pending.length}</span>{" "}
              waiting on you
              {" · "}
              <span className="font-mono tabular-nums">{recent.length}</span>{" "}
              recently decided
            </p>
          </div>
          <Link
            href="/admin/holidays"
            className="label-eyebrow inline-flex items-center gap-1 hover:text-foreground"
          >
            <Calendar className="h-3 w-3" /> Holiday calendar
          </Link>
        </div>
      </header>

      <div className="rule-double" aria-hidden />

      {/* Admin-initiated leave entry — collapsed by default */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/30">
          <PlusCircle className="h-4 w-4 text-[var(--brass)]" />
          <span className="text-sm font-medium">
            Record a leave entry (admin-initiated)
          </span>
          <ChevronDown
            className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
            strokeWidth={1.75}
          />
        </summary>
        <Card className="mt-2 bg-card p-5">
          <NewLeaveForm employees={employees} />
        </Card>
      </details>

      {/* Pending queue */}
      <section
        aria-label="Pending decisions"
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-2xl tracking-tight">
            Pending decisions
          </h2>
          {pending.length > 0 ? (
            <Badge className="border-[var(--brass)]/30 bg-[var(--brass)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--brass)] hover:bg-[var(--brass)]/15">
              {pending.length}
            </Badge>
          ) : null}
        </div>

        {pending.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <Inbox
              className="mx-auto h-6 w-6 text-muted-foreground"
              strokeWidth={1.5}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Inbox zero. Nothing waiting on you.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((p) => (
              <Card
                key={p.id}
                className="border-[var(--brass)]/40 bg-[var(--brass)]/8 p-4"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-display text-lg tracking-tight">
                        {p.employee.fullName}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {formatInTimeZone(p.startDate, TZ, "d LLL")} →{" "}
                        {formatInTimeZone(p.endDate, TZ, "d LLL yyyy")} ·{" "}
                        {p.days} day{p.days === 1 ? "" : "s"}
                      </span>
                    </div>
                    <Badge className="border-[var(--brass)]/30 bg-[var(--brass)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--brass)] hover:bg-[var(--brass)]/15">
                      {LEAVE_TYPE_LABELS[p.leaveType as LeaveType]}
                    </Badge>
                  </div>
                  {p.notes ? (
                    <>
                      <Separator className="bg-[var(--brass)]/20" />
                      <p className="text-sm italic text-muted-foreground">
                        "{p.notes}"
                      </p>
                    </>
                  ) : null}
                  <Separator className="bg-[var(--brass)]/20" />
                  <DecideButtons request={p} />
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>

      {/* Recently decided */}
      <section aria-label="Recently decided" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-2xl tracking-tight">
            Recently decided
          </h2>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
            No recent decisions.
          </div>
        ) : (
          <Card className="bg-card p-0">
            <ul className="divide-y divide-border">
              {recent.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-1 px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm">
                      <span className="font-medium">{r.employee.fullName}</span>{" "}
                      <span className="text-muted-foreground">·</span>{" "}
                      <span className="text-muted-foreground">
                        {LEAVE_TYPE_LABELS[r.leaveType as LeaveType]}
                      </span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {formatInTimeZone(r.startDate, TZ, "d LLL")} →{" "}
                      {formatInTimeZone(r.endDate, TZ, "d LLL")} ·{" "}
                      {r.days}d
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <StatusPill status={r.status} />
                    {r.decidedAt ? (
                      <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                        {formatInTimeZone(r.decidedAt, TZ, "d LLL · HH:mm")}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    approved: {
      label: "Approved",
      className:
        "border-[var(--success)]/30 bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/15",
    },
    certified_sick: {
      label: "Sick · certified",
      className:
        "border-[var(--success)]/30 bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/15",
    },
    rejected: {
      label: "Rejected",
      className:
        "border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/15",
    },
    unauthorized: {
      label: "Unauthorized",
      className:
        "border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/15",
    },
    cancelled: {
      label: "Cancelled",
      className:
        "border-border bg-muted text-muted-foreground hover:bg-muted",
    },
  };
  const v = variants[status] ?? {
    label: status.replace("_", " "),
    className: "border-border bg-muted text-muted-foreground hover:bg-muted",
  };
  return (
    <Badge
      className={`border font-mono text-[10px] uppercase tracking-wider ${v.className}`}
    >
      {v.label}
    </Badge>
  );
}
