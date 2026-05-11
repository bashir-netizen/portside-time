"use client";

import { useActionState } from "react";
import {
  approvePendingIpAction,
  dismissPendingIpAction,
} from "./actions";

type ActionResult = { ok: boolean; error?: string } | null;

export function PendingIpCard({
  id,
  ipAddress,
  firstSeenLabel,
  lastSeenLabel,
  observationCount,
}: {
  id: string;
  ipAddress: string;
  firstSeenLabel: string;
  lastSeenLabel: string;
  observationCount: number;
}) {
  const [approveState, approveAction, approvePending] = useActionState<
    ActionResult,
    FormData
  >(approvePendingIpAction, null);
  const [dismissState, dismissAction, dismissPending] = useActionState<
    ActionResult,
    FormData
  >(dismissPendingIpAction, null);

  const defaultLabel = `Office ${new Date().toISOString().slice(0, 7)}`;

  if (approveState?.ok || dismissState?.ok) {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        {approveState?.ok ? "Approved." : "Dismissed."}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-mono text-base font-medium">{ipAddress}</span>
          <span className="text-xs text-amber-800 dark:text-amber-200">
            seen {observationCount}×
          </span>
        </div>
        <div className="text-xs text-amber-900 dark:text-amber-200">
          First seen {firstSeenLabel} · Last seen {lastSeenLabel}
        </div>
      </div>

      <form
        action={approveAction}
        className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="pendingIpId" value={id} />
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium">Label</span>
          <input
            name="label"
            defaultValue={defaultLabel}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          disabled={approvePending}
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white dark:bg-emerald-600"
        >
          {approvePending ? "Approving…" : "Approve as office IP"}
        </button>
      </form>

      <form action={dismissAction} className="mt-2 flex items-center gap-2">
        <input type="hidden" name="pendingIpId" value={id} />
        <input
          name="reason"
          placeholder="Optional reason"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={dismissPending}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          {dismissPending ? "Dismissing…" : "Dismiss"}
        </button>
      </form>

      {(approveState?.error || dismissState?.error) && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {approveState?.error ?? dismissState?.error}
        </p>
      )}
    </div>
  );
}
