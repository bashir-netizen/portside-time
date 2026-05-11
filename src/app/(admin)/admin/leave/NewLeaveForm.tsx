"use client";

import { useActionState } from "react";
import { createLeaveAction } from "./actions";
import { LEAVE_TYPES, LEAVE_TYPE_LABELS } from "@/schemas/leave";

type Result = { ok: boolean; error?: string } | null;

export function NewLeaveForm({
  employees,
}: {
  employees: { id: string; fullName: string }[];
}) {
  const [state, action, pending] = useActionState<Result, FormData>(
    createLeaveAction,
    null,
  );

  return (
    <form
      action={action}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-zinc-500">Employee</span>
        <select
          name="employeeId"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.fullName}
            </option>
          ))}
        </select>
      </label>
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
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-zinc-500">Start (Djibouti)</span>
        <input
          name="startDate"
          type="date"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-zinc-500">End (Djibouti)</span>
        <input
          name="endDate"
          type="date"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-zinc-500">Notes (optional)</span>
        <input
          name="notes"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {state && !state.ok && state.error && (
        <p role="alert" className="text-sm text-red-600 md:col-span-5">
          {state.error}
        </p>
      )}
      <div className="md:col-span-5">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Record leave"}
        </button>
      </div>
    </form>
  );
}
