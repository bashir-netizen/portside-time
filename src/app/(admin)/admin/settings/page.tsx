import Link from "next/link";
import {
  Anchor,
  CalendarClock,
  Calendar,
  Smartphone,
  Globe,
  Languages,
  Bell,
  Database,
  ChevronRight,
  Wallet,
  Clock,
  Hourglass,
  CalendarDays,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Settings — Portside Time",
};

/**
 * /admin/settings — the first-class home for everything configurable.
 *
 * Today this page reads from spec defaults (CompanyConfig table doesn't exist
 * yet; it lands in a later PR per the plan). The shape is locked: each card
 * is a real section the user can already understand, with "Edit" disabled and
 * a brass note explaining when persistence ships.
 *
 * Honors the spec §5.1–§5.13 defaults and the open questions from §12.
 */

const SPEC_DEFAULTS = {
  gracePeriodMinutes: 15,
  justificationWindowHours: 48,
  annualLeaveAccrualPerMonth: 2.5,
  perDiemDefaultAmount: null as number | null, // spec §12 Q1 — TBD
  weekStartDay: 0, // Sunday
  dayOffDefault: 5, // Friday
  timezone: "Africa/Djibouti",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow flex items-center gap-1.5">
          <Link href="/admin" className="hover:text-foreground">
            Admin
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span>System</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl tracking-tight md:text-5xl">
              Settings
            </h1>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              Company defaults, schedule patterns, public holidays, notifications,
              and system configuration for Portside Time.
            </p>
          </div>
          <div className="hidden text-right md:block">
            <div className="label-eyebrow">Spec reference</div>
            <div className="font-mono text-xs text-muted-foreground">
              §5.1 — §5.13 · Loi 133/AN/05
            </div>
          </div>
        </div>
      </header>

      <div className="rule-double" aria-hidden />

      {/* Section: Company defaults */}
      <Section
        eyebrow="Operations"
        title="Company defaults"
        description="Numbers the punch flow + justification workflow read at runtime. Persistence lands in the CompanyConfig PR."
      >
        <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2">
          <SettingField
            icon={Hourglass}
            label="Grace period"
            value={`${SPEC_DEFAULTS.gracePeriodMinutes} min`}
            hint="Punch within this window after expected start is on-time. Beyond it: late incident."
          />
          <SettingField
            icon={Clock}
            label="Justification window"
            value={`${SPEC_DEFAULTS.justificationWindowHours} h`}
            hint="Employee has this long to submit a reason before the late incident auto-flips to unjustified."
          />
          <SettingField
            icon={CalendarDays}
            label="Annual leave accrual"
            value={`${SPEC_DEFAULTS.annualLeaveAccrualPerMonth} jours / mois`}
            hint="Per Code du Travail Article 99. Accrues from hire date."
          />
          <SettingField
            icon={Wallet}
            label="Per diem (busy day)"
            value={
              SPEC_DEFAULTS.perDiemDefaultAmount
                ? `${SPEC_DEFAULTS.perDiemDefaultAmount.toLocaleString()} DJF`
                : "— not set"
            }
            hint="Owed when continuous-day employees stay on-site for lunch. Stakeholder Q12.1 — needs answer."
            warn={SPEC_DEFAULTS.perDiemDefaultAmount === null}
          />
        </div>
      </Section>

      {/* Section: Schedule templates */}
      <Section
        eyebrow="Schedule design"
        title="Schedule templates"
        description="Per-employee day-by-day shift patterns. Two production templates: Split day (long lunch, off-site by default; on-site on busy days) and Continuous day (on-site lunch, busy day extends to 18:30)."
      >
        <CardLink
          href="/admin/schedules"
          icon={CalendarClock}
          title="Manage schedule templates"
          subtitle="Split-day + Continuous-day templates seeded; day-pattern-aware punch flow active"
        />
      </Section>

      {/* Section: Holidays */}
      <Section
        eyebrow="Calendar"
        title="Public holidays"
        description="Djibouti national holidays for 2026 — Independence Day, Eid al-Fitr, Eid al-Adha, etc. Excluded from working-days count."
      >
        <CardLink
          href="/admin/holidays"
          icon={Calendar}
          title="Manage public holidays"
          subtitle="2026 calendar seed pending stakeholder confirmation (spec Q12.2)"
        />
      </Section>

      {/* Section: Language */}
      <Section
        eyebrow="Localisation"
        title="Language & locale"
        description="Bilingual EN + FR (Arabic explicitly out of scope). User-switchable from the top-right menu."
      >
        <div className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-1 flex-col gap-0.5">
              <div className="text-sm">Default office language</div>
              <div className="label-eyebrow">français — wiring via next-intl in PR-13</div>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              FR · EN
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-1 flex-col gap-0.5">
              <div className="text-sm">Timezone</div>
              <div className="label-eyebrow font-mono">
                {SPEC_DEFAULTS.timezone} (UTC+3, no DST)
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              Fixed
            </Badge>
          </div>
        </div>
      </Section>

      {/* Section: Notifications */}
      <Section
        eyebrow="Comms"
        title="Notifications"
        description="Spec §5.12 — push, email, SMS for punch reminders, missed punches, justifications, leave decisions, no-shows. Email channel via Resend; push via Web Push when PWA lands."
      >
        <div className="overflow-hidden rounded-md border border-border">
          <NotifRow label="Punch reminder" channels="Push" status="planned" />
          <Separator />
          <NotifRow label="Missed punch" channels="Push · Email" status="planned" />
          <Separator />
          <NotifRow label="Late detected" channels="Push · Email" status="planned" />
          <Separator />
          <NotifRow label="Justification decision" channels="Push · Email" status="planned" />
          <Separator />
          <NotifRow label="Leave decision" channels="Push · Email" status="planned" />
          <Separator />
          <NotifRow label="No-show" channels="Push · Email · SMS" status="planned" />
          <Separator />
          <NotifRow
            label="New IP detected"
            channels="Email (Resend)"
            status={
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                Wired · waiting Resend domain
              </Badge>
            }
          />
        </div>
      </Section>

      {/* Section: Security */}
      <Section
        eyebrow="Security"
        title="Devices & network"
        description="Office IP allowlist + browser-fingerprinted device approval. Cloudflare Access at the edge is the first gate; this app-level gate is the second."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <CardLink
            href="/admin/devices"
            icon={Smartphone}
            title="Registered devices"
            subtitle="Approve office PCs for employee PIN sign-in"
          />
          <CardLink
            href="/admin/ip-allowlist"
            icon={Globe}
            title="IP allowlist"
            subtitle="Pending: pending IP rows surface as a banner above"
          />
        </div>
      </Section>

      {/* Section: System */}
      <Section
        eyebrow="System"
        title="Backups & data"
        description="SQLite at /data/portside.db; continuous WAL replication to Cloudflare R2 (when wired). DigitalOcean snapshots weekly."
      >
        <Card className="bg-card">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 shrink-0 text-[var(--brass)]" />
              <div className="flex flex-col gap-0.5">
                <div className="text-sm font-medium">Live replication</div>
                <div className="text-xs text-muted-foreground">
                  Litestream → R2 bucket{" "}
                  <span className="font-mono">portside-backups</span>. Status
                  visible once production droplet exists.
                </div>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              Not yet deployed
            </Badge>
          </CardContent>
        </Card>
      </Section>

      {/* Footer signature */}
      <div className="mt-6 flex flex-col items-center gap-3 border-t border-border pt-6 text-center">
        <Anchor className="h-4 w-4 text-[var(--brass)]" />
        <div className="label-eyebrow">portside time · ledger sheet 01</div>
        <div className="font-mono text-[10px] text-muted-foreground">
          conforms to djibouti code du travail · loi n° 133/an/05/5ème l
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── helpers ─────────────────────────

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow">{eyebrow}</div>
        <h2 className="font-display text-2xl tracking-tight md:text-3xl">
          {title}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

function SettingField({
  icon: Icon,
  label,
  value,
  hint,
  warn = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="label-eyebrow">{label}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <div
          className={`font-display text-2xl tracking-tight ${
            warn ? "text-[var(--warning)]" : "text-foreground"
          }`}
        >
          {value}
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="h-7 px-2 text-[10px] uppercase tracking-wider"
        >
          Edit
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function CardLink({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <Card className="group bg-card transition-colors hover:border-[var(--brass)]/50">
      <Link
        href={href}
        className="flex items-center gap-3 p-5"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-[var(--brass)]">
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
      </Link>
    </Card>
  );
}

function NotifRow({
  label,
  channels,
  status,
}: {
  label: string;
  channels: string;
  status: "planned" | React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
      <Bell className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="text-sm">{label}</div>
        <div className="label-eyebrow">{channels}</div>
      </div>
      {status === "planned" ? (
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          Planned
        </Badge>
      ) : (
        status
      )}
    </div>
  );
}
