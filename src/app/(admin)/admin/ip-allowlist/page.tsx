import { AlertCircle, Globe, PlusCircle, ChevronDown } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddIpForm } from "./AddIpForm";
import { PendingIpCard } from "./PendingIpCard";
import { DeactivateButton } from "./DeactivateButton";

export const metadata = { title: "IP allowlist — Portside Time" };

const TZ = "Africa/Djibouti";

export default async function IpAllowlistPage() {
  const [active, pending] = await Promise.all([
    db.ipAllowlist.findMany({
      where: { active: true },
      orderBy: { addedAt: "desc" },
    }),
    db.pendingIp.findMany({
      where: { status: "open" },
      orderBy: { lastSeenAt: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <div className="label-eyebrow">Security · network</div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl tracking-tight md:text-5xl">
              IP allowlist
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{active.length}</span>{" "}
              active
              {pending.length > 0 ? (
                <>
                  {" · "}
                  <span className="font-mono tabular-nums text-[var(--warning)]">
                    {pending.length}
                  </span>{" "}
                  pending detection{pending.length === 1 ? "" : "s"}
                </>
              ) : null}
            </p>
          </div>
        </div>
      </header>

      <div className="rule-double" aria-hidden />

      {pending.length > 0 ? (
        <section
          aria-label="Pending detections"
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--warning)]" />
            <h2 className="font-display text-2xl tracking-tight">
              Pending detections
            </h2>
            <Badge className="border-[var(--warning)]/30 bg-[var(--warning)]/15 font-mono text-[10px] uppercase tracking-wider text-foreground hover:bg-[var(--warning)]/15">
              {pending.length}
            </Badge>
          </div>
          <div className="flex flex-col gap-2">
            {pending.map((p) => (
              <PendingIpCard
                key={p.id}
                id={p.id}
                ipAddress={p.ipAddress}
                firstSeenLabel={formatInTimeZone(
                  p.firstSeenAt,
                  TZ,
                  "d LLL · HH:mm"
                )}
                lastSeenLabel={formatInTimeZone(
                  p.lastSeenAt,
                  TZ,
                  "d LLL · HH:mm"
                )}
                observationCount={p.observationCount}
              />
            ))}
          </div>
        </section>
      ) : null}

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/30">
          <PlusCircle className="h-4 w-4 text-[var(--brass)]" />
          <span className="text-sm font-medium">Add an IP manually</span>
          <ChevronDown
            className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
            strokeWidth={1.75}
          />
        </summary>
        <Card className="mt-2 bg-card p-5">
          <AddIpForm />
        </Card>
      </details>

      <section
        aria-label="Active allowlist"
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-2xl tracking-tight">
            Active allowlist
          </h2>
        </div>

        {active.length === 0 ? (
          <div className="rounded-sm border border-dashed border-destructive/40 bg-destructive/8 px-4 py-6 text-center">
            <AlertCircle
              className="mx-auto h-6 w-6 text-destructive"
              strokeWidth={1.5}
            />
            <p className="mt-2 text-sm text-foreground">
              No active IPs.{" "}
              <span className="text-muted-foreground">
                Until an IP is on the list, no employee can sign in.
              </span>
            </p>
          </div>
        ) : (
          <Card className="bg-card p-0">
            <ul className="divide-y divide-border">
              {active.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]"
                  >
                    <Globe className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium tabular-nums">
                        {row.ipAddress}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.label}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      Added{" "}
                      {formatInTimeZone(row.addedAt, TZ, "d LLL yyyy · HH:mm")}
                    </span>
                  </div>
                  <DeactivateButton id={row.id} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
