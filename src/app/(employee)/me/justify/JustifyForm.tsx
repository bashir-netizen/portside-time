"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Send } from "lucide-react";
import { submitJustificationAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Result = { ok: boolean; message?: string } | null;

export function JustifyForm({
  incidentId,
  hoursRemaining,
}: {
  incidentId: string;
  hoursRemaining: number;
}) {
  const t = useTranslations("justify.form");
  const [state, action, pending] = useActionState<Result, FormData>(
    async (_prev, fd) => {
      const r = await submitJustificationAction(fd);
      return r.ok ? { ok: true } : { ok: false, message: r.message };
    },
    null,
  );

  if (state?.ok) {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/10 px-3 py-2 text-xs text-foreground">
        <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
        {t("successTitle")}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="incidentId" value={incidentId} />
      <Label
        htmlFor={`reason-${incidentId}`}
        className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground"
      >
        {t("reasonLabel", { hours: hoursRemaining })}
      </Label>
      <Textarea
        id={`reason-${incidentId}`}
        name="reason"
        rows={3}
        minLength={3}
        maxLength={2000}
        placeholder={t("reasonPlaceholder")}
        required
        className="text-sm"
      />
      {state?.ok === false ? (
        <p className="text-xs text-[var(--destructive)]">{state.message}</p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        disabled={pending}
        className="self-start"
      >
        <Send className="mr-1.5 h-3.5 w-3.5" />
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
