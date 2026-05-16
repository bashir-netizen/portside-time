"use client";

import { useActionState } from "react";
import {
  Hourglass,
  Clock,
  CalendarDays,
  Wallet,
  Save,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveCompanyConfigAction,
  type SaveCompanyConfigResult,
} from "./actions";

type Props = {
  initial: {
    gracePeriodMinutes: number;
    justificationWindowHours: number;
    annualLeaveAccrualPerMonth: number;
    perDiemDefaultDjf: number | null;
  };
  updatedAt: string | null;
  updatedBy: string | null;
};

/**
 * Editable Company defaults form. Server action persists to the
 * CompanyConfig singleton row. Inline success card; field-level error
 * surfacing; saved-at hint.
 */
export function CompanyDefaultsForm({ initial, updatedAt, updatedBy }: Props) {
  const [state, action, pending] = useActionState<
    SaveCompanyConfigResult | null,
    FormData
  >(saveCompanyConfigAction, null);

  const fieldErrors =
    state && !state.ok && state.fieldErrors ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2">
        <NumberField
          icon={Hourglass}
          name="gracePeriodMinutes"
          label="Grace period"
          unit="min"
          defaultValue={initial.gracePeriodMinutes}
          hint="Punch within this window after expected start is on-time. Beyond: late incident."
          step={1}
          min={0}
          max={120}
          errors={fieldErrors?.gracePeriodMinutes}
        />
        <NumberField
          icon={Clock}
          name="justificationWindowHours"
          label="Justification window"
          unit="h"
          defaultValue={initial.justificationWindowHours}
          hint="Employee has this long to submit a reason before the late incident auto-flips to unjustified."
          step={1}
          min={1}
          max={168}
          errors={fieldErrors?.justificationWindowHours}
        />
        <NumberField
          icon={CalendarDays}
          name="annualLeaveAccrualPerMonth"
          label="Annual leave accrual"
          unit="jours / mois"
          defaultValue={initial.annualLeaveAccrualPerMonth}
          hint="Per Code du Travail Article 99. Default 2.5. Accrues from hire date."
          step={0.1}
          min={0}
          max={10}
          errors={fieldErrors?.annualLeaveAccrualPerMonth}
        />
        <NumberField
          icon={Wallet}
          name="perDiemDefaultDjf"
          label="Per diem (busy day)"
          unit="DJF"
          defaultValue={initial.perDiemDefaultDjf ?? ""}
          hint="Owed when employees stay on-site for lunch on a busy day. Blank = not configured yet."
          step={1}
          min={0}
          allowEmpty
          errors={fieldErrors?.perDiemDefaultDjf}
        />
      </div>

      <div className="flex items-start gap-2 rounded-sm border border-[var(--brass)]/30 bg-[var(--brass)]/8 px-3 py-2 text-xs">
        <Info
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brass)]"
          strokeWidth={1.75}
        />
        <span className="text-muted-foreground">
          Changes are audit-logged with before/after snapshots. The accrual
          rate change takes effect immediately on the next page load — every
          /me/pay balance is computed live.
        </span>
      </div>

      {state?.ok ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2.5 rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/8 px-3 py-2 text-sm"
        >
          <CheckCircle2
            className="h-4 w-4 text-[var(--success)]"
            strokeWidth={1.75}
          />
          <span>Saved.</span>
        </div>
      ) : null}

      {state && !state.ok ? (
        <div
          role="alert"
          className="rounded-sm border border-destructive/40 bg-destructive/8 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <span className="label-eyebrow !text-[0.625rem]">
          {updatedAt
            ? `Last saved ${updatedAt}${updatedBy ? ` by ${updatedBy}` : ""}`
            : "Defaults · never saved"}
        </span>
        <Button type="submit" disabled={pending} className="gap-1.5">
          <Save className="h-4 w-4" />
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function NumberField({
  icon: Icon,
  name,
  label,
  unit,
  defaultValue,
  hint,
  step = 1,
  min,
  max,
  allowEmpty = false,
  errors,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  label: string;
  unit: string;
  defaultValue: number | string;
  hint: string;
  step?: number;
  min?: number;
  max?: number;
  allowEmpty?: boolean;
  errors?: string[];
}) {
  return (
    <div className="flex flex-col gap-2 bg-card p-5">
      <Label
        htmlFor={name}
        className="flex items-center gap-2 text-muted-foreground"
      >
        <Icon className="h-4 w-4" />
        <span className="label-eyebrow !text-foreground">{label}</span>
      </Label>
      <div className="flex items-baseline gap-2">
        <Input
          id={name}
          name={name}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          defaultValue={defaultValue}
          required={!allowEmpty}
          className="w-32 bg-background font-mono text-lg tabular-nums"
        />
        <span className="label-eyebrow !text-[0.625rem]">{unit}</span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {errors && errors.length > 0 ? (
        <p className="text-xs text-destructive">{errors[0]}</p>
      ) : null}
    </div>
  );
}
