import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Thin proxy: resolve client IP into a request header so server components,
 * server actions, and route handlers have a single source of truth for it.
 *
 * Deep auth / device / IP-allowlist checks live in route-group layouts and in
 * the individual server actions (see Phase 1 plan §5/§6), not here — the
 * Next.js docs explicitly warn against relying on shared modules from proxy.
 */
export function proxy(request: NextRequest): NextResponse {
  // Next.js doesn't expose `request.ip` directly anymore, so the fall-back
  // path uses x-forwarded-for / x-real-ip. We surface the chosen IP on a
  // dedicated header so downstream code never has to re-derive it.
  const xff = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  let resolved: string | null = null;
  if (xff) {
    for (const part of xff.split(",")) {
      const trimmed = part.trim();
      if (trimmed) {
        resolved = trimmed;
        break;
      }
    }
  }
  if (!resolved && realIp) resolved = realIp.trim();

  const requestHeaders = new Headers(request.headers);
  if (resolved) requestHeaders.set("x-portside-client-ip", resolved);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // Run on everything except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)",
  ],
};
