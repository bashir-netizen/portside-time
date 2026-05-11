"use client";

import { useActionState } from "react";
import { approveFromTokenAction } from "../actions";

export function ApproveFromTokenForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<
    { ok: boolean; error?: string } | null,
    FormData
  >(approveFromTokenAction, null);

  const defaultLabel = `Office ${new Date().toISOString().slice(0, 7)}`;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Label this IP</span>
        <input
          name="label"
          required
          defaultValue={defaultLabel}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white dark:bg-emerald-600"
      >
        {pending ? "Approving…" : "Approve as office IP"}
      </button>
    </form>
  );
}
