import { redirect } from "next/navigation";
import Link from "next/link";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AdminLoginForm } from "./AdminLoginForm";
import { EmployeeLoginForm } from "./EmployeeLoginForm";

type Tab = "admin" | "employee";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; next?: string }>;
}) {
  const session = await readSession();
  if (session) {
    redirect(session.role === "admin" ? "/admin" : "/me");
  }

  const params = await searchParams;
  const tab: Tab = params.tab === "admin" ? "admin" : "employee";

  const activeEmployees =
    tab === "employee"
      ? await db.employee.findMany({
          where: { status: "active" },
          select: { id: true, fullName: true, position: true },
          orderBy: { fullName: "asc" },
        })
      : [];

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Portside Time
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to continue</p>
        </header>

        <nav className="grid grid-cols-2 mb-6 rounded-lg border border-zinc-200 p-1 dark:border-zinc-800">
          <TabLink href={`/login?tab=employee`} active={tab === "employee"}>
            Employee
          </TabLink>
          <TabLink href={`/login?tab=admin`} active={tab === "admin"}>
            Admin
          </TabLink>
        </nav>

        {tab === "admin" ? (
          <AdminLoginForm />
        ) : (
          <EmployeeLoginForm employees={activeEmployees} />
        )}
      </div>
    </main>
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
        "flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors " +
        (active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100")
      }
    >
      {children}
    </Link>
  );
}
