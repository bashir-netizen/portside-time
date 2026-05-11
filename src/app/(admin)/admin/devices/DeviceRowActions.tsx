"use client";

import { useState, useTransition } from "react";
import { relabelDeviceAction, revokeDeviceAction } from "./actions";

export function DeviceRowActions({
  deviceId,
  currentLabel,
}: {
  deviceId: string;
  currentLabel: string;
}) {
  const [mode, setMode] = useState<"idle" | "relabel" | "revoke">("idle");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (mode === "relabel") {
    return (
      <form
        action={(fd) => {
          startTransition(async () => {
            const r = await relabelDeviceAction(deviceId, fd);
            if (r.ok) setMode("idle");
            else setError(r.error ?? "Failed");
          });
        }}
        className="flex items-center gap-2"
      >
        <input
          name="label"
          defaultValue={currentLabel}
          required
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setMode("idle")}
          className="text-xs text-zinc-500"
        >
          Cancel
        </button>
        {error && (
          <span role="alert" className="text-xs text-red-600">
            {error}
          </span>
        )}
      </form>
    );
  }

  if (mode === "revoke") {
    return (
      <form
        action={(fd) => {
          startTransition(async () => {
            const r = await revokeDeviceAction(deviceId, fd);
            if (r.ok) setMode("idle");
            else setError(r.error ?? "Failed");
          });
        }}
        className="flex items-center gap-2"
      >
        <input
          name="reason"
          required
          minLength={5}
          placeholder="Reason"
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white"
        >
          {pending ? "…" : "Revoke"}
        </button>
        <button
          type="button"
          onClick={() => setMode("idle")}
          className="text-xs text-zinc-500"
        >
          Cancel
        </button>
        {error && (
          <span role="alert" className="text-xs text-red-600">
            {error}
          </span>
        )}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setMode("relabel")}
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
      >
        Relabel
      </button>
      <button
        type="button"
        onClick={() => setMode("revoke")}
        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:text-red-300"
      >
        Revoke
      </button>
    </div>
  );
}
