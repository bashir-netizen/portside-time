import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

function databaseFilePath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  return url.startsWith("file:") ? url.slice("file:".length) : url;
}

function createClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: databaseFilePath() });
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // SQLite tuning. Best-effort; do not crash on failure.
  client.$executeRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});
  client.$executeRawUnsafe("PRAGMA synchronous=NORMAL;").catch(() => {});
  client.$executeRawUnsafe("PRAGMA foreign_keys=ON;").catch(() => {});

  return client;
}

export const db: PrismaClient = globalThis.__prisma__ ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma__ = db;
}
