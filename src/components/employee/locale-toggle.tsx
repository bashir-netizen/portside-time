import { setLocaleAction } from "@/app/(employee)/me/profile/actions";
import { LOCALES, LOCALE_LABEL, type Locale } from "@/i18n/locale";
import { cn } from "@/lib/utils";

/**
 * Two-button segmented control for switching the UI language. Renders as
 * separate `<form>` elements so each click submits its own server action
 * (writes the cookie + revalidates). Works without JavaScript.
 *
 * Pass `current` so the active button gets the highlighted styling.
 */
export function LocaleToggle({
  current,
  variant = "default",
}: {
  current: Locale;
  variant?: "default" | "compact";
}) {
  const sizeClasses =
    variant === "compact"
      ? "px-2 py-1 text-[10px]"
      : "px-3 py-1.5 text-xs";
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center gap-px overflow-hidden rounded-sm border border-border bg-card"
    >
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <form key={locale} action={setLocaleAction}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              aria-pressed={active}
              aria-current={active ? "true" : undefined}
              className={cn(
                "font-mono uppercase tracking-wider transition-colors",
                sizeClasses,
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {locale === "fr" ? "FR" : "EN"}
              <span className="sr-only"> — {LOCALE_LABEL[locale]}</span>
            </button>
          </form>
        );
      })}
    </div>
  );
}
