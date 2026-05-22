/*
 * Employee navigation. Five tabs map 1:1 to spec §7 mobile screens minus the
 * deferred ones (Justify needs LateIncident table; Notifications + Personnel
 * file are separate PRs).
 */

import {
  Home,
  Calendar,
  Plane,
  Wallet,
  UserRound,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

/**
 * `labelKey` is a path into the `nav` namespace of the message catalogs
 * (see messages/{fr,en}.json). Nav components resolve it via the
 * useTranslations("nav") hook at render time.
 */
export type NavItem = {
  href: string;
  labelKey: "today" | "schedule" | "leave" | "justify" | "pay" | "profile";
  icon: LucideIcon;
};

export const EMPLOYEE_NAV: NavItem[] = [
  { href: "/me", labelKey: "today", icon: Home },
  { href: "/me/schedule", labelKey: "schedule", icon: Calendar },
  { href: "/me/leave", labelKey: "leave", icon: Plane },
  { href: "/me/justify", labelKey: "justify", icon: AlertTriangle },
  { href: "/me/pay", labelKey: "pay", icon: Wallet },
  { href: "/me/profile", labelKey: "profile", icon: UserRound },
];

export function isActiveItem(item: NavItem, pathname: string): boolean {
  if (item.href === "/me") return pathname === "/me";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
