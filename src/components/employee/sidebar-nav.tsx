"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EMPLOYEE_NAV, isActiveItem } from "./employee-nav";
import { cn } from "@/lib/utils";

export function EmployeeSidebarNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Employee navigation" className="flex flex-col gap-1 px-3">
      {EMPLOYEE_NAV.map((item) => {
        const active = isActiveItem(item, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={cn(
              "group relative flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
              "text-sidebar-foreground/85 hover:text-sidebar-foreground",
              "hover:bg-sidebar-accent/60",
              active && "bg-sidebar-accent font-medium text-sidebar-foreground"
            )}
          >
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
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
