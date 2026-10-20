"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { useCanWrite } from "@/lib/auth/use-session";
import { isActive, navFor, primaryNav, secondaryNav, type NavItem } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

/** Ikon + label pendek, supaya menu tidak perlu ditebak dari gambarnya saja. */
function RailLink({ item, active, badge }: { item: NavItem; active: boolean; badge?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex w-[72px] flex-col items-center gap-1 rounded-[14px] px-1 py-2.5 transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active ? "bg-active text-active-fg" : "bg-card text-ink-2 hover:bg-card-2",
      )}
    >
      <Icon aria-hidden className="size-[22px]" strokeWidth={1.7} />
      <span className="text-[11px] leading-none font-medium">{item.label}</span>
      {badge && <span aria-hidden className="absolute top-2 right-3 size-2 rounded-full bg-danger ring-2 ring-card" />}
    </Link>
  );
}

/** Rail navigasi vertikal kiri (≥ 768 px). */
export function NavRail({ alertBadge }: { alertBadge?: boolean }) {
  const pathname = usePathname();
  const canWrite = useCanWrite();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-y-0 left-0 z-30 hidden w-[88px] flex-col items-center justify-between py-6 md:flex"
    >
      <Logo />
      <ul className="flex flex-col gap-2">
        {navFor(primaryNav, canWrite).map((item) => (
          <li key={item.href}>
            <RailLink item={item} active={isActive(pathname, item.href)} badge={item.href === "/alerts" && alertBadge} />
          </li>
        ))}
      </ul>
      <ul className="flex flex-col items-center gap-2">
        <li>
          <ThemeToggle />
        </li>
        {secondaryNav.map((item) => (
          <li key={item.href}>
            <RailLink item={item} active={isActive(pathname, item.href)} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
