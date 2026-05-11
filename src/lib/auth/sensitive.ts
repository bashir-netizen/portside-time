import type { ActiveSession } from "./session";

export const SENSITIVE_WINDOW_MS = 15 * 60 * 1000;

export type SensitiveCheckResult =
  | { ok: true }
  | { ok: false; reason: "no_session" | "stale_sensitive" };

/**
 * Verify the session has a recent password re-entry.
 *
 * Returns `ok: true` if the user re-entered their password within the last
 * 15 minutes; otherwise `stale_sensitive`. Callers (admin server actions for
 * device approval, IP allowlist mutations, PIN reset, etc.) should redirect
 * to a "Re-enter your password" modal that calls the `reauth` action.
 */
export function checkRecentSensitive(
  session: ActiveSession | null,
): SensitiveCheckResult {
  if (!session) return { ok: false, reason: "no_session" };
  if (!session.lastSensitiveActionAt) {
    return { ok: false, reason: "stale_sensitive" };
  }
  const elapsed = Date.now() - session.lastSensitiveActionAt.getTime();
  if (elapsed > SENSITIVE_WINDOW_MS) {
    return { ok: false, reason: "stale_sensitive" };
  }
  return { ok: true };
}
