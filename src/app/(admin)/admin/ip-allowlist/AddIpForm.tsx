"use client";

import { useActionState } from "react";
import { addIpAction } from "./actions";

export function AddIpForm() {
  const [state, action, pending] = useActionState<
    { ok: boolean; error?: string } | null,
    FormData
  >(addIpAction, null);

  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-xs font-medium">IP address</span>
        <input
          name="ipAddress"
          required
          placeholder="e.g. 196.207.x.y"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-xs font-medium">Label</span>
        <input
          name="label"
          required
          placeholder="e.g. Office WiFi"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Adding…" : "Add IP"}
      </button>
      {state && !state.ok && state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
