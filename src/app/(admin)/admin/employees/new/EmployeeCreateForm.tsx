"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createEmployeeAction } from "../actions";

type Result =
  | { ok: true; id: string; pinPlain: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

type Schedule = { id: string; label: string };

export function EmployeeCreateForm({
  schedules,
  defaultScheduleId,
  today,
}: {
  schedules: Schedule[];
  defaultScheduleId: string;
  today: string;
}) {
  const [state, action, pending] = useActionState<Result | null, FormData>(
    createEmployeeAction,
    null,
  );

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4 rounded-md border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
        <h2 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
          Employee created
        </h2>
        <p className="text-sm text-emerald-900 dark:text-emerald-200">
          Their one-time PIN is below. Copy it, write it down, hand it to the
          employee — it is shown only once.
        </p>
        <div className="rounded-md bg-white px-4 py-3 dark:bg-zinc-900">
          <div className="text-xs text-zinc-500">PIN</div>
          <div className="font-mono text-3xl tracking-[0.4em]">
            {state.pinPlain}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/employees/${state.id}`}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            View employee
          </Link>
          <Link
            href="/admin/employees"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700"
          >
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Full name" name="fullName" />
      <Field label="Position" name="position" />
      <Field
        label="Monthly salary (DJF)"
        name="monthlySalary"
        type="number"
        min={0}
      />
      <Field
        label="Hire date"
        name="hireDate"
        type="date"
        defaultValue={today}
      />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Default schedule</span>
        <select
          name="defaultScheduleId"
          defaultValue={defaultScheduleId}
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
        {pending ? "Creating…" : "Create employee"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  min?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required
        {...(min !== undefined ? { min } : {})}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}
