import { RegisterDeviceButton } from "@/components/RegisterDeviceButton";

export default function RegisterDevicePage() {
  return (
    <div className="flex flex-col gap-4 max-w-md">
      <header>
        <h1 className="text-xl font-semibold">Register this device</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Do this from the office PC that should be allowed to punch in. The
          fingerprint runs in your browser; the server stores a hash, not the
          raw value.
        </p>
      </header>
      <RegisterDeviceButton />
    </div>
  );
}
