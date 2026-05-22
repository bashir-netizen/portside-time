import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  History,
  CalendarClock,
  Sun,
  Coffee,
  UtensilsCrossed,
  AlertTriangle,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { getTranslations } from "next-intl/server";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getTodaysPunches } from "@/lib/punch/repo";
import { djiboutiDayWindow } from "@/lib/punch/window";
import { nextPunchType, dayStatus } from "@/lib/punch/sequence";
import { getDayPatternForEmployee } from "@/lib/punch/day-pattern";
import { type PunchType, type DayStatus } from "@/lib/punch/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SequenceRibbon } from "@/components/employee/sequence-ribbon";
import { PunchButton } from "./PunchButton";

const TZ = "Africa/Djibouti";

export default async function MePage() {
  const session = await readSession();
  if (!session?.employeeId || session.role !== "employee") redirect("/login");

  const [employee, todays, dayPattern, pendingJustifications] = await Promise.all([
    db.employee.findUnique({
      where: { id: session.employeeId },
      include: { defaultScheduleTemplate: true },
    }),
    getTodaysPunches(session.employeeId),
    getDayPatternForEmployee(session.employeeId),
    db.lateIncident.count({
      where: {
        employeeId: session.employeeId,
        status: "pending_justification",
      },
    }),
  ]);
  if (!employee) redirect("/login");

  const t = await getTranslations("me");
  const tPunch = await getTranslations("punchTypes");

  const typesToday = todays.map((p) => p.punchType);
  const next = nextPunchType(typesToday, dayPattern.type);
  const status = dayStatus(typesToday);

  const { start } = djiboutiDayWindow();
  const recent = await db.punch.findMany({
    where: {
      employeeId: session.employeeId,
      punchedAt: { lt: start },
    },
    orderBy: { punchedAt: "desc" },
    take: 6,
    select: { id: true, punchType: true, punchedAt: true },
  });

  const hour = Number(formatInTimeZone(new Date(), TZ, "H"));
  const greeting =
    hour < 12 ? t("greetingMorning") : hour < 18 ? t("greetingAfternoon") : t("greetingEvening");

  const templateLabel =
    dayPattern.templateName ??
    employee.defaultScheduleTemplate?.name ??
    "—";
  const isDayOff = dayPattern.type === "day_off";

  return (
    <div className="flex flex-col gap-7">
      {/* Greeting + status pill */}
      <header className="flex flex-col gap-1.5">
        <div className="label-eyebrow">{greeting}</div>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-3xl tracking-tight md:text-4xl">
            {employee.fullName.split(" ")[0]}
          </h1>
          <StatusBadge
            status={status}
            isDayOff={isDayOff}
            label={isDayOff ? t("status.dayOff") : t(`status.${statusKeyFor(status)}`)}
          />
        </div>
      </header>

      {pendingJustifications > 0 ? (
        <Link
          href="/me/justify"
          className="group flex items-center gap-3 rounded-sm border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-4 py-3 transition-colors hover:bg-[var(--warning)]/15"
        >
          <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {t("justifyBannerCount", { count: pendingJustifications })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("justifyBannerBody")}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}

      {/* Today's sequence — adapts to the day-pattern type */}
      <section
        aria-label="Today's punch sequence"
        className="flex flex-col gap-3"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl tracking-tight">{t("todayHeader")}</h2>
          <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground tabular-nums">
            <DayPatternBadge type={dayPattern.type} label={t(`dayPattern.${dayPattern.type as "split_day" | "continuous_day" | "half_day" | "day_off"}`)} />
            {templateLabel}
          </span>
        </div>
        {isDayOff ? (
          <Card className="bg-card p-8 text-center">
            <Sun
              className="mx-auto h-8 w-8 text-[var(--brass)]"
              strokeWidth={1.5}
            />
            <p className="mt-3 font-display text-2xl tracking-tight">
              {t("dayOffTitle")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("dayOffBody")}
            </p>
          </Card>
        ) : (
          <SequenceRibbon
            todaysPunches={todays}
            timezone={TZ}
            dayPatternType={dayPattern.type}
          />
        )}
      </section>

      {/* Hero punch button — only when there's a next punch */}
      {!isDayOff ? (
        <section aria-label="Next punch">
          <PunchButton nextPunch={next} />
        </section>
      ) : null}

      {/* Today's schedule strip — adapts to day-pattern type */}
      <ScheduleStrip
        templateLabel={templateLabel}
        dayPattern={dayPattern}
        labels={{
          header: t("scheduleHeader"),
          noShift: t("noShiftToday"),
          start: t("scheduleStart"),
          end: t("scheduleEnd"),
          lunchOut: t("scheduleLunchOut"),
          lunchIn: t("scheduleLunchIn"),
          lunchOnSite: t("scheduleLunchOnSite"),
          lunchOnSiteWithMins: (m: number) => t("scheduleLunchOnSiteWithMins", { minutes: m }),
        }}
      />

      {/* Recent activity */}
      {recent.length > 0 ? (
        <section aria-label="Recent activity" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-xl tracking-tight">{t("recentHeader")}</h2>
            </div>
            <Link
              href="/me/schedule"
              className="label-eyebrow hover:text-foreground"
            >
              {t("viewWeek")}
              <ChevronRight className="ml-0.5 inline-block h-3 w-3" />
            </Link>
          </div>
          <Card className="bg-card p-0">
            <ul className="divide-y divide-border">
              {recent.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="text-foreground">
                    {tPunch(p.punchType as PunchType)}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {formatInTimeZone(p.punchedAt, TZ, "EEE d LLL · HH:mm")}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function DayPatternBadge({ type, label }: { type: string; label: string }) {
  const className: Record<string, string> = {
    split_day: "border-border bg-card text-muted-foreground",
    continuous_day:
      "border-[var(--success)]/30 bg-[var(--success)]/15 text-[var(--success)]",
    half_day:
      "border-[var(--brass)]/30 bg-[var(--brass)]/15 text-[var(--brass)]",
    day_off: "border-border bg-muted text-muted-foreground",
  };
  return (
    <Badge
      variant="outline"
      className={`border font-mono text-[10px] uppercase tracking-wider ${className[type] ?? className.split_day}`}
    >
      {label}
    </Badge>
  );
}

function statusKeyFor(
  status: DayStatus,
): "notStarted" | "working" | "onLunch" | "backFromLunch" | "finished" {
  switch (status) {
    case "not_started":
      return "notStarted";
    case "on_lunch":
      return "onLunch";
    case "back_from_lunch":
      return "backFromLunch";
    case "finished":
      return "finished";
    case "working":
    default:
      return "working";
  }
}

function StatusBadge({
  status,
  isDayOff,
  label,
}: {
  status: DayStatus;
  isDayOff: boolean;
  label: string;
}) {
  if (isDayOff) {
    return (
      <Badge
        variant="outline"
        className="border-[var(--brass)]/30 bg-[var(--brass)]/10 font-mono text-[10px] uppercase tracking-wider text-[var(--brass)]"
      >
        {label}
      </Badge>
    );
  }
  switch (status) {
    case "not_started":
      return (
        <Badge
          variant="outline"
          className="border-border bg-card font-mono text-[10px] uppercase tracking-wider"
        >
          {label}
        </Badge>
      );
    case "on_lunch":
      return (
        <Badge className="border-[var(--warning)]/30 bg-[var(--warning)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--foreground)] hover:bg-[var(--warning)]/15">
          {label}
        </Badge>
      );
    case "finished":
      return (
        <Badge className="border-[var(--success)]/30 bg-[var(--success)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--success)] hover:bg-[var(--success)]/15">
          {label}
        </Badge>
      );
    // working / back_from_lunch share the same visual
    default:
      return (
        <Badge className="border-[var(--brass)]/30 bg-[var(--brass)]/15 font-mono text-[10px] uppercase tracking-wider text-[var(--brass)] hover:bg-[var(--brass)]/15">
          {label}
        </Badge>
      );
  }
}

type ScheduleLabels = {
  header: string;
  noShift: string;
  start: string;
  end: string;
  lunchOut: string;
  lunchIn: string;
  lunchOnSite: string;
  lunchOnSiteWithMins: (minutes: number) => string;
};

function ScheduleStrip({
  templateLabel,
  dayPattern,
  labels,
}: {
  templateLabel: string;
  dayPattern: {
    type: string;
    startTime: string | null;
    endTime: string | null;
    lunchOutTime: string | null;
    lunchInTime: string | null;
    lunchBreakMinutes: number | null;
  };
  labels: ScheduleLabels;
}) {
  const { type, startTime, endTime, lunchOutTime, lunchInTime, lunchBreakMinutes } =
    dayPattern;
  return (
    <section
      aria-label={labels.header}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-xl tracking-tight">{labels.header}</h2>
        <span className="ml-auto label-eyebrow">{templateLabel}</span>
      </div>
      <Card className="bg-card p-0">
        {type === "day_off" ? (
          <div className="px-5 py-5 text-center text-sm text-muted-foreground">
            {labels.noShift}
          </div>
        ) : type === "half_day" ? (
          <div className="grid grid-cols-2 divide-x divide-border">
            <Block eyebrow={labels.start} time={startTime ?? "—"} />
            <Block eyebrow={labels.end} time={endTime ?? "—"} />
          </div>
        ) : type === "continuous_day" ? (
          <div className="grid grid-cols-3 divide-x divide-border">
            <Block eyebrow={labels.start} time={startTime ?? "—"} />
            <Block
              eyebrow={
                lunchBreakMinutes
                  ? labels.lunchOnSiteWithMins(lunchBreakMinutes)
                  : labels.lunchOnSite
              }
              icon={Coffee}
              time={lunchOutTime ?? "—"}
            />
            <Block eyebrow={labels.end} time={endTime ?? "—"} />
          </div>
        ) : (
          <div className="grid grid-cols-4 divide-x divide-border">
            <Block eyebrow={labels.start} time={startTime ?? "—"} />
            <Block
              eyebrow={labels.lunchOut}
              icon={UtensilsCrossed}
              time={lunchOutTime ?? "—"}
            />
            <Block eyebrow={labels.lunchIn} icon={Coffee} time={lunchInTime ?? "—"} />
            <Block eyebrow={labels.end} time={endTime ?? "—"} />
          </div>
        )}
      </Card>
    </section>
  );
}

function Block({
  eyebrow,
  time,
  icon: Icon,
}: {
  eyebrow: string;
  time: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3 text-center">
      <span className="label-eyebrow !text-[0.625rem] inline-flex items-center justify-center gap-1">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {eyebrow}
      </span>
      <span className="font-mono text-lg font-medium text-foreground tabular-nums">
        {time}
      </span>
    </div>
  );
}

