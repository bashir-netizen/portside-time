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
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { logoutAction } from "@/app/login/actions";

export const metadata = { title: "Profile — Portside Time" };

const TZ = "Africa/Djibouti";

export default async function ProfilePage() {
  const session = await readSession();
  if (!session?.employeeId || session.role !== "employee") redirect("/login");

  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
  });
  if (!employee) redirect("/login");

  const hireDateLabel = formatInTimeZone(employee.hireDate, TZ, "d LLLL yyyy");
  const initials =
    employee.fullName
      .split(/\s+/)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "—";

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow flex items-center gap-1.5">
          <Link href="/me" className="hover:text-foreground">
            Today
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span>Profile</span>
        </div>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          Profile
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
              {employee.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Details — read only */}
      <Card className="bg-card p-0">
        <Row
          icon={Briefcase}
          label="Position"
          value={employee.position}
        />
        <Separator />
        <Row
          icon={CalendarDays}
          label="Joined Portside"
          value={hireDateLabel}
          mono
        />
        <Separator />
        <Row
          icon={Anchor}
          label="Default schedule"
          value="Standard 08–17"
          hint="Editable by admin only"
        />
      </Card>

      {/* Account actions — placeholders */}
      <section aria-label="Account" className="flex flex-col gap-3">
        <h2 className="font-display text-xl tracking-tight">Account</h2>
        <Card className="bg-card p-0">
          <ActionRow
            icon={KeyRound}
            label="Change PIN"
            hint="Self-serve PIN reset ships when the lateness PR lands. For now, ask the admin."
            disabled
          />
          <Separator />
          <ActionRow
            icon={Languages}
            label="Language"
            hint="EN / FR switching ships with next-intl in a later PR."
            disabled
            trailing={
              <Badge
                variant="outline"
                className="font-mono text-[10px] uppercase tracking-wider"
              >
                FR (default)
              </Badge>
            }
          />
          <Separator />
          <ActionRow
            icon={Mail}
            label="Notifications"
            hint="Push + email preferences arrive with the notifications PR."
            disabled
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
            Sign out
          </Button>
        </form>
      </section>

      {/* Footnote */}
      <div className="mt-6 flex flex-col items-center gap-2 text-center">
        <UserRound className="h-4 w-4 text-[var(--brass)]" />
        <div className="label-eyebrow">
          portside time · personnel sheet
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          your data lives on the office server · ask admin to review
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  disabled?: boolean;
  trailing?: React.ReactNode;
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
        {disabled ? "Soon" : "Edit"}
      </Button>
    </div>
  );
}
