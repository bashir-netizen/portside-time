import { createHash } from "node:crypto";
import { env } from "../env";

/**
 * Server-side hash of the FingerprintJS `visitorId`.
 *
 * Hashing prevents an attacker who exfiltrates the Device table from
 * replaying the raw visitor IDs back to FingerprintJS to identify users.
 */
export function hashVisitorId(visitorId: string): string {
  return createHash("sha256")
    .update(visitorId + ":" + env.FINGERPRINT_SECRET)
    .digest("hex");
}
