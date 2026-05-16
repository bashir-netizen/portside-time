"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import {
  Save,
  CalendarDays,
  Wallet,
  Briefcase,
  UserRound,
  Info,
  KeyRound,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { createEmployeeAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Result =
  | { ok: true; id: string; pinPlain: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

type Template = { id: string; name: string; description: string | null };

export function EmployeeCreateForm({
  templates,
  defaultTemplateId,
  today,
}: {
  templates: Template[];
  defaultTemplateId: string;
  today: string;
}) {
  const [state, action, pending] = useActionState<Result | null, FormData>(
    createEmployeeAction,
    null,
  );

  if (state?.ok) return <CreatedCard id={state.id} pin={state.pinPlain} />;

  const fieldErrors =
    state && !state.ok && state.fieldErrors ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Full name"
          name="fullName"
          icon={UserRound}
          autoComplete="name"
          errors={fieldErrors?.fullName}
        />
        <FormField
          label="Position"
          name="position"
          icon={Briefcase}
          placeholder="e.g. Opérateur logistique"
          errors={fieldErrors?.position}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Monthly salary (DJF)"
          name="monthlySalary"
          type="number"
          min={0}
          mono
          icon={Wallet}
          placeholder="75000"
          errors={fieldErrors?.monthlySalary}
        />
        <FormField
          label="Hire date"
          name="hireDate"
          type="date"
          defaultValue={today}
          mono
          icon={CalendarDays}
          hint="Drives Article 99 leave accrual (2.5 days / month)."
          errors={fieldErrors?.hireDate}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="defaultScheduleTemplateId">
          Schedule template
        </Label>
        <Select
          name="defaultScheduleTemplateId"
          defaultValue={defaultTemplateId}
          required
        >
          <SelectTrigger
            id="defaultScheduleTemplateId"
            className="bg-card"
          >
            <SelectValue placeholder="Pick a template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          Drives the punch sequence per day-type: split-day (4 punches),
          continuous-day (4 with on-site lunch), half-day (2), day-off
          (blocked). Per spec §5.3.
        </p>
        {fieldErrors?.defaultScheduleTemplateId ? (
          <p className="text-xs text-destructive">
            {fieldErrors.defaultScheduleTemplateId[0]}
          </p>
        ) : null}
      </div>

      <div className="flex items-start gap-2 rounded-sm border border-[var(--brass)]/30 bg-[var(--brass)]/8 px-3 py-2 text-xs">
        <Info
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brass)]"
          strokeWidth={1.75}
        />
        <span className="text-muted-foreground">
          A 6-digit PIN is generated automatically and shown once after the
          employee is created. Write it down or copy before dismissing — they
          need it to punch in.
        </span>
      </div>

      {state && !state.ok ? (
        <div
          role="alert"
          className="rounded-sm border border-destructive/40 bg-destructive/8 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      ) : null}

      <Button type="submit" disabled={pending} className="gap-1.5 self-start">
        <Save className="h-4 w-4" />
        {pending ? "Creating…" : "Create employee"}
      </Button>
    </form>
  );
}

function CreatedCard({ id, pin }: { id: string; pin: string }) {
  const [copied, setCopied] = useState(false);
  function copyPin() {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/8 px-4 py-3">
        <CheckCircle2
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success)]"
          strokeWidth={1.75}
        />
        <div className="flex flex-col gap-0.5">
          <p className="font-medium text-foreground">Employee created</p>
          <p className="text-xs text-muted-foreground">
            Their one-time PIN is below — shown only once. Write it down or
            copy now, then hand it to them privately.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[var(--brass)]/50 bg-[var(--brass)]/10 px-5 py-4">
        <div className="flex items-center gap-2 text-[var(--brass)]">
          <KeyRound className="h-3.5 w-3.5" />
          <span className="label-eyebrow !text-[0.625rem]">PIN · shown once</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="font-mono text-3xl font-medium tracking-[0.4em] text-foreground tabular-nums">
            {pin}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyPin}
            className="gap-1.5"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild className="gap-1.5">
          <Link href={`/admin/employees/${id}`}>View employee</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/employees">Back to list</Link>
        </Button>
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  min,
  placeholder,
  autoComplete,
  hint,
  mono = false,
  icon: Icon,
  errors,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  min?: number;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
  mono?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  errors?: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="flex items-center gap-1.5">
        {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
        {...(min !== undefined ? { min } : {})}
        className={`bg-card ${mono ? "font-mono tabular-nums" : ""}`}
      />
      {hint ? (
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
      {errors && errors.length > 0 ? (
        <p className="text-xs text-destructive">{errors[0]}</p>
      ) : null}
    </div>
  );
}
