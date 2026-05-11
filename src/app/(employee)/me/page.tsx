import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { logoutAction } from "@/app/login/actions";

export default async function MePage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "employee") redirect("/admin");
  if (!session.employeeId) redirect("/login");

  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
  });

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{employee?.fullName}</h1>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-xs text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
            >
              Sign out
            </button>
          </form>
        </header>
        <section className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          The punch button arrives in Phase 2 (build-order step 7). You're
          signed in and the four security checks pass — that's the foundation
          done.
        </section>
      </div>
    </main>
  );
}
