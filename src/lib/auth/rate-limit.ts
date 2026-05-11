import { db } from "../db";

const PER_IP_WINDOW_MS = 60 * 1000;
const PER_IP_MAX = 10;
const ACCOUNT_LOCK_THRESHOLD = 10;
const ACCOUNT_LOCK_WINDOW_MS = 5 * 60 * 1000;
const ACCOUNT_LOCK_MS = 15 * 60 * 1000;

type Counter = { count: number; resetAt: number };
const ipCounters = new Map<string, Counter>();

/**
 * Per-IP rate limit for the public login endpoint.
 * In-memory token bucket; resets every 60 seconds.
 */
export function checkIpRate(ip: string | null): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  if (!ip) return { allowed: true, retryAfterSeconds: 0 };

  const now = Date.now();
  const c = ipCounters.get(ip);
  if (!c || c.resetAt <= now) {
    ipCounters.set(ip, { count: 1, resetAt: now + PER_IP_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  c.count++;
  if (c.count > PER_IP_MAX) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((c.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Check if an admin account is currently locked out. */
export async function checkAccountLocked(
  email: string,
): Promise<{ locked: boolean; until?: Date }> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { locked: false };
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    return { locked: true, until: user.lockoutUntil };
  }
  return { locked: false };
}

export async function recordFailedLogin(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return;

  const newCount = user.failedLoginCount + 1;
  if (newCount >= ACCOUNT_LOCK_THRESHOLD) {
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockoutUntil: new Date(Date.now() + ACCOUNT_LOCK_MS),
      },
    });
  } else {
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: newCount },
    });
  }
}

export async function resetFailedLogin(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockoutUntil: null },
  });
}

// Re-export window constant for tests / docs.
export const RATE_LIMIT_WINDOW_MS = PER_IP_WINDOW_MS;
export const RATE_LIMIT_MAX = PER_IP_MAX;
export const ACCOUNT_LOCKOUT_WINDOW_MS = ACCOUNT_LOCK_WINDOW_MS;
export const ACCOUNT_LOCKOUT_MS = ACCOUNT_LOCK_MS;
