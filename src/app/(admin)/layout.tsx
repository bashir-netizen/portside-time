import { redirect } from "next/navigation";
import Link from "next/link";
import { Anchor } from "lucide-react";
import { readSession } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { SidebarNav } from "@/components/admin/sidebar-nav";
import { MobileBottomNav, MobileTopMenuButton } from "@/components/admin/mobile-nav";
import { UserMenu } from "@/components/admin/user-menu";

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

  const pending = await db.pendingIp.findMany({
    where: { status: "open" },
    orderBy: { lastSeenAt: "desc" },
    take: 5,
  });

  // Today's date for the top bar — French long form, since the user reads
  // French in the office. The locale switcher will let an English admin flip.
  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Djibouti",
  }).format(new Date());

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr] lg:grid-rows-[auto_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:row-span-2 lg:flex lg:flex-col">
        <Link
          href="/admin"
          className="group flex items-center gap-2.5 border-b border-sidebar-border px-5 py-5"
          aria-label="Portside Time — Admin home"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-sm bg-[var(--foreground)] text-[var(--background)] ring-1 ring-[var(--brass)]/40"
          >
            <Anchor className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg tracking-tight">
              Portside Time
            </span>
            <span className="label-eyebrow !text-[0.625rem]">
              Admin · Djibouti
            </span>
          </span>
        </Link>

        <div className="flex-1 overflow-y-auto py-5">
          <SidebarNav />
        </div>

        {/* Footer ledger mark */}
        <div className="border-t border-sidebar-border px-5 py-3 text-[0.625rem] font-mono uppercase tracking-[0.18em] text-sidebar-foreground/55">
          <div>portside logistics</div>
          <div className="text-sidebar-foreground/40">manifest v1 · 2026</div>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-2.5 backdrop-blur lg:col-start-2 lg:px-6">
        <MobileTopMenuButton />

        <Link
          href="/admin"
          className="flex items-center gap-2 lg:hidden"
          aria-label="Portside Time"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-foreground text-background">
            <Anchor className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <span className="font-display text-base tracking-tight">
            Portside Time
          </span>
        </Link>

        <div className="hidden flex-col leading-tight md:flex">
          <span className="label-eyebrow">Today</span>
          <time className="font-mono text-xs text-foreground/80">
            {todayLabel}
          </time>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {adminUser?.email ? (
            <UserMenu email={adminUser.email} logoutAction={logoutAction} />
          ) : (
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-xs text-muted-foreground hover:underline"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>

      {/* Pending-IP warning band — sits between top bar and content */}
      {pending.length > 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="border-b border-[var(--warning)]/40 bg-[var(--warning)]/10 px-3 py-3 text-sm text-foreground lg:col-start-2 lg:px-6"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--warning)]"
              />
              <span>
                <strong className="font-medium">{pending.length}</strong>{" "}
                pending IP approval{pending.length > 1 ? "s" : ""}
                {" — "}
                <span className="font-mono">{pending[0]!.ipAddress}</span> first
                seen {formatDateTime(pending[0]!.firstSeenAt)}
              </span>
            </div>
            <Link
              href="/admin/ip-allowlist"
              className="self-start rounded-sm bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/85"
            >
              Review
            </Link>
          </div>
        </div>
      ) : null}

      {/* Main content area */}
      <main className="px-3 py-6 pb-24 md:px-6 lg:col-start-2 lg:pb-12">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
