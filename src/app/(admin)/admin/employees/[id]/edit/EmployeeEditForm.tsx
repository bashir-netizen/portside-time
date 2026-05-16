"use client";

import { useActionState } from "react";
import { Save, CalendarDays, Info } from "lucide-react";
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

type Schedule = { id: string; label: string };
type Template = { id: string; name: string; description: string | null };

type Result =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

type Action = (prev: Result | null, fd: FormData) => Promise<Result>;

export function EmployeeEditForm({
  initial,
  schedules,
  templates,
  action,
}: {
  initial: {
    fullName: string;
    position: string;
    monthlySalary: number;
    hireDate: string; // YYYY-MM-DD
    defaultScheduleId: string;
    defaultScheduleTemplateId: string; // "" = none
  };
  schedules: Schedule[];
  templates: Template[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState<Result | null, FormData>(
    action,
    null,
  );

  const fieldErrors =
    state && !state.ok && state.fieldErrors ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Full name"
          name="fullName"
          defaultValue={initial.fullName}
          errors={fieldErrors?.fullName}
        />
        <Field
          label="Position"
          name="position"
          defaultValue={initial.position}
          errors={fieldErrors?.position}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Monthly salary (DJF)"
          name="monthlySalary"
          type="number"
          mono
          defaultValue={String(initial.monthlySalary)}
          errors={fieldErrors?.monthlySalary}
        />
        <Field
          label="Hire date"
          name="hireDate"
          type="date"
          mono
          defaultValue={initial.hireDate}
          errors={fieldErrors?.hireDate}
          hint="Drives Article 99 leave accrual (2.5 days / month from this date)."
          icon={CalendarDays}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="defaultScheduleTemplateId">
          Schedule template
        </Label>
        <Select
          name="defaultScheduleTemplateId"
          defaultValue={initial.defaultScheduleTemplateId || "__none__"}
        >
          <SelectTrigger
            id="defaultScheduleTemplateId"
            className="bg-card"
          >
            <SelectValue placeholder="Pick a template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No template (legacy)</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          Drives the punch sequence: split-day (4 punches), continuous-day
          (4 punches, lunch on site), half-day (2 punches), or day-off
          (punching blocked) per spec §5.3.
        </p>
        {fieldErrors?.defaultScheduleTemplateId ? (
          <p className="text-xs text-destructive">
            {fieldErrors.defaultScheduleTemplateId[0]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="defaultScheduleId">
          Legacy schedule (for back-compat)
        </Label>
        <Select
          name="defaultScheduleId"
          defaultValue={initial.defaultScheduleId}
        >
          <SelectTrigger id="defaultScheduleId" className="bg-card">
            <SelectValue placeholder="Pick a schedule" />
          </SelectTrigger>
          <SelectContent>
            {schedules.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          Required by the old schema. Will be dropped in a future PR once
          every employee runs on a template.
        </p>
        {fieldErrors?.defaultScheduleId ? (
          <p className="text-xs text-destructive">
            {fieldErrors.defaultScheduleId[0]}
          </p>
        ) : null}
      </div>

      <div className="flex items-start gap-2 rounded-sm border border-[var(--brass)]/30 bg-[var(--brass)]/8 px-3 py-2 text-xs">
        <Info
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brass)]"
          strokeWidth={1.75}
        />
        <span className="text-muted-foreground">
          Changes are audit-logged with before/after snapshots. Editing the
          hire date adjusts the accrued-leave calculation immediately.
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

      <Button
        type="submit"
        disabled={pending}
        className="gap-1.5 self-start"
      >
        <Save className="h-4 w-4" />
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  errors,
  hint,
  mono = false,
  icon: Icon,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  errors?: string[];
  hint?: string;
  mono?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
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
