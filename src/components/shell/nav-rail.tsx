"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { isActive, primaryNav, secondaryNav, type NavItem } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

function RailLink({ item, active, badge }: { item: NavItem; active: boolean; badge?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={cn(
        "relative grid size-12 place-items-center rounded-[14px] transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active ? "bg-active text-active-fg" : "bg-card text-ink-2 hover:bg-card-2",
      )}
    >
      <Icon aria-hidden className="size-[19px]" strokeWidth={1.6} />
      {badge && <span aria-hidden className="absolute top-2.5 right-2.5 size-2 rounded-full bg-danger ring-2 ring-card" />}
    </Link>
  );
}

/** Rail navigasi vertikal kiri (≥ 768 px). */
export function NavRail({ alertBadge }: { alertBadge?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-y-0 left-0 z-30 hidden w-[88px] flex-col items-center justify-between py-6 md:flex"
    >
      <Logo />
      <ul className="flex flex-col gap-2.5">
        {primaryNav.map((item) => (
          <li key={item.href}>
            <RailLink item={item} active={isActive(pathname, item.href)} badge={item.href === "/alerts" && alertBadge} />
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-2.5">
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
