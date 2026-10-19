"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isActive, primaryNav } from "./nav-items";

/** Bottom navigation melayang (< 768 px): ikon + label, supaya tidak perlu menebak arti ikon. */
export function BottomNav({ alertBadge }: { alertBadge?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between rounded-[22px] bg-card/90 p-1.5 shadow-[0_8px_30px_rgb(0_0_0/0.12)] ring-1 ring-line backdrop-blur-xl">
        {primaryNav.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-[58px] flex-col items-center justify-center gap-1 rounded-[16px] px-1 transition",
                  active ? "bg-active text-active-fg" : "text-ink-2 hover:bg-card-2",
                )}
              >
                <Icon aria-hidden className="size-[22px]" strokeWidth={1.7} />
                <span className="text-[10.5px] leading-none font-medium">{item.label}</span>
                {item.href === "/alerts" && alertBadge && (
                  <span aria-hidden className="absolute top-2 right-[22%] size-2 rounded-full bg-danger" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
