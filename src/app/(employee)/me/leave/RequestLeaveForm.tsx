"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Send } from "lucide-react";
import { requestLeaveAction } from "./actions";
import { LEAVE_TYPES, type LeaveType } from "@/schemas/leave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Result = { ok: boolean; error?: string } | null;

export function RequestLeaveForm() {
  const t = useTranslations("leave");
  const [state, action, pending] = useActionState<Result, FormData>(
    requestLeaveAction,
    null
  );

  if (state?.ok) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/8 px-4 py-4"
      >
        <CheckCircle2
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success)]"
          strokeWidth={1.75}
        />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-foreground">{t("formSuccess")}</p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="leaveType">{t("formLeaveType")}</Label>
        <Select name="leaveType" defaultValue="annual" required>
          <SelectTrigger id="leaveType" className="bg-card">
            <SelectValue placeholder={t("formLeaveType")} />
          </SelectTrigger>
          <SelectContent>
            {LEAVE_TYPES.map((lt) => (
              <SelectItem key={lt} value={lt}>
                {t(`leaveTypes.${lt as LeaveType}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">{t("formStartDate")}</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            className="bg-card font-mono"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endDate">{t("formEndDate")}</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
            className="bg-card font-mono"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("formNotes")}</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          className="bg-card"
        />
      </div>

      {state && !state.ok && state.error ? (
        <div
          role="alert"
          className="rounded-sm border border-destructive/40 bg-destructive/8 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="self-start gap-2 rounded-sm"
      >
        <Send className="h-4 w-4" />
        {pending ? t("formSubmitting") : t("formSubmit")}
      </Button>
    </form>
  );
}
