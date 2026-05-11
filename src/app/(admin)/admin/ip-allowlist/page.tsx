import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { AddIpForm } from "./AddIpForm";
import { PendingIpCard } from "./PendingIpCard";
import { DeactivateButton } from "./DeactivateButton";

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
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">IP allowlist</h1>

      {pending.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Pending detections
          </h2>
          {pending.map((p) => (
            <PendingIpCard
              key={p.id}
              id={p.id}
              ipAddress={p.ipAddress}
              firstSeenLabel={formatDateTime(p.firstSeenAt)}
              lastSeenLabel={formatDateTime(p.lastSeenAt)}
              observationCount={p.observationCount}
            />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Add an IP manually
        </h2>
        <AddIpForm />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Active allowlist
        </h2>
        {active.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-800">
            No active IPs. Until an IP is on the list, employees cannot sign in.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {active.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">
                      {row.ipAddress}
                    </span>
                    <span className="text-zinc-500">{row.label}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Added {formatDateTime(row.addedAt)}
                  </div>
                </div>
                <DeactivateButton id={row.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
