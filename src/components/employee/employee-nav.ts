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

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const EMPLOYEE_NAV: NavItem[] = [
  { href: "/me", label: "Today", icon: Home },
  { href: "/me/schedule", label: "Schedule", icon: Calendar },
  { href: "/me/leave", label: "Leave", icon: Plane },
  { href: "/me/justify", label: "Justify", icon: AlertTriangle },
  { href: "/me/pay", label: "Pay", icon: Wallet },
  { href: "/me/profile", label: "Profile", icon: UserRound },
];

export function isActiveItem(item: NavItem, pathname: string): boolean {
  if (item.href === "/me") return pathname === "/me";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
