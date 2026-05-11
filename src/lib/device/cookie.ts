import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "../env";

export const DEVICE_COOKIE = "portside_device";
const COOKIE_MAX_AGE_S = 365 * 24 * 60 * 60;

function sign(deviceId: string): string {
  return createHmac("sha256", env.DEVICE_COOKIE_SECRET)
    .update(deviceId)
    .digest("hex");
}

export function buildCookieValue(deviceId: string): string {
  return `${deviceId}.${sign(deviceId)}`;
}

export function parseCookieValue(
  value: string | undefined,
): { deviceId: string } | null {
  if (!value) return null;
  const idx = value.indexOf(".");
  if (idx <= 0 || idx === value.length - 1) return null;
  const deviceId = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = sign(deviceId);
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }
  return { deviceId };
}

export async function readDeviceCookie(): Promise<{ deviceId: string } | null> {
  const jar = await cookies();
  return parseCookieValue(jar.get(DEVICE_COOKIE)?.value);
}

export async function issueDeviceCookie(deviceId: string): Promise<void> {
  const jar = await cookies();
  jar.set(DEVICE_COOKIE, buildCookieValue(deviceId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE_S,
  });
}

export function newDeviceId(): string {
  return randomUUID();
}
