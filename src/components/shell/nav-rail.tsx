"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { useCanWrite } from "@/lib/auth/use-session";
import { guideHref } from "@/lib/guide-content";
import { isActive, navFor, primaryNav, secondaryNav, type NavItem } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

/** Ikon + label pendek, supaya menu tidak perlu ditebak dari gambarnya saja. Label di samping ikon mulai layar lebar.
 *  Lebar tautan = lebar kolom (w-full), jadi pill aktif selalu pas di dalam rail; label tidak pernah melewati pill
 *  (min-w-0 + truncate) dan `title` menampilkan nama lengkap bila terpotong. */
function RailLink({ item, active, badge, href = item.href }: { item: NavItem; active: boolean; badge?: boolean; href?: string }) {
  const Icon = item.icon;
  return (
    <Link
      href={href}
      title={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex w-full min-w-0 flex-col items-center gap-1 rounded-[14px] px-1 py-2.5 transition lg:flex-row lg:gap-2.5 lg:px-3",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active ? "bg-accent-soft font-semibold text-accent" : "text-ink-2 hover:bg-card-2 hover:text-ink",
      )}
    >
      {/* Kotak ikon tetap (24 px): ikon rata tengah dan badge menempel di pojok kanan atasnya. */}
      <span className="relative grid size-6 shrink-0 place-items-center">
        <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2 : 1.7} />
        {badge && <span aria-hidden className="absolute top-0 right-0 size-2.5 rounded-full bg-danger ring-2 ring-card" />}
      </span>
      <span className="max-w-full min-w-0 truncate text-[11px] leading-none whitespace-nowrap lg:text-[13px]">{item.label}</span>
    </Link>
  );
}

/** Rail navigasi kiri (≥ 768 px): panel putih dengan logo, menu utama, garis pemisah, lalu menu tambahan. */
export function NavRail({ alertBadge }: { alertBadge?: boolean }) {
  const pathname = usePathname();
  const canWrite = useCanWrite();
  return (
    <nav
      aria-label="Navigasi utama"
      className="scroll-thin fixed inset-y-0 left-0 z-30 hidden w-[96px] flex-col items-center gap-5 overflow-x-hidden overflow-y-auto rounded-r-[28px] bg-card px-2.5 py-6 shadow-card ring-1 ring-line md:flex lg:w-[160px] lg:px-3"
    >
      <Logo className="size-12 lg:size-14" />
      <ul className="flex w-full flex-col gap-1">
        {navFor(primaryNav, canWrite).map((item) => (
          <li key={item.href} className="min-w-0">
            <RailLink item={item} active={isActive(pathname, item.href)} badge={item.href === "/alerts" && alertBadge} />
          </li>
        ))}
      </ul>
      <ul className="flex w-full flex-col gap-1 border-t border-line pt-5">
        {secondaryNav.map((item) => (
          <li key={item.href} className="min-w-0">
            <RailLink item={item} active={isActive(pathname, item.href)} href={item.href === "/panduan" ? guideHref(pathname) : item.href} />
          </li>
        ))}
      </ul>
      <ThemeToggle className="mt-auto shrink-0" />
    </nav>
  );
}
