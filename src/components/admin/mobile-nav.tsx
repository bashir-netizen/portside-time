"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ADMIN_NAV, PRIMARY_NAV } from "./admin-nav";
import { cn } from "@/lib/utils";

/**
 * Mobile navigation. Bottom-tab bar for the 4 primary destinations + a Menu
 * button that opens a Sheet with the full grouped nav (including Settings).
 *
 * Settings is intentionally only reachable from the Menu sheet on mobile, but
 * is *unmissable* there — it's the only item in the System group, displayed
 * with a brass tick on hover.
 */
export function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-sidebar-border bg-sidebar/95 px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5 items-stretch">
        {PRIMARY_NAV.map((item) => {
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
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}

        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-sm px-1 py-1.5 text-[10px] font-medium uppercase tracking-wide text-sidebar-foreground/70 hover:text-sidebar-foreground"
              >
                <Menu className="h-5 w-5" strokeWidth={1.75} />
                <span>Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto p-0">
              <SheetHeader className="border-b border-border px-6 py-4">
                <SheetTitle className="font-display text-xl">
                  Portside Time
                </SheetTitle>
                <p className="label-eyebrow">Admin · all sections</p>
              </SheetHeader>

              <div className="flex flex-col gap-6 px-4 py-5">
                {ADMIN_NAV.map((group) => (
                  <div key={group.label} className="flex flex-col gap-1">
                    <div className="label-eyebrow px-2 pb-1">{group.label}</div>
                    <ul className="flex flex-col">
                      {group.items.map((item) => {
                        const active =
                          item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname === item.href ||
                              pathname.startsWith(item.href + "/");
                        const Icon = item.icon;
                        return (
                          <li key={item.href}>
                            <SheetClose asChild>
                              <Link
                                href={item.href}
                                prefetch={false}
                                className={cn(
                                  "group flex items-center justify-between rounded-sm px-2 py-2.5 text-sm transition-colors",
                                  "hover:bg-sidebar-accent",
                                  active &&
                                    "bg-sidebar-accent font-medium text-sidebar-foreground"
                                )}
                              >
                                <span className="flex items-center gap-3">
                                  <Icon
                                    className={cn(
                                      "h-4 w-4",
                                      active
                                        ? "text-[var(--brass)]"
                                        : "text-sidebar-foreground/60"
                                    )}
                                    strokeWidth={active ? 2.25 : 1.75}
                                  />
                                  {item.label}
                                </span>
                              </Link>
                            </SheetClose>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}

/**
 * Compact top-bar hamburger trigger, used as an alternative entry point to the
 * full mobile sheet (kept for users who reach for the top-left first).
 */
export function MobileTopMenuButton() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto p-0">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="font-display text-xl">Portside Time</SheetTitle>
          <p className="label-eyebrow">Admin · all sections</p>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 py-5">
          {ADMIN_NAV.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <div className="label-eyebrow px-2 pb-1">{group.label}</div>
              <ul className="flex flex-col">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <SheetClose asChild>
                        <Link
                          href={item.href}
                          prefetch={false}
                          className="flex items-center gap-3 rounded-sm px-2 py-2.5 text-sm hover:bg-sidebar-accent"
                        >
                          <Icon className="h-4 w-4 text-sidebar-foreground/60" strokeWidth={1.75} />
                          {item.label}
                        </Link>
                      </SheetClose>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
