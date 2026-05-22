"use client";

import { useTransition } from "react";
import { Check, X, Stethoscope, ShieldOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markCertifiedSickAction(request.id);
            })
          }
          className="gap-1.5 bg-[var(--success)] text-[var(--success-foreground)] hover:bg-[var(--success)]/90"
        >
          <Stethoscope className="h-3.5 w-3.5" />
          {pending ? "Recording…" : "Mark certified sick"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markUnauthorizedAction(request.id);
            })
          }
          className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <ShieldOff className="h-3.5 w-3.5" />
          {pending ? "…" : "Mark unauthorized"}
        </Button>
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
      <Input
        name="notes"
        placeholder="Optional notes for the employee"
        className="h-8 flex-1 bg-background text-xs"
      />
      <Button
        type="submit"
        name="decision"
        value="approved"
        size="sm"
        disabled={pending}
        className="gap-1.5 bg-[var(--success)] text-[var(--success-foreground)] hover:bg-[var(--success)]/90"
      >
        <Check className="h-3.5 w-3.5" />
        {pending ? "…" : "Approve"}
      </Button>
      <Button
        type="submit"
        name="decision"
        value="rejected"
        size="sm"
        variant="outline"
        disabled={pending}
        className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
        {pending ? "…" : "Reject"}
      </Button>
    </form>
  );
}
