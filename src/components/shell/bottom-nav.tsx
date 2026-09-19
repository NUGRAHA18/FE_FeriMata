"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isActive, primaryNav } from "./nav-items";

/** Bottom navigation melayang berbentuk pill (< 768 px). */
export function BottomNav({ alertBadge }: { alertBadge?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-center justify-between rounded-[22px] bg-card/85 p-2 shadow-[0_8px_30px_rgb(0_0_0/0.12)] ring-1 ring-line backdrop-blur-xl">
        {primaryNav.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative grid size-12 place-items-center rounded-[14px] transition",
                  active ? "bg-active text-active-fg" : "text-ink-2 hover:bg-card-2",
                )}
              >
                <Icon aria-hidden className="size-[19px]" strokeWidth={1.6} />
                {item.href === "/alerts" && alertBadge && (
                  <span aria-hidden className="absolute top-2.5 right-2.5 size-2 rounded-full bg-danger" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
