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
 * Bottom navigation (< 768 px): dua menu, tombol bulat "Siram" (jadwal siram) di tengah, satu menu,
 * lalu "Lainnya" yang membuka lembar berisi menu sisanya (Kamera, Peringatan, Tanaman, Pengaturan, …).
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
              className="group -mt-7 flex flex-col items-center gap-1 transition active:scale-95"
            >
              <span
                className={cn(
                  "grid size-[58px] place-items-center rounded-full bg-accent text-accent-fg shadow-[0_8px_20px_-6px_rgb(33_134_83/0.6)] ring-4 ring-bg transition group-hover:bg-accent-hover",
                  fabActive && "bg-accent-hover",
                )}
              >
                <FabIcon aria-hidden className="size-7" strokeWidth={2} />
              </span>
              <span className={cn("text-[10.5px] leading-none", fabActive ? "font-semibold text-accent-ink" : "font-medium text-ink-2")}>{mobileFab.label}</span>
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
        {/* p-0.5: garis tepi (ring) baris pertama tidak terpotong oleh area gulir. */}
        <ul className="grid grid-cols-2 gap-2 p-0.5">
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
                    // HP sempit: ikon di atas label supaya kata panjang ("Pengaturan") tidak terpotong.
                    "flex min-h-14 min-w-0 flex-col items-start gap-2 rounded-inner p-3 ring-1 ring-line transition min-[400px]:flex-row min-[400px]:items-center min-[400px]:gap-2.5",
                    active ? "bg-accent-soft text-accent-ink" : "bg-card-2 text-ink hover:bg-sunken",
                  )}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent-ink">
                    <Icon aria-hidden className="size-5" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 text-sm font-medium break-words">
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
