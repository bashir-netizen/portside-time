"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EMPLOYEE_NAV, isActiveItem } from "./employee-nav";
import { cn } from "@/lib/utils";

export function EmployeeMobileNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Employee mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-sidebar-border bg-sidebar/95 px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {EMPLOYEE_NAV.map((item) => {
          const active = isActiveItem(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-sm px-1 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-colors",
                  active
                    ? "text-[var(--brass)]"
                    : "text-sidebar-foreground/70"
                )}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
