"use client";

import { useTransition } from "react";
import { LogOut, Sun, Moon, Languages, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  email: string;
  logoutAction: () => Promise<void>;
};

/**
 * Top-right user menu. Avatar + email + dropdown with sign out, theme toggle
 * (light / dark — purely client, no persistence yet), locale switcher
 * (English / French — UI stub; next-intl wiring lands in a later PR).
 */
export function UserMenu({ email, logoutAction }: Props) {
  const [pending, start] = useTransition();

  const initials = email
    .split("@")[0]!
    .split(/[._-]/)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "?";

  const toggleDark = () => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 rounded-sm px-2 hover:bg-sidebar-accent"
          aria-label={`Open user menu for ${email}`}
        >
          <Avatar className="h-7 w-7 border border-border">
            <AvatarFallback className="bg-[var(--brass)]/15 font-mono text-[10px] font-medium tracking-widest text-[var(--brass)]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm md:inline-block">{email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="label-eyebrow !text-[0.625rem]">Signed in as</span>
          <span className="truncate text-sm font-medium">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem className="gap-2" disabled>
          <UserRound className="h-4 w-4" />
          My profile
          <span className="ml-auto label-eyebrow !text-[0.625rem]">soon</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="gap-2" disabled>
          <Languages className="h-4 w-4" />
          Language
          <span className="ml-auto label-eyebrow !text-[0.625rem]">EN / FR — soon</span>
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2" onSelect={(e) => { e.preventDefault(); toggleDark(); }}>
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:inline-block" />
          Toggle theme
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <form
          action={() => start(async () => { await logoutAction(); })}
        >
          <DropdownMenuItem asChild>
            <button
              type="submit"
              disabled={pending}
              className={cn(
                "w-full gap-2 text-destructive focus:text-destructive",
                pending && "opacity-60"
              )}
            >
              <LogOut className="h-4 w-4" />
              {pending ? "Signing out…" : "Sign out"}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
