"use client";

import { useEffect, useState, useTransition } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { punchAction } from "./actions";
import { PUNCH_LABELS, type PunchType } from "@/lib/punch/types";

type Props = {
  nextPunch: PunchType | null;
};

export function PunchButton({ nextPunch }: Props) {
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [fpError, setFpError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [recordedPunch, setRecordedPunch] = useState<PunchType | null>(null);

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
            err instanceof Error ? err.message : "Couldn't compute fingerprint.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (recordedPunch) {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-6 text-center dark:border-emerald-900 dark:bg-emerald-950">
        <p className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
          {PUNCH_LABELS[recordedPunch]} recorded.
        </p>
      </div>
    );
  }

  if (nextPunch === null) {
    return (
      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">
          Today's shift is complete. See you tomorrow.
        </p>
      </div>
    );
  }

  function submit() {
    if (!visitorId || !nextPunch) return;
    setError(null);
    const fd = new FormData();
    fd.set("punchType", nextPunch);
    fd.set("visitorId", visitorId);
    startTransition(async () => {
      const r = await punchAction(fd);
      if (r.ok) {
        setRecordedPunch(r.punchType);
      } else {
        setError(r.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={submit}
        disabled={pending || !visitorId}
        className="rounded-lg bg-zinc-900 px-6 py-6 text-xl font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {!visitorId
          ? "Preparing…"
          : pending
            ? "Recording…"
            : PUNCH_LABELS[nextPunch]}
      </button>
      {fpError && (
        <p role="alert" className="text-sm text-red-600">
          Fingerprint failed: {fpError}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
