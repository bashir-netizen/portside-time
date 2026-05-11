"use client";

import { useActionState } from "react";
import { addPunchAction } from "./actions";
import { PUNCH_TYPES, PUNCH_LABELS } from "@/lib/punch/types";

type Result = { ok: boolean; error?: string } | null;

export function AddPunchForm({
  employees,
  defaultDate,
}: {
  employees: { id: string; fullName: string }[];
  defaultDate: string;
}) {
  const [state, action, pending] = useActionState<Result, FormData>(
    addPunchAction,
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
        <span className="text-xs text-zinc-500">Punch type</span>
        <select
          name="punchType"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {PUNCH_TYPES.map((t) => (
            <option key={t} value={t}>
              {PUNCH_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-zinc-500">Time (Djibouti)</span>
        <input
          name="punchedAt"
          type="datetime-local"
          defaultValue={`${defaultDate}T08:00`}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        <span className="text-xs text-zinc-500">Reason (min 5 chars)</span>
        <input
          name="reason"
          minLength={5}
          required
          placeholder="e.g. forgot to punch in"
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
          {pending ? "Adding…" : "Add punch"}
        </button>
      </div>
    </form>
  );
}
