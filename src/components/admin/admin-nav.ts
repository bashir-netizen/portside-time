/*
 * Single source of truth for the admin navigation.
 *
 * Each group represents a band in the sidebar. Mobile bottom-tab nav uses the
 * `primary` items only (Dashboard / Employees / Punches / Leave); everything
 * else lives in the hamburger Sheet.
 */

import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Clock,
  Plane,
  ScrollText,
  FileBarChart2,
  Calendar,
  Smartphone,
  Globe,
  ShieldCheck,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Show in the mobile bottom-tab bar (top of fold). */
  primary?: boolean;
  /** Spec-status note shown as a small inline tag (P0 P1 P2). */
  note?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Today",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, primary: true },
      { href: "/admin/punches", label: "Punches", icon: Clock, primary: true },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/employees", label: "Employees", icon: Users, primary: true },
      { href: "/admin/leave", label: "Leave", icon: Plane, primary: true },
      { href: "/admin/schedules", label: "Schedules", icon: CalendarClock },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/admin/reports", label: "Reports", icon: FileBarChart2 },
      { href: "/admin/holidays", label: "Holidays", icon: Calendar },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
      { href: "/admin/adjustments", label: "Adjustments", icon: Wrench },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/admin/devices", label: "Devices", icon: Smartphone },
      { href: "/admin/ip-allowlist", label: "IP allowlist", icon: Globe },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

/** Flat list for the mobile bottom-tab bar. */
export const PRIMARY_NAV: NavItem[] = ADMIN_NAV.flatMap((g) =>
  g.items.filter((i) => i.primary)
);

/** Helper: page title + crumb data for a given pathname. */
export function findNavItem(pathname: string): { group: string; item: NavItem } | null {
  // Most specific (longest) match wins so /admin/employees/[id] resolves to Employees.
  const all = ADMIN_NAV.flatMap((g) =>
    g.items.map((i) => ({ group: g.label, item: i }))
  ).sort((a, b) => b.item.href.length - a.item.href.length);

  for (const { group, item } of all) {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      return { group, item };
    }
  }
  // /admin is the dashboard but the loop above will already match it (exact).
  return null;
}

// Re-export ShieldCheck so the brand mark can use it without a second import path.
export { ShieldCheck };
