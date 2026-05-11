"use client";

import { useTransition } from "react";
import {
  decideLeaveAction,
  markCertifiedSickAction,
  markUnauthorizedAction,
} from "./actions";

type Request = {
  id: string;
  status: string;
  leaveType: string;
};

export function DecideButtons({ request }: { request: Request }) {
  const [pending, startTransition] = useTransition();

  if (request.status === "pending_certificate") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markCertifiedSickAction(request.id);
            })
          }
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white"
        >
          {pending ? "…" : "Mark certified sick"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markUnauthorizedAction(request.id);
            })
          }
          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 dark:border-red-800 dark:text-red-300"
        >
          {pending ? "…" : "Mark unauthorized"}
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      action={(fd) =>
        startTransition(async () => {
          fd.set("requestId", request.id);
          await decideLeaveAction(null, fd);
        })
      }
    >
      <input
        name="notes"
        placeholder="Optional notes"
        className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        name="decision"
        value="approved"
        disabled={pending}
        className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white"
      >
        {pending ? "…" : "Approve"}
      </button>
      <button
        type="submit"
        name="decision"
        value="rejected"
        disabled={pending}
        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 dark:border-red-800 dark:text-red-300"
      >
        {pending ? "…" : "Reject"}
      </button>
    </form>
  );
}
