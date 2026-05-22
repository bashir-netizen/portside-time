import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Plane, ListChecks } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { getLocale, getTranslations } from "next-intl/server";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { type LeaveType } from "@/schemas/leave";
import { accruedDaysSinceHire } from "@/lib/leave/accrual";
import { getCompanyConfig } from "@/lib/config";
import { dateLocaleFor } from "@/i18n/date";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RequestLeaveForm } from "./RequestLeaveForm";

const TZ = "Africa/Djibouti";

export async function generateMetadata() {
  const t = await getTranslations("leave");
  const tCommon = await getTranslations("common");
  return { title: `${t("title")} — ${tCommon("appName")}` };
}

export default async function MyLeavePage() {
  const session = await readSession();
  if (!session?.employeeId || session.role !== "employee") redirect("/login");

  const [employee, requests, config, t, tCommon, locale] = await Promise.all([
    db.employee.findUnique({ where: { id: session.employeeId } }),
    db.leaveRequest.findMany({
      where: { employeeId: session.employeeId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getCompanyConfig(),
    getTranslations("leave"),
    getTranslations("common"),
    getLocale(),
  ]);
  if (!employee) redirect("/login");

  const dateLocale = dateLocaleFor(locale as "fr" | "en");
  const accrued = accruedDaysSinceHire(
    employee.hireDate,
    new Date(),
    config.annualLeaveAccrualPerMonth,
  );
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
            {tCommon("today")}
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span>{t("title")}</span>
        </div>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <div className="rule-double" aria-hidden />

      <section aria-label={t("balanceRemaining")}>
        <Card className="bg-card p-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Plane className="h-4 w-4 text-[var(--success)]" strokeWidth={1.75} />
              <span className="label-eyebrow">{t("balanceRemaining")}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-6xl tracking-tight tabular-nums text-foreground">
                {remaining.toFixed(1)}
              </span>
              <span className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                {locale === "fr" ? "jours" : "days"}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                {t("balanceAccrued")}{" "}
                <span className="font-mono text-foreground tabular-nums">
                  {accrued.toFixed(1)}
                </span>
              </span>
              <span aria-hidden>·</span>
              <span>
                {t("balanceUsed")}{" "}
                <span className="font-mono text-foreground tabular-nums">
                  {used.toFixed(1)}
                </span>
              </span>
              <span aria-hidden>·</span>
              <span>
                {t("statuses.pending")}{" "}
                <span className="font-mono text-foreground tabular-nums">
                  {pending}
                </span>
              </span>
            </div>
            <p className="mt-3 max-w-prose text-xs text-muted-foreground">
              {locale === "fr"
                ? "2,5 jours sont cumulés par mois complet de service, selon l'Article 99 du Code du Travail djiboutien. Les congés maladie ou familiaux ne sont pas déduits de ce solde."
                : "2.5 days accrue every completed month of service, per Article 99 of the Code du Travail djiboutien. Sick / family-event leave does not deduct from this balance."}
            </p>
          </div>
        </Card>
      </section>

      <section aria-label={t("newRequest")} className="flex flex-col gap-3">
        <h2 className="font-display text-xl tracking-tight">{t("newRequest")}</h2>
        <Card className="bg-card p-5">
          <RequestLeaveForm />
        </Card>
      </section>

      <section aria-label={t("historyHeader")} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-xl tracking-tight">{t("historyHeader")}</h2>
        </div>
        {requests.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">{t("emptyHistory")}</p>
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
                        {t(`leaveTypes.${r.leaveType as LeaveType}`)}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {formatInTimeZone(r.startDate, TZ, "d LLL", { locale: dateLocale })} →{" "}
                        {formatInTimeZone(r.endDate, TZ, "d LLL yyyy", { locale: dateLocale })}
                        {" · "}
                        {locale === "fr"
                          ? `${r.days} jour${r.days === 1 ? "" : "s"}`
                          : `${r.days} day${r.days === 1 ? "" : "s"}`}
                      </span>
                    </div>
                    <StatusPill status={r.status} label={t(`statuses.${statusKey(r.status)}`)} />
                  </div>
                  {r.notes ? (
                    <>
                      <Separator className="my-1" />
                      <p className="text-xs italic text-muted-foreground">
                        &ldquo;{r.notes}&rdquo;
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

function statusKey(s: string): string {
  // Only fall back to a known key — the catalog has these exact keys.
  return s in {
    pending: 1,
    approved: 1,
    rejected: 1,
    cancelled: 1,
    pending_certificate: 1,
    certified_sick: 1,
    unauthorized: 1,
  }
    ? s
    : "pending";
}

function StatusPill({ status, label }: { status: string; label: string }) {
  const className: Record<string, string> = {
    approved:
      "border-[var(--success)]/30 bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/15",
    certified_sick:
      "border-[var(--success)]/30 bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/15",
    pending:
      "border-[var(--brass)]/30 bg-[var(--brass)]/15 text-[var(--brass)] hover:bg-[var(--brass)]/15",
    pending_certificate:
      "border-[var(--warning)]/30 bg-[var(--warning)]/15 text-foreground hover:bg-[var(--warning)]/15",
    rejected:
      "border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/15",
    unauthorized:
      "border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/15",
    cancelled: "border-border bg-muted text-muted-foreground hover:bg-muted",
  };
  const cls = className[status] ?? "border-border bg-muted text-muted-foreground hover:bg-muted";
  return (
    <Badge className={`border font-mono text-[10px] uppercase tracking-wider ${cls}`}>
      {label}
    </Badge>
  );
}
