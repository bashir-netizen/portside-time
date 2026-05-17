import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  UserRound,
  Briefcase,
  CalendarDays,
  KeyRound,
  Languages,
  Mail,
  Anchor,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { getLocale, getTranslations } from "next-intl/server";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { dateLocaleFor } from "@/i18n/date";
import { type Locale } from "@/i18n/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LocaleToggle } from "@/components/employee/locale-toggle";
import { logoutAction } from "@/app/login/actions";

const TZ = "Africa/Djibouti";

export async function generateMetadata() {
  const t = await getTranslations("profile");
  const tCommon = await getTranslations("common");
  return { title: `${t("title")} — ${tCommon("appName")}` };
}

export default async function ProfilePage() {
  const session = await readSession();
  if (!session?.employeeId || session.role !== "employee") redirect("/login");

  const [employee, t, tCommon, locale] = await Promise.all([
    db.employee.findUnique({
      where: { id: session.employeeId },
      include: { defaultScheduleTemplate: { select: { name: true } } },
    }),
    getTranslations("profile"),
    getTranslations("common"),
    getLocale(),
  ]);
  if (!employee) redirect("/login");

  const dateLocale = dateLocaleFor(locale as Locale);
  const hireDateLabel = formatInTimeZone(employee.hireDate, TZ, "d LLLL yyyy", { locale: dateLocale });
  const initials =
    employee.fullName
      .split(/\s+/)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "—";
  const templateName = employee.defaultScheduleTemplate?.name ?? t("unassignedSchedule");

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
      </header>

      <div className="rule-double" aria-hidden />

      {/* Identity card */}
      <Card className="bg-card p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-[var(--brass)]/40 bg-[var(--brass)]/10 text-[var(--brass)]">
            <span className="font-display text-xl tracking-tight">
              {initials}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-0.5">
            <div className="font-display text-2xl tracking-tight">
              {employee.fullName}
            </div>
            <div className="text-sm text-muted-foreground">
              {employee.position}
            </div>
            <Badge
              variant="outline"
              className="mt-2 self-start font-mono text-[10px] uppercase tracking-wider"
            >
              {employee.status === "active" ? t("active") : t("inactive")}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Details — read only */}
      <Card className="bg-card p-0">
        <Row icon={Briefcase} label={t("position")} value={employee.position} />
        <Separator />
        <Row
          icon={CalendarDays}
          label={t("joinedOn")}
          value={hireDateLabel}
          mono
        />
        <Separator />
        <Row
          icon={Anchor}
          label={t("defaultSchedule")}
          value={templateName}
          hint={t("scheduleHint")}
        />
      </Card>

      {/* Account actions */}
      <section aria-label={t("accountHeader")} className="flex flex-col gap-3">
        <h2 className="font-display text-xl tracking-tight">{t("accountHeader")}</h2>
        <Card className="bg-card p-0">
          <ActionRow
            icon={KeyRound}
            label={t("changePinLabel")}
            hint={t("changePinHint")}
            disabled
            soonLabel={t("soon")}
            editLabel={t("edit")}
          />
          <Separator />
          {/* Real, functional language toggle (replaces the old placeholder) */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-1 flex-col gap-0.5">
              <div className="text-sm">{t("languageLabel")}</div>
              <div className="label-eyebrow !text-[0.625rem]">{t("languageHint")}</div>
            </div>
            <LocaleToggle current={locale as Locale} />
          </div>
          <Separator />
          <ActionRow
            icon={Mail}
            label={t("notificationsLabel")}
            hint={t("notificationsHint")}
            disabled
            soonLabel={t("soon")}
            editLabel={t("edit")}
          />
        </Card>
      </section>

      {/* Sign out */}
      <section>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="outline"
            className="w-full justify-center md:w-auto"
          >
            {tCommon("signOut")}
          </Button>
        </form>
      </section>

      {/* Footnote */}
      <div className="mt-6 flex flex-col items-center gap-2 text-center">
        <UserRound className="h-4 w-4 text-[var(--brass)]" />
        <div className="label-eyebrow">{t("footerLabel")}</div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {t("footerHint")}
        </div>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  hint,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="text-sm">{label}</div>
        {hint ? (
          <div className="label-eyebrow !text-[0.625rem]">{hint}</div>
        ) : null}
      </div>
      <div
        className={`text-sm ${mono ? "font-mono tabular-nums" : ""} text-muted-foreground`}
      >
        {value}
      </div>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  label,
  hint,
  disabled,
  trailing,
  soonLabel,
  editLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  disabled?: boolean;
  trailing?: React.ReactNode;
  soonLabel: string;
  editLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="text-sm">{label}</div>
        <div className="label-eyebrow !text-[0.625rem]">{hint}</div>
      </div>
      {trailing}
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="h-7 px-2 text-[10px] uppercase tracking-wider"
      >
        {disabled ? soonLabel : editLabel}
      </Button>
    </div>
  );
}
