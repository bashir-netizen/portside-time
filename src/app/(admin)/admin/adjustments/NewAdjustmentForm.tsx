"use client";

import { useActionState } from "react";
import { createAdjustmentAction } from "./actions";

type Result = { ok: boolean; error?: string } | null;

export function NewAdjustmentForm({
  employees,
  periods,
}: {
  employees: { id: string; fullName: string }[];
  periods: { ymd: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<Result, FormData>(
    createAdjustmentAction,
    null,
  );

  if (periods.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No locked periods yet — there's nothing to adjust.
      </p>
    );
  }

  return (
    <form
      action={action}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4"
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
        <span className="text-xs text-zinc-500">About locked period</span>
        <select
          name="appliesToPeriod"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {periods.map((p) => (
            <option key={p.ymd} value={p.ymd}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-zinc-500">
          Amount (DJF; +addition / −deduction)
        </span>
        <input
          name="amountDjf"
          type="number"
          required
          step="1"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm md:col-span-1">
        <span className="text-xs text-zinc-500">Reason (≥ 5 chars)</span>
        <input
          name="reason"
          minLength={5}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {state && !state.ok && state.error && (
        <p role="alert" className="text-sm text-red-600 md:col-span-4">
          {state.error}
        </p>
      )}
      <div className="md:col-span-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Record adjustment"}
        </button>
      </div>
    </form>
  );
}
