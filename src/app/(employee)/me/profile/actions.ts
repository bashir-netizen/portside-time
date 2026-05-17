"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale } from "@/i18n/locale";

/**
 * Persist the user's chosen UI locale in a cookie. Pure UI preference —
 * no auth check needed (any visitor can switch the language).
 *
 * Returns void; the form is rendered with `<form action={...}>` and the
 * page re-renders on success.
 */
export async function setLocaleAction(formData: FormData): Promise<void> {
  const raw = String(formData.get("locale") ?? "");
  if (!isLocale(raw)) return;
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, raw, {
    path: "/",
    httpOnly: false, // cookie is read on every server request anyway
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  // Re-render everything that uses translations.
  revalidatePath("/", "layout");
}
