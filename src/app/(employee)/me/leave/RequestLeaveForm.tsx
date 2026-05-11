"use client";

import { useActionState } from "react";
import { requestLeaveAction } from "./actions";
import { LEAVE_TYPES, LEAVE_TYPE_LABELS } from "@/schemas/leave";

type Result = { ok: boolean; error?: string } | null;

export function RequestLeaveForm() {
  const [state, action, pending] = useActionState<Result, FormData>(
    requestLeaveAction,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950">
        Request submitted. The admin will be notified.
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-zinc-500">Type</span>
        <select
          name="leaveType"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {LEAVE_TYPES.map((t) => (
            <option key={t} value={t}>
              {LEAVE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-zinc-500">From</span>
          <input
            name="startDate"
            type="date"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-zinc-500">To</span>
          <input
            name="endDate"
            type="date"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-zinc-500">Notes (optional)</span>
        <textarea
          name="notes"
          rows={2}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {state && !state.ok && state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
