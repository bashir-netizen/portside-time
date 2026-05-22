import Link from "next/link";
import { AlertCircle, Info, ShieldCheck, ArrowRight } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { verifyApprovalToken } from "@/lib/tokens";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ApproveFromTokenForm } from "./ApproveFromTokenForm";

export const metadata = { title: "Approve IP — Portside Time" };

const TZ = "Africa/Djibouti";

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
            : "The link is malformed or has been tampered with."
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
        body="This detection no longer exists in the database."
      />
    );
  }
  if (pending.status !== "open" || pending.approvalToken !== token) {
    return (
      <Notice
        kind="info"
        title="Already resolved"
        body={
          <>
            This detection has been{" "}
            <span className="font-mono text-foreground">{pending.status}</span>{" "}
            already.
          </>
        }
      />
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-7">
      <header>
        <div className="label-eyebrow flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-[var(--brass)]" />
          Email approval link
        </div>
        <h1 className="mt-1 font-display text-4xl tracking-tight md:text-5xl">
          Approve new office IP
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A login attempt from the office hit an IP that isn't on the
          allowlist. Confirm to add it so employees can sign in.
        </p>
      </header>

      <div className="rule-double" aria-hidden />

      <Card className="bg-card p-0">
        <div className="flex flex-col gap-px">
          <Row label="IP address" value={pending.ipAddress} mono />
          <Separator />
          <Row
            label="First seen"
            value={formatInTimeZone(pending.firstSeenAt, TZ, "EEEE d LLL · HH:mm")}
            mono
          />
          <Separator />
          <Row
            label="Last seen"
            value={formatInTimeZone(pending.lastSeenAt, TZ, "EEEE d LLL · HH:mm")}
            mono
          />
          <Separator />
          <Row
            label="Observations"
            value={String(pending.observationCount)}
            mono
            badge={
              <Badge
                variant="outline"
                className="font-mono text-[10px] uppercase tracking-wider"
              >
                attempts so far
              </Badge>
            }
          />
        </div>
      </Card>

      <ApproveFromTokenForm token={token} />
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="label-eyebrow flex-1">{label}</span>
      <span
        className={`text-sm ${mono ? "font-mono tabular-nums" : ""} text-foreground`}
      >
        {value}
      </span>
      {badge}
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
  const isError = kind === "error";
  const Icon = isError ? AlertCircle : Info;
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Card
        className={
          isError
            ? "border-destructive/40 bg-destructive/8 p-5"
            : "bg-card p-5"
        }
      >
        <div className="flex items-start gap-3">
          <Icon
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              isError ? "text-destructive" : "text-[var(--brass)]"
            }`}
            strokeWidth={1.75}
          />
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-xl">{title}</h2>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        </div>
      </Card>
      <Link
        href="/admin/ip-allowlist"
        className="inline-flex items-center gap-1 text-sm font-medium hover:underline-brass"
      >
        Go to IP allowlist
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
