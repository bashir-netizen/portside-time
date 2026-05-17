"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { employeeLoginAction, type LoginActionResult } from "./actions";

const initial: LoginActionResult | null = null;

type Employee = { id: string; fullName: string; position: string };

export function EmployeeLoginForm({ employees }: { employees: Employee[] }) {
  const t = useTranslations("login");
  const tCommon = useTranslations("common");
  const [state, action, pending] = useActionState(
    employeeLoginAction,
    initial,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState("");

  if (employees.length === 0) {
    return (
      <p className="rounded-md bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        {t("noEmployees")}
      </p>
    );
  }

  if (!selectedId) {
    return (
      <ul className="flex flex-col gap-2">
        {employees.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => setSelectedId(e.id)}
              className="flex w-full items-center justify-between rounded-md border border-zinc-200 px-4 py-3 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <span>
                <span className="block text-base font-medium">{e.fullName}</span>
                <span className="block text-xs text-zinc-500">{e.position}</span>
              </span>
              <span aria-hidden className="text-zinc-400">→</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  const selected = employees.find((e) => e.id === selectedId);

  return (
    <form
      action={(fd) => {
        fd.set("employeeId", selectedId);
        fd.set("pin", pin);
        return action(fd);
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center justify-between rounded-md bg-zinc-100 px-3 py-2 dark:bg-zinc-900">
        <span className="text-sm font-medium">{selected?.fullName}</span>
        <button
          type="button"
          onClick={() => {
            setSelectedId(null);
            setPin("");
          }}
          className="text-xs text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          {tCommon("change")}
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("pin")}</span>
        <input
          name="pin"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="\d{6}"
          required
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="rounded-md border border-zinc-300 px-3 py-3 text-center text-2xl tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
          placeholder={t("pinPlaceholder")}
        />
      </label>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || pin.length !== 6}
        className="rounded-md bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? tCommon("signingIn") : tCommon("signIn")}
      </button>
    </form>
  );
}
