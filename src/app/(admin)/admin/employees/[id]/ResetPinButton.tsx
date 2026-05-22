"use client";

import { useState, useTransition } from "react";
import { KeyRound, Copy, CheckCircle2 } from "lucide-react";
import { resetEmployeePinAction } from "../actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ResetPinButton({ employeeId }: { employeeId: string }) {
  const [pending, startTransition] = useTransition();
  const [pin, setPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setError(null);
    startTransition(async () => {
      const r = await resetEmployeePinAction(employeeId);
      if (r.ok) setPin(r.pinPlain);
      else setError(r.error);
    });
  }

  function copyPin() {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (pin) {
    return (
      <div
        role="status"
        className="flex flex-col gap-2 rounded-sm border border-[var(--brass)]/50 bg-[var(--brass)]/10 px-4 py-3"
      >
        <div className="label-eyebrow text-[var(--brass)]">
          New PIN · shown once
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl tracking-[0.4em] text-foreground tabular-nums">
            {pin}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyPin}
            className="gap-1.5"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Write it down or copy now — it won't be shown again. Hand it to the
          employee privately.
        </p>
        <button
          type="button"
          onClick={() => {
            setPin(null);
            setCopied(false);
          }}
          className="self-start label-eyebrow hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={pending} className="gap-1.5">
            <KeyRound className="h-4 w-4" />
            {pending ? "Generating…" : "Reset PIN"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate a new PIN?</AlertDialogTitle>
            <AlertDialogDescription>
              The current 6-digit PIN will stop working immediately. The new
              one is shown only once — be ready to write it down before
              clicking continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={reset}>
              Generate new PIN
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </>
  );
}
