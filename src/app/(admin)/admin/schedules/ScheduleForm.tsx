"use client";

import { useActionState } from "react";
import { DAYS } from "@/schemas/schedule";

type Schedule = {
  id?: string;
  label: string;
  shiftStart: string;
  lunchStart: string;
  lunchEnd: string;
  shiftEnd: string;
  workDays: string[];
};

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

type Action = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

export function ScheduleForm({
  initial,
  action,
  submitLabel,
}: {
  initial: Schedule;
  action: Action;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Label" name="label" defaultValue={initial.label} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field
          label="Shift start"
          name="shiftStart"
          type="time"
          defaultValue={initial.shiftStart}
        />
        <Field
          label="Lunch start"
          name="lunchStart"
          type="time"
          defaultValue={initial.lunchStart}
        />
        <Field
          label="Lunch end"
          name="lunchEnd"
          type="time"
          defaultValue={initial.lunchEnd}
        />
        <Field
          label="Shift end"
          name="shiftEnd"
          type="time"
          defaultValue={initial.shiftEnd}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Work days</legend>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <label
              key={d}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm has-checked:border-zinc-900 has-checked:bg-zinc-100 dark:border-zinc-800 dark:has-checked:bg-zinc-900"
            >
              <input
                type="checkbox"
                name="workDays"
                value={d}
                defaultChecked={initial.workDays.includes(d)}
              />
              {d}
            </label>
          ))}
        </div>
      </fieldset>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}
