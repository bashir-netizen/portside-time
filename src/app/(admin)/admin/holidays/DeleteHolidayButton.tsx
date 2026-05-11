"use client";

import { useTransition } from "react";
import { deleteHolidayAction } from "../leave/actions";

export function DeleteHolidayButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("Remove this holiday from the calendar?")) return;
        startTransition(() => deleteHolidayAction(id));
      }}
      disabled={pending}
      className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:text-red-300"
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
