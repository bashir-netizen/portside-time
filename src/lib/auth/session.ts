import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "../db";

export const SESSION_COOKIE = "portside_session";

const ADMIN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const EMPLOYEE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export type SessionRole = "admin" | "employee";

export type ActiveSession = {
  id: string;
  role: SessionRole;
  userId: string | null;
  employeeId: string | null;
  deviceId: string | null;
  sourceIp: string | null;
  expiresAt: Date;
  lastSensitiveActionAt: Date | null;
};

export function ttlForRole(role: SessionRole): number {
  return role === "admin" ? ADMIN_TTL_MS : EMPLOYEE_TTL_MS;
}

export async function createSession(args: {
  role: SessionRole;
  userId?: string;
  employeeId?: string;
  deviceId?: string | null;
  sourceIp?: string | null;
  markSensitive?: boolean;
}): Promise<ActiveSession> {
  const id = randomBytes(32).toString("hex");
  const ttl = ttlForRole(args.role);
  const expiresAt = new Date(Date.now() + ttl);
  const lastSensitive = args.markSensitive ? new Date() : null;

  const row = await db.session.create({
    data: {
      id,
      userId: args.userId ?? null,
      employeeId: args.employeeId ?? null,
      role: args.role,
      expiresAt,
      lastSensitiveActionAt: lastSensitive,
      sourceIp: args.sourceIp ?? null,
      deviceId: args.deviceId ?? null,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ttl / 1000),
  });

  return {
    id: row.id,
    role: row.role as SessionRole,
    userId: row.userId,
    employeeId: row.employeeId,
    deviceId: row.deviceId,
    sourceIp: row.sourceIp,
    expiresAt: row.expiresAt,
    lastSensitiveActionAt: row.lastSensitiveActionAt,
  };
}

/**
 * Read and validate the current session.
 * Returns `null` if missing, malformed, expired, or revoked.
 * Side effect: extends `last_seen_at` and `expires_at` (sliding TTL).
 */
export async function readSession(): Promise<ActiveSession | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;

  const row = await db.session.findUnique({ where: { id } });
  if (!row) return null;

  const now = new Date();
  if (row.expiresAt <= now) {
    await db.session.delete({ where: { id } }).catch(() => {});
    jar.delete(SESSION_COOKIE);
    return null;
  }

  // Sliding TTL: extend on every read.
  const newExpiry = new Date(now.getTime() + ttlForRole(row.role as SessionRole));
  await db.session.update({
    where: { id },
    data: { lastSeenAt: now, expiresAt: newExpiry },
  });

  return {
    id: row.id,
    role: row.role as SessionRole,
    userId: row.userId,
    employeeId: row.employeeId,
    deviceId: row.deviceId,
    sourceIp: row.sourceIp,
    expiresAt: newExpiry,
    lastSensitiveActionAt: row.lastSensitiveActionAt,
  };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) {
    await db.session.delete({ where: { id } }).catch(() => {});
    jar.delete(SESSION_COOKIE);
  }
}

export async function markSensitiveActionVerified(sessionId: string): Promise<void> {
  await db.session.update({
    where: { id: sessionId },
    data: { lastSensitiveActionAt: new Date() },
  });
}
