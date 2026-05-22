import Link from "next/link";
import { Smartphone, Plus, Globe } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeviceRowActions } from "./DeviceRowActions";

export const metadata = { title: "Devices — Portside Time" };

const TZ = "Africa/Djibouti";

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const status = tab === "revoked" ? "revoked" : "approved";

  const [devices, approvedCount, revokedCount] = await Promise.all([
    db.device.findMany({
      where: { status },
      orderBy: { lastSeenAt: "desc" },
    }),
    db.device.count({ where: { status: "approved" } }),
    db.device.count({ where: { status: "revoked" } }),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow">Security · fingerprint-bound</div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl tracking-tight md:text-5xl">
              Devices
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{approvedCount}</span>{" "}
              approved
              {" · "}
              <span className="font-mono tabular-nums">{revokedCount}</span>{" "}
              revoked
            </p>
          </div>
          <Button asChild className="gap-1.5">
            <Link href="/admin/devices/register">
              <Plus className="h-4 w-4" /> Register this device
            </Link>
          </Button>
        </div>
      </header>

      <div className="rule-double" aria-hidden />

      <nav
        aria-label="Status filter"
        className="inline-flex w-fit gap-1 rounded-sm border border-border p-1"
      >
        <TabLink href="/admin/devices" active={status === "approved"}>
          Approved ({approvedCount})
        </TabLink>
        <TabLink
          href="/admin/devices?tab=revoked"
          active={status === "revoked"}
        >
          Revoked ({revokedCount})
        </TabLink>
      </nav>

      {devices.length === 0 ? (
        <Card className="bg-card p-8 text-center">
          <Smartphone className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-display text-xl">
            {status === "approved"
              ? "No approved devices yet"
              : "No revoked devices"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "approved"
              ? "Register an office PC so employees can sign in from it."
              : "Devices stay revoked permanently — they're for the audit log."}
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {devices.map((d) => (
            <li key={d.id}>
              <Card className="bg-card p-4">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border",
                      status === "approved"
                        ? "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]"
                        : "border-destructive/40 bg-destructive/10 text-destructive"
                    )}
                  >
                    <Smartphone className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-medium">{d.label}</span>
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      {d.userAgent}
                    </span>
                    <span className="flex flex-wrap gap-x-3 font-mono text-xs text-muted-foreground tabular-nums">
                      <span>
                        Last seen{" "}
                        {formatInTimeZone(d.lastSeenAt, TZ, "d LLL · HH:mm")}
                      </span>
                      {d.lastSeenIp ? (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-3 w-3" /> {d.lastSeenIp}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {status === "approved" ? (
                    <DeviceRowActions
                      deviceId={d.id}
                      currentLabel={d.label}
                    />
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
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
      className={cn(
        "rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
