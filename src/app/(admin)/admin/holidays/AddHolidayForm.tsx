"use client";

import { useActionState } from "react";
import { addHolidayAction } from "../leave/actions";

type Result = { ok: boolean; error?: string } | null;

export function AddHolidayForm() {
  const [state, action, pending] = useActionState<Result, FormData>(
    addHolidayAction,
    null,
  );

  return (
    <form
      action={action}
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="text-xs text-zinc-500">Date</span>
        <input
          name="date"
          type="date"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="text-xs text-zinc-500">Name</span>
        <input
          name="name"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex items-center gap-1 text-sm">
        <input
          name="isPaid"
          type="checkbox"
          defaultChecked
          className="size-4"
        />
        <span>Paid</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      {state && !state.ok && state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
