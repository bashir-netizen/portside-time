/**
 * Nightly local-disk SQLite backup for Path B (HP laptop at the office).
 *
 * Writes encrypted snapshots to /data/backups/ with 30 days of retention.
 * Copy the folder to a USB drive weekly for off-site safety.
 *
 * Steps:
 *   1. `sqlite3 portside.db ".backup '/data/backups/portside-YYYY-MM-DD.db'"`
 *   2. AES-256-GCM encrypt with BACKUP_ENCRYPTION_KEY (32-byte hex)
 *   3. Delete plaintext copy
 *   4. Prune .db.enc files older than 30 days
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createCipheriv, randomBytes } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const dbPath = process.env.DB_PATH ?? "/data/portside.db";
const backupDir = process.env.BACKUP_DIR ?? "/data/backups";
const encKeyHex = process.env.BACKUP_ENCRYPTION_KEY ?? "";
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? "30");

if (!encKeyHex) {
  console.error("BACKUP_ENCRYPTION_KEY is required");
  process.exit(1);
}
const key = Buffer.from(encKeyHex, "hex");
if (key.length !== 32) {
  console.error("BACKUP_ENCRYPTION_KEY must be 32 bytes hex");
  process.exit(1);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function snapshot(dest: string) {
  const r = spawnSync(
    "sqlite3",
    [dbPath, `.backup '${dest.replace(/'/g, "''")}'`],
    { stdio: "inherit" },
  );
  if (r.status !== 0) throw new Error("sqlite3 backup failed");
}

async function encryptFile(plainPath: string, encPath: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const input = fs.createReadStream(plainPath);
  const chunks: Buffer[] = [];
  for await (const chunk of input) {
    chunks.push(cipher.update(chunk as Buffer));
  }
  chunks.push(cipher.final());
  const tag = cipher.getAuthTag();
  // Format: [12 byte IV][16 byte tag][ciphertext]
  await fsp.writeFile(encPath, Buffer.concat([iv, tag, Buffer.concat(chunks)]));
}

async function prune() {
  const entries = await fsp.readdir(backupDir).catch(() => []);
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  for (const name of entries) {
    if (!name.endsWith(".db.enc")) continue;
    const full = path.join(backupDir, name);
    const stat = await fsp.stat(full).catch(() => null);
    if (stat && stat.mtimeMs < cutoff) {
      await fsp.unlink(full).catch(() => {});
      console.log(`[backup] pruned ${name}`);
    }
  }
}

async function main() {
  await fsp.mkdir(backupDir, { recursive: true });
  const stamp = ymd(new Date());
  const dbCopy = path.join(backupDir, `portside-${stamp}.db`);
  const enc = `${dbCopy}.enc`;

  console.log("[backup] starting", { dbPath, stamp });
  await snapshot(dbCopy);
  await encryptFile(dbCopy, enc);
  await fsp.unlink(dbCopy);
  await prune();
  console.log("[backup] done →", enc);
}

main().catch((err) => {
  console.error("[backup] failed", err);
  process.exit(1);
});
