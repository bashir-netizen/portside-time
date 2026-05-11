import { redirect } from "next/navigation";
import Link from "next/link";
import { readSession } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";

const NAV = [
  { href: "/admin", label: "Home", emoji: "🏠" },
  { href: "/admin/employees", label: "Staff", emoji: "👥" },
  { href: "/admin/punches", label: "Punches", emoji: "⏱️" },
  { href: "/admin/leave", label: "Leave", emoji: "📅" },
  { href: "/admin/reports", label: "Reports", emoji: "📊" },
  { href: "/admin/more", label: "More", emoji: "···" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/login?tab=admin");
  if (session.role !== "admin") redirect("/me");

  const adminUser = session.userId
    ? await db.user.findUnique({ where: { id: session.userId } })
    : null;

  // New-IP banner: open PendingIp rows whose tokens haven't expired.
  const pending = await db.pendingIp.findMany({
    where: { status: "open" },
    orderBy: { lastSeenAt: "desc" },
    take: 5,
  });

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <Link href="/admin" className="text-sm font-semibold tracking-tight">
          Portside Time · Admin
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-xs text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
            aria-label={`Sign out (${adminUser?.email ?? "admin"})`}
          >
            Sign out
          </button>
        </form>
      </header>

      {pending.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong>{pending.length}</strong> pending IP approval
              {pending.length > 1 ? "s" : ""}
              {" — "}
              <span className="font-mono">{pending[0]!.ipAddress}</span> first
              seen {formatDateTime(pending[0]!.firstSeenAt)}
            </div>
            <Link
              href="/admin/ip-allowlist"
              className="self-start rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-amber-200 dark:text-amber-950"
            >
              Review
            </Link>
          </div>
        </div>
      )}

      <main className="flex-1 px-4 py-6 pb-24 md:pb-6">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white px-2 py-2 md:hidden dark:border-zinc-800 dark:bg-zinc-950"
        aria-label="Primary"
      >
        <ul className="flex justify-around">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch={false}
                className="flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400"
              >
                <span className="text-base" aria-hidden>
                  {item.emoji}
                </span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
