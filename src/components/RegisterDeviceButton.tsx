"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { registerDeviceAction } from "@/app/(admin)/admin/devices/actions";

type Result =
  | { ok: true; deviceId: string; alreadyRegisteredAs?: string }
  | { ok: false; error: string };

export function RegisterDeviceButton() {
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [fpError, setFpError] = useState<string | null>(null);
  const [state, action, pending] = useActionState<Result | null, FormData>(
    registerDeviceAction,
    null,
  );

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
            err instanceof Error ? err.message : "Fingerprint failed.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state?.ok) {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
          {state.alreadyRegisteredAs
            ? `This device was already registered as “${state.alreadyRegisteredAs}”.`
            : "Device registered."}
        </p>
        <Link
          href="/admin/devices"
          className="mt-2 inline-block text-sm font-medium underline-offset-2 hover:underline"
        >
          Back to devices →
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Label</span>
        <input
          name="label"
          required
          placeholder="e.g. Operations PC"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <input
        type="hidden"
        name="visitorId"
        value={visitorId ?? ""}
        readOnly
      />
      <input
        type="hidden"
        name="userAgent"
        value={typeof navigator !== "undefined" ? navigator.userAgent : ""}
        readOnly
      />
      <input
        type="hidden"
        name="screenResolution"
        value={
          typeof window !== "undefined"
            ? `${window.screen.width}x${window.screen.height}`
            : ""
        }
        readOnly
      />

      {fpError && (
        <p role="alert" className="text-sm text-red-600">
          Fingerprint failed: {fpError}
        </p>
      )}
      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !visitorId}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {!visitorId
          ? "Computing fingerprint…"
          : pending
            ? "Registering…"
            : "Register this device"}
      </button>
    </form>
  );
}
