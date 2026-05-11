import Link from "next/link";
import { db } from "@/lib/db";
import { verifyApprovalToken } from "@/lib/tokens";
import { formatDateTime } from "@/lib/time";
import { ApproveFromTokenForm } from "./ApproveFromTokenForm";

export default async function ApproveIpFromTokenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <Notice
        kind="error"
        title="Missing token"
        body="Open this page from the link in the email."
      />
    );
  }

  const v = verifyApprovalToken(token);
  if (!v.ok) {
    return (
      <Notice
        kind="error"
        title="Bad or expired token"
        body={
          v.reason === "expired"
            ? "This link has expired. Trigger a new login attempt from the office to get a fresh one."
            : "The link is malformed or tampered with."
        }
      />
    );
  }

  const pending = await db.pendingIp.findUnique({
    where: { id: v.pendingIpId },
  });
  if (!pending) {
    return (
      <Notice
        kind="error"
        title="Detection not found"
        body="This detection no longer exists."
      />
    );
  }
  if (pending.status !== "open" || pending.approvalToken !== token) {
    return (
      <Notice
        kind="info"
        title="Already resolved"
        body={
          <span>
            This detection has been{" "}
            <span className="font-medium">{pending.status}</span> already.
          </span>
        }
      />
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold">Approve new office IP</h1>
        <p className="mt-1 text-sm text-zinc-500">
          A login attempt from the office hit an IP that isn't allowlisted.
          Confirm to allow it.
        </p>
      </header>

      <dl className="grid grid-cols-3 gap-y-2 rounded-md bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-900">
        <dt className="col-span-1 text-zinc-500">IP</dt>
        <dd className="col-span-2 font-mono">{pending.ipAddress}</dd>
        <dt className="col-span-1 text-zinc-500">First seen</dt>
        <dd className="col-span-2">{formatDateTime(pending.firstSeenAt)}</dd>
        <dt className="col-span-1 text-zinc-500">Last seen</dt>
        <dd className="col-span-2">{formatDateTime(pending.lastSeenAt)}</dd>
        <dt className="col-span-1 text-zinc-500">Observations</dt>
        <dd className="col-span-2">{pending.observationCount}</dd>
      </dl>

      <ApproveFromTokenForm token={token} />
    </div>
  );
}

function Notice({
  kind,
  title,
  body,
}: {
  kind: "error" | "info";
  title: string;
  body: React.ReactNode;
}) {
  const bg =
    kind === "error"
      ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950"
      : "border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900";
  return (
    <div className={`max-w-md rounded-md border p-4 ${bg}`}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm">{body}</p>
      <Link
        href="/admin/ip-allowlist"
        className="mt-3 inline-block text-sm font-medium underline-offset-2 hover:underline"
      >
        Go to IP allowlist →
      </Link>
    </div>
  );
}
