import { env } from "./env";

/**
 * Resolve the client IP from request headers.
 *
 * Pattern adapted from `~/Desktop/punchclock/backend/app/middleware/ip_allowlist.py`:
 * try X-Forwarded-For first non-empty entry, then X-Real-IP, else null.
 *
 * `headers` is a Headers-like object (e.g., `await headers()` in a server
 * component, or `request.headers` in a proxy / route handler).
 *
 * Trust of forwarding headers is controlled by `TRUST_FORWARDED_HEADERS`.
 * In production behind Caddy this should be `true`; in local dev (no proxy)
 * it should be `false`.
 */
export function resolveClientIp(headers: {
  get(name: string): string | null;
}): string | null {
  if (env.TRUST_FORWARDED_HEADERS) {
    // Cloudflare Tunnel and Cloudflare Proxy both forward the original client
    // IP in this header. It's the highest-trust signal when present because
    // Cloudflare strips any client-set value before adding its own.
    const cfIp = headers.get("cf-connecting-ip");
    if (cfIp) return cfIp.trim();

    const xff = headers.get("x-forwarded-for");
    if (xff) {
      for (const part of xff.split(",")) {
        const trimmed = part.trim();
        if (trimmed) return trimmed;
      }
    }
    const realIp = headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }

  // In dev or when proxy headers aren't trusted, Next.js exposes the
  // connection remote address via this header inside the proxy runtime.
  const portsideClientIp = headers.get("x-portside-client-ip");
  if (portsideClientIp) return portsideClientIp.trim();

  return null;
}

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_REGEX = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;

export function isValidIp(ip: string): boolean {
  if (IPV4_REGEX.test(ip)) {
    return ip.split(".").every((octet) => {
      const n = Number(octet);
      return n >= 0 && n <= 255;
    });
  }
  return IPV6_REGEX.test(ip);
}
