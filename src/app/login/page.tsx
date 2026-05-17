import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { Anchor, Building2, Wifi, WifiOff, ShieldAlert } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { resolveClientIp } from "@/lib/ip";
import { type Locale } from "@/i18n/locale";
import { LocaleToggle } from "@/components/employee/locale-toggle";
import { AdminLoginForm } from "./AdminLoginForm";
import { EmployeeLoginForm } from "./EmployeeLoginForm";

type Tab = "admin" | "employee";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; next?: string }>;
}) {
  const session = await readSession();
  if (session) {
    redirect(session.role === "admin" ? "/admin" : "/me");
  }

  const params = await searchParams;
  const tab: Tab = params.tab === "admin" ? "admin" : "employee";
  const t = await getTranslations("login");
  const locale = await getLocale();

  // Resolve client IP + check against active allowlist so we can tell the
  // user whether they're connecting from the office or not. Read-only —
  // no auth decisions here; the action enforces gates server-side.
  const headerList = await headers();
  const clientIp = resolveClientIp(headerList);
  const activeIps = await db.ipAllowlist.findMany({
    where: { active: true },
    select: { ipAddress: true, label: true },
  });
  const isOnOfficeNetwork =
    clientIp != null && activeIps.some((r) => r.ipAddress === clientIp);
  const matchedOffice = isOnOfficeNetwork
    ? activeIps.find((r) => r.ipAddress === clientIp) ?? null
    : null;

  const devBypassActive =
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_BYPASS_OFFICE_GATES === "1";

  const activeEmployees =
    tab === "employee"
      ? await db.employee.findMany({
          where: { status: "active" },
          select: { id: true, fullName: true, position: true },
          orderBy: { fullName: "asc" },
        })
      : [];

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <LocaleToggle current={locale as Locale} variant="compact" />
        </div>

        <header className="mb-7 flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-sm bg-foreground text-background ring-1 ring-[var(--brass)]/40"
          >
            <Anchor className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="flex flex-col gap-0.5">
            <h1 className="font-display text-3xl tracking-tight">
              Portside Time
            </h1>
            <p className="label-eyebrow !text-[0.6875rem]">{t("tagline")}</p>
          </div>
        </header>

        {/* Network-status banner — high signal so an employee knows whether
            their punch will pass the office-only gate before they even try. */}
        <NetworkBanner
          tab={tab}
          isOnOfficeNetwork={isOnOfficeNetwork}
          matchedLabel={matchedOffice?.label ?? null}
          clientIp={clientIp}
          labels={{
            onOffice: t("onOffice"),
            offEmployeeTitle: t("offEmployeeTitle"),
            offEmployeeBody: t("offEmployeeBody"),
            offAdminLabel: t("offAdminLabel"),
          }}
        />

        <nav
          className="mt-5 mb-5 grid grid-cols-2 rounded-sm border border-border p-1"
          aria-label={t("tabAriaLabel")}
        >
          <TabLink href={`/login?tab=employee`} active={tab === "employee"}>
            {t("tabEmployee")}
          </TabLink>
          <TabLink href={`/login?tab=admin`} active={tab === "admin"}>
            {t("tabAdmin")}
          </TabLink>
        </nav>

        {tab === "admin" ? (
          <AdminLoginForm />
        ) : (
          <EmployeeLoginForm employees={activeEmployees} />
        )}

        {devBypassActive ? (
          <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--brass)]/80">
            {t("devBypass")}
          </p>
        ) : null}
      </div>
    </main>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={
        "flex items-center justify-center rounded-sm px-4 py-2 text-sm font-medium transition-colors " +
        (active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </Link>
  );
}

function NetworkBanner({
  tab,
  isOnOfficeNetwork,
  matchedLabel,
  clientIp,
  labels,
}: {
  tab: Tab;
  isOnOfficeNetwork: boolean;
  matchedLabel: string | null;
  clientIp: string | null;
  labels: {
    onOffice: string;
    offEmployeeTitle: string;
    offEmployeeBody: string;
    offAdminLabel: string;
  };
}) {
  if (isOnOfficeNetwork) {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/8 px-3.5 py-2.5 text-xs text-foreground"
      >
        <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
        <div className="flex-1">
          <div className="font-medium leading-tight">{labels.onOffice}</div>
          {matchedLabel ? (
            <div className="mt-0.5 label-eyebrow !text-[0.625rem]">
              {matchedLabel}
            </div>
          ) : null}
        </div>
        {clientIp ? (
          <span className="font-mono text-[10px] text-muted-foreground">
            {clientIp}
          </span>
        ) : null}
      </div>
    );
  }

  if (tab === "employee") {
    return (
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-sm border border-[var(--warning)]/40 bg-[var(--warning)]/12 px-3.5 py-3 text-xs text-foreground"
      >
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
        <div className="flex-1">
          <div className="text-sm font-medium leading-tight">
            {labels.offEmployeeTitle}
          </div>
          <p className="mt-1 leading-snug text-muted-foreground">
            {labels.offEmployeeBody}
          </p>
        </div>
        {clientIp ? (
          <span className="font-mono text-[10px] text-muted-foreground">
            {clientIp}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-xs text-muted-foreground"
    >
      <Building2 className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate">{labels.offAdminLabel}</span>
      <ShieldAlert
        aria-hidden
        className="h-3.5 w-3.5 text-[var(--brass)]/70"
      />
    </div>
  );
}
