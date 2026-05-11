import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";

const EXPORT_ROOT =
  process.env.NODE_ENV === "production" ? "/data/exports" : "./exports";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ period: string }> },
) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { period } = await ctx.params;
  if (!/^\d{4}-\d{2}-01$/.test(period)) {
    return NextResponse.json({ error: "bad_period" }, { status: 400 });
  }
  const filePath = path.join(EXPORT_ROOT, period, `${period}-all.zip`);
  try {
    const buf = await fs.readFile(filePath);
    const arr = new Uint8Array(buf);
    return new NextResponse(arr, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="portside-time-${period}.zip"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
