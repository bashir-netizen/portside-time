import { cookies } from "next/headers";

/**
 * Locale constants. The app is bilingual French (default, Djibouti office) +
 * English. Locale is persisted in a cookie — no URL routing.
 */

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "portside-locale";

/** True iff `s` is one of the supported locales. */
export function isLocale(s: string | undefined | null): s is Locale {
  return s === "fr" || s === "en";
}

/**
 * Read the current locale from the request cookie. Server-side only.
 * Falls back to DEFAULT_LOCALE.
 */
export async function readLocaleFromCookie(): Promise<Locale> {
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE)?.value;
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

/** Human label for the chosen locale (used on the toggle). */
export const LOCALE_LABEL: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};
