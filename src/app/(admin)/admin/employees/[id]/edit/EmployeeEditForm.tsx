"use client";

import { useActionState } from "react";

type Schedule = { id: string; label: string };

type Result =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

type Action = (prev: Result | null, fd: FormData) => Promise<Result>;

export function EmployeeEditForm({
  initial,
  schedules,
  action,
}: {
  initial: {
    fullName: string;
    position: string;
    monthlySalary: number;
    defaultScheduleId: string;
  };
  schedules: Schedule[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState<Result | null, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Full name" name="fullName" defaultValue={initial.fullName} />
      <Field label="Position" name="position" defaultValue={initial.position} />
      <Field
        label="Monthly salary (DJF)"
        name="monthlySalary"
        type="number"
        defaultValue={String(initial.monthlySalary)}
      />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Default schedule</span>
        <select
          name="defaultScheduleId"
          defaultValue={initial.defaultScheduleId}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {schedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
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
