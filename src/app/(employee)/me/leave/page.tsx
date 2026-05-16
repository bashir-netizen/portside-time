import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Plane, ListChecks } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/schemas/leave";
import { accruedDaysSinceHire } from "@/lib/leave/accrual";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RequestLeaveForm } from "./RequestLeaveForm";

export const metadata = { title: "Leave — Portside Time" };

const TZ = "Africa/Djibouti";

export default async function MyLeavePage() {
  const session = await readSession();
  if (!session?.employeeId || session.role !== "employee") redirect("/login");

  const [employee, requests] = await Promise.all([
    db.employee.findUnique({ where: { id: session.employeeId } }),
    db.leaveRequest.findMany({
      where: { employeeId: session.employeeId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  if (!employee) redirect("/login");

  const accrued = accruedDaysSinceHire(employee.hireDate);
  const used = requests
    .filter((r) => r.leaveType === "annual" && r.status === "approved")
    .reduce((sum, r) => sum + r.days, 0);
  const remaining = Math.max(0, accrued - used);

  const pending = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow flex items-center gap-1.5">
          <Link href="/me" className="hover:text-foreground">
            Today
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span>Leave</span>
        </div>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          Leave
        </h1>
      </header>

      <div className="rule-double" aria-hidden />

      {/* Hero: annual leave balance — big editorial number */}
      <section aria-label="Annual leave balance">
        <Card className="bg-card p-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Plane className="h-4 w-4 text-[var(--success)]" strokeWidth={1.75} />
              <span className="label-eyebrow">Annual leave remaining</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-6xl tracking-tight tabular-nums text-foreground">
                {remaining.toFixed(1)}
              </span>
              <span className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                days
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                Accrued{" "}
                <span className="font-mono text-foreground tabular-nums">
                  {accrued.toFixed(1)}
                </span>
              </span>
              <span aria-hidden>·</span>
              <span>
                Used{" "}
                <span className="font-mono text-foreground tabular-nums">
                  {used.toFixed(1)}
                </span>
              </span>
              <span aria-hidden>·</span>
              <span>
                Pending{" "}
                <span className="font-mono text-foreground tabular-nums">
                  {pending}
                </span>
              </span>
            </div>
            <p className="mt-3 max-w-prose text-xs text-muted-foreground">
              2.5 days accrue every completed month of service, per Article 99
              du Code du Travail djiboutien. Sick / family-event leave does not
              deduct from this balance.
            </p>
          </div>
        </Card>
      </section>

      {/* Request form */}
      <section aria-label="Request leave" className="flex flex-col gap-3">
        <h2 className="font-display text-xl tracking-tight">Request leave</h2>
        <Card className="bg-card p-5">
          <RequestLeaveForm />
        </Card>
      </section>

      {/* My requests list */}
      <section aria-label="My requests" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-xl tracking-tight">My requests</h2>
        </div>
        {requests.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No leave requests yet. Submit one above.
            </p>
          </div>
        ) : (
          <Card className="bg-card p-0">
            <ul className="divide-y divide-border">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-1.5 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">
                        {LEAVE_TYPE_LABELS[r.leaveType as LeaveType]}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {formatInTimeZone(r.startDate, TZ, "d LLL")} →{" "}
                        {formatInTimeZone(r.endDate, TZ, "d LLL yyyy")}
                        {" · "}
                        {r.days} day{r.days === 1 ? "" : "s"}
                      </span>
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                  {r.notes ? (
                    <>
                      <Separator className="my-1" />
                      <p className="text-xs italic text-muted-foreground">
                        "{r.notes}"
                      </p>
                    </>
                  ) : null}
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
  const variants: Record<
    string,
    { label: string; className: string }
  > = {
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
    pending: {
      label: "Pending",
      className:
        "border-[var(--brass)]/30 bg-[var(--brass)]/15 text-[var(--brass)] hover:bg-[var(--brass)]/15",
    },
    pending_certificate: {
      label: "Needs certificate",
      className:
        "border-[var(--warning)]/30 bg-[var(--warning)]/15 text-foreground hover:bg-[var(--warning)]/15",
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
