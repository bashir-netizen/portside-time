"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { adminLoginAction, type LoginActionResult } from "./actions";

const initial: LoginActionResult | null = null;

export function AdminLoginForm() {
  const t = useTranslations("login");
  const tCommon = useTranslations("common");
  const [state, action, pending] = useActionState(adminLoginAction, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("adminEmail")}</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("adminPassword")}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? tCommon("signingIn") : tCommon("signIn")}
      </button>
    </form>
  );
}
