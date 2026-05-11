import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, type ActiveSession } from "./session";
import { resolveClientIp } from "../ip";

export type AdminRequestContext = {
  session: ActiveSession;
  ip: string | null;
  userAgent: string | null;
};

/**
 * Common entry point for admin server actions and admin route handlers.
 * Redirects to /login if there's no admin session.
 *
 * Returns the active session plus request-scoped IP / user agent so callers
 * don't have to re-derive them.
 */
export async function requireAdmin(): Promise<AdminRequestContext> {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    redirect("/login?tab=admin");
  }
  const headerList = await headers();
  return {
    session,
    ip: resolveClientIp(headerList),
    userAgent: headerList.get("user-agent"),
  };
}
