import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

const ARGON_OPTS = {
  memoryCost: 64 * 1024, // 64 MiB
  timeCost: 3,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return argonHash(plain, ARGON_OPTS);
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await argonVerify(hash, plain);
  } catch {
    // Malformed hash, mismatched algorithm, etc. — treat as failure.
    return false;
  }
}

export function generateRandomPin(length: 4 | 6 = 6): string {
  const max = 10 ** length;
  const n = Math.floor(Math.random() * max);
  return n.toString().padStart(length, "0");
}

export function generateRandomPassword(length = 16): string {
  const chars =
    "abcdefghijklmnpqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ23456789!@#$%^*";
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i]! % chars.length];
  }
  return out;
}
