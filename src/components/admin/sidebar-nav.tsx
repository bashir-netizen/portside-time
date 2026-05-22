"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "./admin-nav";
import { cn } from "@/lib/utils";

/**
 * Desktop persistent sidebar. Renders the full nav with grouped sections,
 * eyebrow labels, active-state, and brass underline on hover.
 *
 * Designed to feel like a port-authority directory plaque: small caps section
 * labels, double-rule dividers between groups, mono character marks.
 */
export function SidebarNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Admin navigation" className="flex flex-col gap-7 px-4">
      {ADMIN_NAV.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <div className="label-eyebrow px-2 pb-1">{group.label}</div>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm transition-colors",
                      "text-sidebar-foreground/85 hover:text-sidebar-foreground",
                      "hover:bg-sidebar-accent/60",
                      active &&
                        "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                  >
                    {/* Brass tick mark for active state — looks like a port stamp */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[var(--brass)] transition-opacity",
                        active ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-[var(--brass)]" : "text-sidebar-foreground/60"
                      )}
                      strokeWidth={active ? 2.25 : 1.75}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
