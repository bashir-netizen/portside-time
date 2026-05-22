import { redirect } from "next/navigation";
import Link from "next/link";
import { Anchor } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { readSession } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";
import { db } from "@/lib/db";
import { EmployeeSidebarNav } from "@/components/employee/sidebar-nav";
import { EmployeeMobileNav } from "@/components/employee/mobile-nav";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "employee" || !session.employeeId) redirect("/admin");

  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true, position: true },
  });

  const locale = await getLocale();
  const t = await getTranslations("common");
  const tMe = await getTranslations("me");
  const intlLocale = locale === "fr" ? "fr-FR" : "en-GB";
  const todayLabel = new Intl.DateTimeFormat(intlLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Djibouti",
  }).format(new Date());

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[14rem_1fr] lg:grid-rows-[auto_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:row-span-2 lg:flex lg:flex-col">
        <Link
          href="/me"
          className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-5"
          aria-label="Portside Time — Today"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-sm bg-foreground text-background ring-1 ring-[var(--brass)]/40"
          >
            <Anchor className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg tracking-tight">
              Portside Time
            </span>
            <span className="label-eyebrow !text-[0.625rem]">
              {employee?.fullName ?? "Employee"}
            </span>
          </span>
        </Link>

        <div className="flex-1 overflow-y-auto py-5">
          <EmployeeSidebarNav />
        </div>

        <div className="border-t border-sidebar-border p-4">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-sm px-3 py-2 text-left text-xs text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              {t("signOut")}
            </button>
          </form>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-2.5 backdrop-blur lg:col-start-2 lg:px-6">
        <Link
          href="/me"
          className="flex items-center gap-2 lg:hidden"
          aria-label="Portside Time — Today"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-foreground text-background">
            <Anchor className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <span className="font-display text-base tracking-tight">
            Portside Time
          </span>
        </Link>

        <div className="hidden flex-col leading-tight md:flex">
          <span className="label-eyebrow">{tMe("todayHeader")}</span>
          <time className="font-mono text-xs text-foreground/80">
            {todayLabel}
          </time>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right md:flex md:flex-col md:leading-tight">
            <span className="text-sm font-medium">
              {employee?.fullName ?? "—"}
            </span>
            <span className="label-eyebrow !text-[0.625rem]">
              {employee?.position ?? ""}
            </span>
          </div>
          <form action={logoutAction} className="lg:hidden">
            <button
              type="submit"
              className="rounded-sm border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t("signOut")}
            </button>
          </form>
        </div>
      </header>

      <main className="px-3 py-5 pb-24 md:px-6 lg:col-start-2 lg:pb-12">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </main>

      <EmployeeMobileNav />
    </div>
  );
}
