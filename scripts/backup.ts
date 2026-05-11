/**
 * Nightly SQLite backup → encrypted → Backblaze B2.
 *
 * Steps:
 *   1. `sqlite3 portside.db ".backup '/tmp/portside-YYYY-MM-DD.db'"` — online
 *      snapshot, safe under WAL.
 *   2. AES-256-GCM encrypt with BACKUP_ENCRYPTION_KEY (32-byte hex).
 *   3. Upload to B2 via REST API.
 *
 * Retention is enforced by a B2 lifecycle rule on the bucket (set this once
 * in the dashboard: "Hide files after 90 days, delete after 91"). Keeping
 * retention out of this script means it can't accidentally orphan past
 * uploads, and it lets B2 do the cleanup atomically.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createCipheriv, randomBytes, createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

type BackupCfg = {
  dbPath: string;
  workDir: string;
  b2KeyId: string;
  b2AppKey: string;
  b2Bucket: string;
  encKeyHex: string;
};

function readCfg(): BackupCfg {
  const required = [
    "BACKUP_B2_KEY",
    "BACKUP_B2_SECRET",
    "BACKUP_B2_BUCKET",
    "BACKUP_ENCRYPTION_KEY",
  ];
  for (const k of required) {
    if (!process.env[k]) {
      console.error(`Missing ${k}`);
      process.exit(1);
    }
  }
  return {
    dbPath: process.env.DB_PATH ?? "/data/portside.db",
    workDir: process.env.BACKUP_WORK_DIR ?? "/tmp",
    b2KeyId: process.env.BACKUP_B2_KEY!,
    b2AppKey: process.env.BACKUP_B2_SECRET!,
    b2Bucket: process.env.BACKUP_B2_BUCKET!,
    encKeyHex: process.env.BACKUP_ENCRYPTION_KEY!,
  };
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function snapshot(cfg: BackupCfg, dest: string): void {
  const r = spawnSync(
    "sqlite3",
    [cfg.dbPath, `.backup '${dest.replace(/'/g, "''")}'`],
    { stdio: "inherit" },
  );
  if (r.status !== 0) throw new Error("sqlite3 backup failed");
}

async function encryptFile(plainPath: string, encPath: string, keyHex: string) {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY must be 32 bytes hex");
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
  const ciphertext = Buffer.concat(chunks);
  await fsp.writeFile(encPath, Buffer.concat([iv, tag, ciphertext]));
}

async function b2Auth(cfg: BackupCfg) {
  const basic = Buffer.from(`${cfg.b2KeyId}:${cfg.b2AppKey}`).toString("base64");
  const r = await fetch("https://api.backblazeb2.com/b2api/v3/b2_authorize_account", {
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!r.ok) throw new Error(`B2 auth failed: ${r.status}`);
  return (await r.json()) as {
    apiInfo: { storageApi: { apiUrl: string; bucketId?: string } };
    authorizationToken: string;
  };
}

async function uploadToB2(cfg: BackupCfg, fileName: string, body: Buffer) {
  const auth = await b2Auth(cfg);
  const apiUrl = auth.apiInfo.storageApi.apiUrl;
  const token = auth.authorizationToken;

  // Find bucket id by name (auth may already include the bucket if key is scoped)
  let bucketId = auth.apiInfo.storageApi.bucketId;
  if (!bucketId) {
    const list = await fetch(`${apiUrl}/b2api/v3/b2_list_buckets`, {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ bucketName: cfg.b2Bucket }),
    });
    if (!list.ok) throw new Error(`b2_list_buckets failed: ${list.status}`);
    const data = (await list.json()) as { buckets: Array<{ bucketId: string }> };
    bucketId = data.buckets[0]!.bucketId;
  }

  const uploadUrlRes = await fetch(`${apiUrl}/b2api/v3/b2_get_upload_url`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ bucketId }),
  });
  if (!uploadUrlRes.ok)
    throw new Error(`b2_get_upload_url failed: ${uploadUrlRes.status}`);
  const upload = (await uploadUrlRes.json()) as {
    uploadUrl: string;
    authorizationToken: string;
  };

  const sha1 = createHash("sha1").update(body).digest("hex");
  const put = await fetch(upload.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: upload.authorizationToken,
      "X-Bz-File-Name": encodeURIComponent(fileName),
      "Content-Type": "application/octet-stream",
      "X-Bz-Content-Sha1": sha1,
      "Content-Length": String(body.length),
    },
    body: new Uint8Array(body),
  });
  if (!put.ok) {
    const text = await put.text();
    throw new Error(`B2 upload failed: ${put.status} ${text}`);
  }
  console.log(`[backup] uploaded ${fileName} (${body.length} bytes)`);
}

async function main() {
  const cfg = readCfg();
  const stamp = ymd(new Date());
  const dbCopy = path.join(cfg.workDir, `portside-${stamp}.db`);
  const enc = `${dbCopy}.age`;

  console.log("[backup] starting", { dbPath: cfg.dbPath, stamp });
  snapshot(cfg, dbCopy);
  await encryptFile(dbCopy, enc, cfg.encKeyHex);
  const body = await fsp.readFile(enc);
  await uploadToB2(cfg, `portside-${stamp}.db.age`, body);
  await fsp.unlink(dbCopy).catch(() => {});
  await fsp.unlink(enc).catch(() => {});
  console.log("[backup] done");
}

main().catch((err) => {
  console.error("[backup] failed", err);
  process.exit(1);
});
