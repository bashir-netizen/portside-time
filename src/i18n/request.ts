import { getRequestConfig } from "next-intl/server";
import { readLocaleFromCookie } from "./locale";

/**
 * Server-side request config. next-intl calls this once per request to figure
 * out the locale and load the matching message catalog. We resolve from a
 * cookie (no URL routing) so URLs stay clean and admin links don't change.
 *
 * Configured via next.config.ts → `next-intl/plugin`.
 */
export default getRequestConfig(async () => {
  const locale = await readLocaleFromCookie();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return {
    locale,
    messages,
    timeZone: "Africa/Djibouti",
  };
});
