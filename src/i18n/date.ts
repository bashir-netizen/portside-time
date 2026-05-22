import { fr, enGB } from "date-fns/locale";
import type { Locale as DateLocale } from "date-fns";
import type { Locale } from "./locale";

/**
 * Map a UI locale to the matching date-fns locale, used as the `locale`
 * option to `formatInTimeZone`. Falls back to French (default UI locale).
 */
export function dateLocaleFor(locale: Locale): DateLocale {
  return locale === "en" ? enGB : fr;
}
