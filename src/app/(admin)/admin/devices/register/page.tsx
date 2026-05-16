import Link from "next/link";
import { ChevronRight, Fingerprint, ShieldCheck, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RegisterDeviceButton } from "@/components/RegisterDeviceButton";

export const metadata = { title: "Register device — Portside Time" };

export default function RegisterDevicePage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="label-eyebrow flex items-center gap-1.5">
        <Link href="/admin" className="hover:text-foreground">Admin</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href="/admin/devices" className="hover:text-foreground">Devices</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span>Register</span>
      </div>

      <header className="max-w-2xl">
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Register this device
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open this page from the office PC that should be allowed to punch in.
          The fingerprint runs entirely in this browser; the server only stores
          a hash, never the raw fingerprint.
        </p>
      </header>

      <div className="rule-double" aria-hidden />

      <Card className="bg-card p-5">
        <RegisterDeviceButton />
      </Card>

      <Card className="bg-muted/30 p-5">
        <h2 className="label-eyebrow">Why this exists</h2>
        <Separator className="my-3" />
        <ul className="flex flex-col gap-3 text-sm">
          <li className="flex items-start gap-3">
            <Fingerprint
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brass)]"
              strokeWidth={1.75}
            />
            <div>
              <span className="font-medium">Fingerprint identity</span>
              <p className="text-xs text-muted-foreground">
                FingerprintJS v4 computes a stable visitorId from this browser
                (screen, fonts, canvas). Verifies that the punch is from the
                same browser the admin approved.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]"
              strokeWidth={1.75}
            />
            <div>
              <span className="font-medium">Two-gate defense</span>
              <p className="text-xs text-muted-foreground">
                Combined with the office IP allowlist, this means a punch
                requires (a) the right network AND (b) an approved browser. A
                stolen PIN alone can't punch.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Lock
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              strokeWidth={1.75}
            />
            <div>
              <span className="font-medium">Privacy</span>
              <p className="text-xs text-muted-foreground">
                We store the SHA-256 of the visitorId, not the visitorId itself.
                Revoking a device is permanent and audit-logged.
              </p>
            </div>
          </li>
        </ul>
      </Card>
    </div>
  );
}
