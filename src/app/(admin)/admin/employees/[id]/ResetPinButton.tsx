"use client";

import { useState, useTransition } from "react";
import { resetEmployeePinAction } from "../actions";

export function ResetPinButton({ employeeId }: { employeeId: string }) {
  const [pending, startTransition] = useTransition();
  const [pin, setPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    if (!confirm("Generate a new PIN for this employee?")) return;
    setError(null);
    startTransition(async () => {
      const r = await resetEmployeePinAction(employeeId);
      if (r.ok) setPin(r.pinPlain);
      else setError(r.error);
    });
  }

  if (pin) {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950">
        New PIN:{" "}
        <span className="font-mono tracking-[0.4em] text-base">{pin}</span>
        {" — "}
        <button
          type="button"
          onClick={() => setPin(null)}
          className="underline-offset-2 hover:underline"
        >
          dismiss
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={reset}
        disabled={pending}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700"
      >
        {pending ? "Generating…" : "Reset PIN"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
