"use client";

import { useTransition } from "react";
import { deactivateIpAction } from "./actions";

export function DeactivateButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("Deactivate this IP? Employees on this network will be blocked.")) {
          return;
        }
        startTransition(async () => {
          await deactivateIpAction(id);
        });
      }}
      disabled={pending}
      className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium dark:border-zinc-700"
    >
      {pending ? "…" : "Deactivate"}
    </button>
  );
}
