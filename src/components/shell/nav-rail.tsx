"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { useCanWrite } from "@/lib/auth/use-session";
import { isActive, navFor, primaryNav, secondaryNav, type NavItem } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

/** Ikon + label pendek, supaya menu tidak perlu ditebak dari gambarnya saja. Label di samping ikon mulai layar lebar. */
function RailLink({ item, active, badge }: { item: NavItem; active: boolean; badge?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex w-full flex-col items-center gap-1 rounded-[14px] px-1 py-2.5 transition lg:flex-row lg:gap-2.5 lg:px-3",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active ? "bg-accent-soft font-semibold text-accent" : "text-ink-2 hover:bg-card-2 hover:text-ink",
      )}
    >
      <span className="relative">
        <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2 : 1.7} />
        {badge && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-danger ring-2 ring-card" />}
      </span>
      <span className="text-[11px] leading-none lg:text-[13px]">{item.label}</span>
    </Link>
  );
}

/** Rail navigasi kiri (≥ 768 px): panel putih dengan logo, menu utama, lalu menu tambahan. */
export function NavRail({ alertBadge }: { alertBadge?: boolean }) {
  const pathname = usePathname();
  const canWrite = useCanWrite();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-y-0 left-0 z-30 hidden w-[96px] flex-col items-center gap-6 rounded-r-[28px] bg-card px-2.5 py-6 shadow-card ring-1 ring-line md:flex lg:w-[132px]"
    >
      <Logo className="size-14" />
      <ul className="flex w-full flex-col gap-1">
        {navFor(primaryNav, canWrite).map((item) => (
          <li key={item.href}>
            <RailLink item={item} active={isActive(pathname, item.href)} badge={item.href === "/alerts" && alertBadge} />
          </li>
        ))}
      </ul>
      <ul className="flex w-full flex-col gap-1 border-t border-line pt-4">
        {secondaryNav.map((item) => (
          <li key={item.href}>
            <RailLink item={item} active={isActive(pathname, item.href)} />
          </li>
        ))}
      </ul>
      <ThemeToggle className="mt-auto" />
    </nav>
  );
}
