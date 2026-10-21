"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { useCanWrite } from "@/lib/auth/use-session";
import { isActive, mobileFab, mobileNav, type NavItem } from "./nav-items";
import { useShell } from "./shell-context";
import { ThemeSwitcher } from "./theme-toggle";

const slotCls = "relative flex h-[58px] flex-col items-center justify-center gap-1 rounded-[16px] px-1 transition";

function Slot({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={cn(slotCls, active ? "text-accent" : "text-ink-2 hover:text-ink")}>
      <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.1 : 1.7} />
      <span className={cn("text-[10.5px] leading-none", active ? "font-semibold" : "font-medium")}>{item.label}</span>
    </Link>
  );
}

/**
 * Bottom navigation (< 768 px) seperti referensi: dua menu, tombol bulat Tanaman di tengah, satu menu,
 * lalu "Lainnya" yang membuka lembar berisi menu sisanya (Kamera, Peringatan, Pengaturan, Akun, tema).
 */
export function BottomNav({ alertBadge }: { alertBadge?: boolean }) {
  const pathname = usePathname();
  const canWrite = useCanWrite();
  const { alertCount } = useShell();
  const [moreOpen, setMoreOpen] = useState(false);
  const { left, right, more } = mobileNav(canWrite);
  const moreActive = more.some((i) => isActive(pathname, i.href));
  const fabActive = isActive(pathname, mobileFab.href);
  const FabIcon = mobileFab.icon;

  return (
    <>
      <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5 items-end rounded-[24px] bg-card/95 p-1.5 shadow-[0_8px_30px_rgb(16_64_34/0.16)] ring-1 ring-line backdrop-blur-xl">
          {left.map((item) => (
            <li key={item.href}>
              <Slot item={item} active={isActive(pathname, item.href)} />
            </li>
          ))}
          <li className="flex justify-center">
            <Link
              href={mobileFab.href}
              aria-current={fabActive ? "page" : undefined}
              aria-label={mobileFab.label}
              className={cn(
                "-mt-7 grid size-[62px] place-items-center rounded-full bg-gradient-to-br from-accent-2 to-accent text-accent-fg shadow-[0_8px_20px_-4px_rgb(31_154_83/0.55)] ring-4 ring-bg transition active:scale-95",
                fabActive && "from-accent to-active",
              )}
            >
              <FabIcon aria-hidden className="size-7" strokeWidth={2} />
            </Link>
          </li>
          {right.map((item) => (
            <li key={item.href}>
              <Slot item={item} active={isActive(pathname, item.href)} />
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              className={cn(slotCls, "w-full", moreActive ? "text-accent" : "text-ink-2 hover:text-ink")}
            >
              <Ellipsis aria-hidden className="size-[22px]" strokeWidth={moreActive ? 2.1 : 1.7} />
              <span className={cn("text-[10.5px] leading-none", moreActive ? "font-semibold" : "font-medium")}>Lainnya</span>
              {alertBadge && <span aria-hidden className="absolute top-2 right-[26%] size-2 rounded-full bg-danger" />}
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu lainnya">
        <ul className="grid grid-cols-2 gap-2.5">
          {more.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            const count = item.href === "/alerts" ? alertCount : 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-inner p-3.5 ring-1 ring-line transition",
                    active ? "bg-accent-soft text-accent" : "bg-card-2 text-ink hover:bg-sunken",
                  )}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Icon aria-hidden className="size-5" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 text-sm font-medium">
                    {item.label}
                    {count > 0 && <span className="tabular block text-xs font-normal text-danger-ink">{count} belum ditangani</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-ink-2">Tema tampilan</p>
          <ThemeSwitcher />
        </div>
      </Dialog>
    </>
  );
}
