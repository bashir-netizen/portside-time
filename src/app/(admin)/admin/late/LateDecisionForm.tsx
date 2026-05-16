"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { decideLateIncidentAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Result = { ok: boolean; error?: string } | null;

export function LateDecisionForm({ incidentId }: { incidentId: string }) {
  const [state, action, pending] = useActionState<Result, FormData>(
    decideLateIncidentAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="incidentId" value={incidentId} />
      <Label
        htmlFor={`notes-${incidentId}`}
        className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground"
      >
        Decision notes (optional)
      </Label>
      <Textarea
        id={`notes-${incidentId}`}
        name="notes"
        rows={2}
        maxLength={1000}
        placeholder="e.g. accepted — power outage at home"
        className="text-sm"
      />
      {state?.ok === false ? (
        <p className="text-xs text-[var(--destructive)]">{state.error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          name="decision"
          value="justified"
          disabled={pending}
          className="border-[var(--success)]/40 bg-[var(--success)]/15 text-foreground hover:bg-[var(--success)]/25"
          variant="outline"
        >
          <Check className="mr-1.5 h-3.5 w-3.5 text-[var(--success)]" />
          Accept (justified)
        </Button>
        <Button
          type="submit"
          size="sm"
          name="decision"
          value="manager_unjustified"
          disabled={pending}
          className="border-[var(--destructive)]/40 bg-[var(--destructive)]/10 text-foreground hover:bg-[var(--destructive)]/20"
          variant="outline"
        >
          <X className="mr-1.5 h-3.5 w-3.5 text-[var(--destructive)]" />
          Reject (counts toward 3-in-30)
        </Button>
      </div>
    </form>
  );
}
