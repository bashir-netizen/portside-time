import Link from "next/link";

const ITEMS = [
  { href: "/admin/schedules", label: "Schedules", emoji: "🗓️" },
  { href: "/admin/holidays", label: "Public holidays", emoji: "🎉" },
  { href: "/admin/devices", label: "Devices", emoji: "💻" },
  { href: "/admin/ip-allowlist", label: "IP allowlist", emoji: "🌐" },
  { href: "/admin/adjustments", label: "Adjustments", emoji: "🧾" },
  { href: "/admin/audit", label: "Audit log", emoji: "📜" },
];

export default function MorePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">More</h1>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ITEMS.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              <span className="text-2xl" aria-hidden>
                {it.emoji}
              </span>
              <span className="font-medium">{it.label}</span>
              <span className="ml-auto text-zinc-400">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
