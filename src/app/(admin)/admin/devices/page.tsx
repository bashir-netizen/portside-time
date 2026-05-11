import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { DeviceRowActions } from "./DeviceRowActions";

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const status = tab === "revoked" ? "revoked" : "approved";

  const devices = await db.device.findMany({
    where: { status },
    orderBy: { lastSeenAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Devices</h1>
        <Link
          href="/admin/devices/register"
          className="self-start rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Register this device
        </Link>
      </header>

      <nav className="inline-flex gap-1 rounded-md border border-zinc-200 p-1 dark:border-zinc-800">
        <TabLink href="/admin/devices" active={status === "approved"}>
          Approved
        </TabLink>
        <TabLink href="/admin/devices?tab=revoked" active={status === "revoked"}>
          Revoked
        </TabLink>
      </nav>

      {devices.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
          {status === "approved"
            ? "No approved devices yet. Register an office PC to get started."
            : "No revoked devices."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {devices.map((d) => (
            <li
              key={d.id}
              className="rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium">{d.label}</span>
                  <span className="truncate text-xs text-zinc-500">
                    {d.userAgent}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Last seen {formatDateTime(d.lastSeenAt)}
                    {d.lastSeenIp ? ` · ${d.lastSeenIp}` : ""}
                  </span>
                </div>
                {status === "approved" && (
                  <DeviceRowActions deviceId={d.id} currentLabel={d.label} />
                )}
              </div>
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
      className={
        "rounded px-3 py-1 text-xs font-medium " +
        (active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-600 dark:text-zinc-400")
      }
    >
      {children}
    </Link>
  );
}
