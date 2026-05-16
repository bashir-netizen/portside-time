import { Check, Sunrise, UtensilsCrossed, Briefcase, Sunset } from "lucide-react";
import { PUNCH_TYPES, type PunchType } from "@/lib/punch/types";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";

type Punch = {
  punchType: PunchType;
  punchedAt: Date;
};

/**
 * SequenceRibbon — the visual answer to "where am I in the day?"
 *
 * Renders the four required punches as a horizontal stepper. Each step shows:
 *  - Icon (sunrise / utensils-out / briefcase / sunset) + label
 *  - State: done (brass check + actual time), active (pulsing brass ring),
 *    pending (faded), final-done (sea-green tick)
 *
 * On mobile collapses to a vertical list with the same affordances.
 */

const STEP_META: Record<
  PunchType,
  {
    label: string;
    eyebrow: string;
    Icon: typeof Check;
  }
> = {
  shift_in: { label: "Start of shift", eyebrow: "01 · Arrival", Icon: Sunrise },
  lunch_out: { label: "Lunch out", eyebrow: "02 · Break begins", Icon: UtensilsCrossed },
  lunch_in: { label: "Back from lunch", eyebrow: "03 · Break ends", Icon: Briefcase },
  shift_out: { label: "End of shift", eyebrow: "04 · Departure", Icon: Sunset },
};

type Props = {
  todaysPunches: Punch[];
  timezone?: string;
};

export function SequenceRibbon({ todaysPunches, timezone = "Africa/Djibouti" }: Props) {
  // Index punches by type for O(1) lookup.
  const byType = new Map<PunchType, Punch>();
  for (const p of todaysPunches) byType.set(p.punchType, p);

  // Active = first not-yet-done step.
  const activeIdx = PUNCH_TYPES.findIndex((t) => !byType.has(t));
  const allDone = activeIdx === -1;

  return (
    <div
      role="list"
      aria-label="Today's punch sequence"
      className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0"
    >
      {PUNCH_TYPES.map((type, idx) => {
        const punch = byType.get(type);
        const isDone = !!punch;
        const isActive = !isDone && idx === activeIdx;
        const isFinal = type === "shift_out" && isDone;
        const meta = STEP_META[type];
        const Icon = meta.Icon;

        return (
          <div
            key={type}
            role="listitem"
            aria-current={isActive ? "step" : undefined}
            className={cn(
              "group relative flex flex-1 items-start gap-3 rounded-sm border bg-card p-3 transition-colors md:items-stretch md:rounded-none md:border-y md:border-l-0 md:border-r-0 md:border-t md:bg-transparent md:first:rounded-l-sm md:first:border-l md:last:rounded-r-sm md:last:border-r md:[&:not(:last-child)]:border-r",
              isDone
                ? "border-[var(--brass)]/40"
                : isActive
                  ? "border-[var(--brass)] md:border-[var(--brass)]"
                  : "border-border",
              isFinal && "border-[var(--success)]/50"
            )}
          >
            {/* Connector line between desktop steps */}
            {idx < PUNCH_TYPES.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute right-0 top-1/2 -mr-px hidden h-px w-px -translate-y-1/2 md:block",
                  isDone
                    ? "bg-[var(--brass)]"
                    : "bg-border"
                )}
              />
            ) : null}

            {/* Icon medallion */}
            <div
              className={cn(
                "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all",
                isDone && isFinal
                  ? "border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]"
                  : isDone
                    ? "border-[var(--brass)] bg-[var(--brass)]/10 text-[var(--brass)]"
                    : isActive
                      ? "border-[var(--brass)] bg-background text-[var(--brass)] shadow-[0_0_0_3px_var(--brass-ring)] [--brass-ring:color-mix(in_oklch,var(--brass)_20%,transparent)]"
                      : "border-border bg-background text-muted-foreground"
              )}
            >
              {isDone ? (
                <Check
                  className={cn(
                    "h-4 w-4",
                    isFinal ? "text-[var(--success)]" : "text-[var(--brass)]"
                  )}
                  strokeWidth={2.5}
                />
              ) : (
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              )}
              {isActive && !allDone ? (
                <span
                  aria-hidden
                  className="absolute -right-1 -top-1 inline-flex h-2.5 w-2.5"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brass)] opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--brass)]" />
                </span>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-0.5 md:py-1">
              <div className="label-eyebrow !text-[0.625rem]">{meta.eyebrow}</div>
              <div
                className={cn(
                  "truncate text-sm font-medium",
                  isDone ? "text-foreground" : isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {meta.label}
              </div>
              <div
                className={cn(
                  "font-mono text-xs tabular-nums",
                  isDone
                    ? isFinal
                      ? "text-[var(--success)]"
                      : "text-[var(--brass)]"
                    : isActive
                      ? "text-[var(--brass)]/90"
                      : "text-muted-foreground/60"
                )}
              >
                {punch
                  ? formatInTimeZone(punch.punchedAt, timezone, "HH:mm")
                  : isActive
                    ? "Next"
                    : "—"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
