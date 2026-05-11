import { db } from "./db";

type AuditActor =
  | { type: "user"; id: string }
  | { type: "employee"; id: string }
  | { type: "system" };

type AuditInput = {
  actor: AuditActor;
  action: string;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  sourceIp?: string | null;
  deviceId?: string | null;
  userAgent?: string | null;
  checkFailed?: "ip" | "device" | "session" | "sequence" | null;
};

function truncate(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const json = JSON.stringify(value);
  if (json.length > 2048) {
    return JSON.stringify({ truncated: true, preview: json.slice(0, 2000) });
  }
  return json;
}

/**
 * Append-only audit log writer.
 *
 * Never throws — if the write fails the calling action should not crash on
 * our account. Failure is logged to stderr so it shows up in operator logs.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorUserId: input.actor.type === "user" ? input.actor.id : null,
        actorEmployeeId:
          input.actor.type === "employee" ? input.actor.id : null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        beforeJson: truncate(input.before),
        afterJson: truncate(input.after),
        sourceIp: input.sourceIp ?? null,
        deviceId: input.deviceId ?? null,
        userAgent: input.userAgent ?? null,
        checkFailed: input.checkFailed ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit row", {
      action: input.action,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
