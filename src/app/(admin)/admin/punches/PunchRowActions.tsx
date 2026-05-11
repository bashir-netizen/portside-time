"use client";

import { useState, useTransition } from "react";
import { editPunchAction, voidPunchAction } from "./actions";

export function PunchRowActions({
  punchId,
  currentTime,
}: {
  punchId: string;
  currentTime: string;
}) {
  const [mode, setMode] = useState<"idle" | "edit" | "void">("idle");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // currentTime is an ISO string; the <input type="datetime-local"> wants
  // "YYYY-MM-DDTHH:mm" in the local form. Build it from the ISO using parts.
  const iso = new Date(currentTime);
  const yyyyMmDdHhMm = (() => {
    const d = iso;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours() + 3)}:${pad(d.getUTCMinutes())}`;
  })();

  if (mode === "edit") {
    return (
      <form
        action={(fd) =>
          startTransition(async () => {
            fd.set("punchId", punchId);
            const r = await editPunchAction(null, fd);
            if (r.ok) setMode("idle");
            else setError(r.error ?? "Failed");
          })
        }
        className="flex flex-wrap items-center gap-1"
      >
        <input
          type="datetime-local"
          name="punchedAt"
          defaultValue={yyyyMmDdHhMm}
          required
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          name="reason"
          minLength={5}
          required
          placeholder="Reason"
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-2 py-1 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900"
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

  if (mode === "void") {
    return (
      <form
        action={(fd) =>
          startTransition(async () => {
            fd.set("punchId", punchId);
            const r = await voidPunchAction(null, fd);
            if (r.ok) setMode("idle");
            else setError(r.error ?? "Failed");
          })
        }
        className="flex flex-wrap items-center gap-1"
      >
        <input
          name="reason"
          minLength={5}
          required
          placeholder="Reason"
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-red-600 px-2 py-1 text-xs text-white"
        >
          {pending ? "…" : "Void"}
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
        onClick={() => setMode("edit")}
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => setMode("void")}
        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:text-red-300"
      >
        Void
      </button>
    </div>
  );
}
