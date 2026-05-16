"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { punchAction } from "./actions";
import { PUNCH_LABELS, type PunchType } from "@/lib/punch/types";
import { cn } from "@/lib/utils";

type Props = {
  nextPunch: PunchType | null;
};

/**
 * Hero punch button. Big, brass, deliberate. After a successful punch, briefly
 * flashes a confirmation state then calls router.refresh() so the page reloads
 * server data — the sequence ribbon updates AND the next-action label rolls
 * forward (IN → LUNCH_OUT → LUNCH_IN → OUT) without a manual reload.
 */
export function PunchButton({ nextPunch }: Props) {
  const router = useRouter();
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [fpError, setFpError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [justRecorded, setJustRecorded] = useState<PunchType | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        if (!cancelled) setVisitorId(result.visitorId);
      } catch (err) {
        if (!cancelled) {
          setFpError(
            err instanceof Error ? err.message : "Couldn't compute fingerprint."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  // Day done — sea-green completion card.
  if (nextPunch === null && !justRecorded) {
    return (
      <div className="rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/8 px-6 py-8 text-center">
        <CheckCircle2
          className="mx-auto h-8 w-8 text-[var(--success)]"
          strokeWidth={1.75}
        />
        <p className="mt-3 font-display text-xl text-foreground">
          Today's shift is complete.
        </p>
        <p className="mt-1 label-eyebrow">See you tomorrow</p>
      </div>
    );
  }

  // Flashed success — held for 1.2s, then refresh
  if (justRecorded) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-sm border border-[var(--brass)]/40 bg-[var(--brass)]/10 px-6 py-8 text-center"
      >
        <CheckCircle2
          className="mx-auto h-8 w-8 text-[var(--brass)]"
          strokeWidth={1.75}
        />
        <p className="mt-3 font-display text-xl text-foreground">
          {PUNCH_LABELS[justRecorded]} recorded
        </p>
        <p className="mt-1 label-eyebrow">Loading next step…</p>
      </div>
    );
  }

  function submit() {
    if (!nextPunch) return;
    setError(null);
    const fd = new FormData();
    fd.set("punchType", nextPunch);
    // Send the fingerprint if we have it; the dev-bypass server-side accepts
    // an empty value, and prod always requires it (gated by checkDevice).
    fd.set("visitorId", visitorId ?? "");
    startTransition(async () => {
      const r = await punchAction(fd);
      if (r.ok) {
        setJustRecorded(r.punchType);
        // Briefly show success, then refresh so the parent's next-action
        // computation re-runs.
        flashTimer.current = setTimeout(() => {
          setJustRecorded(null);
          router.refresh();
        }, 1200);
      } else {
        setError(r.message);
      }
    });
  }

  const label = nextPunch ? PUNCH_LABELS[nextPunch] : "—";

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        onClick={submit}
        disabled={pending || (!visitorId && !fpError) || !nextPunch}
        size="lg"
        className={cn(
          "group h-auto justify-center gap-3 rounded-sm bg-foreground py-7 text-lg font-medium text-background shadow-sm transition-all",
          "hover:bg-foreground/90 hover:shadow-md",
          "disabled:opacity-60 disabled:shadow-none",
          "ring-1 ring-[var(--brass)]/30"
        )}
      >
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
            <span>Recording…</span>
          </>
        ) : !visitorId && !fpError ? (
          <span className="text-sm font-mono uppercase tracking-wider">
            Preparing…
          </span>
        ) : (
          <>
            <span className="font-display text-2xl tracking-tight">{label}</span>
            <ArrowRight
              className="h-5 w-5 transition-transform group-hover:translate-x-1"
              strokeWidth={2}
            />
          </>
        )}
      </Button>

      {fpError ? (
        <p role="alert" className="text-xs text-muted-foreground">
          Fingerprint unavailable — punching in dev-bypass mode.
        </p>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-sm border border-destructive/40 bg-destructive/8 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
