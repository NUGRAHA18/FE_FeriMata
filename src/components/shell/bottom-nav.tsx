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

const slotCls =
  "group relative flex h-[60px] w-full flex-col items-center justify-center gap-1 rounded-[14px] transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent";

/** Ikon dalam "kapsul": menu aktif diberi latar hijau muda, Siram (aksi utama) selalu hijau solid. */
function SlotIcon({ icon: Icon, active, primary }: { icon: NavItem["icon"]; active: boolean; primary?: boolean }) {
  return (
    <span
      className={cn(
        "grid h-7 w-12 place-items-center rounded-full transition",
        primary ? "bg-accent text-accent-fg group-hover:bg-accent-hover" : active ? "bg-accent-soft text-accent-ink" : "text-muted group-hover:text-ink",
      )}
    >
      <Icon aria-hidden className="size-[20px]" strokeWidth={active || primary ? 2.1 : 1.8} />
    </span>
  );
}

function SlotLabel({ active, children }: { active: boolean; children: string }) {
  return <span className={cn("text-[11px] leading-none", active ? "font-semibold text-accent-ink" : "font-medium text-ink-2")}>{children}</span>;
}

function Slot({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={slotCls}>
      <SlotIcon icon={item.icon} active={active} />
      <SlotLabel active={active}>{item.label}</SlotLabel>
    </Link>
  );
}

/** Bottom nav (< 768 px): dua menu, "Siram" di tengah, satu menu, lalu "Lainnya" berisi menu sisanya. */
export function BottomNav({ alertBadge }: { alertBadge?: boolean }) {
  const pathname = usePathname();
  const canWrite = useCanWrite();
  const { alertCount } = useShell();
  const [moreOpen, setMoreOpen] = useState(false);
  const { left, right, more } = mobileNav(canWrite);
  const moreActive = more.some((i) => isActive(pathname, i.href));
  const fabActive = isActive(pathname, mobileFab.href);

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-30 rounded-t-[22px] bg-card px-2 pt-1 pb-[max(6px,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_-8px_rgb(24_49_38/0.18)] ring-1 ring-line md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {left.map((item) => (
            <li key={item.href}>
              <Slot item={item} active={isActive(pathname, item.href)} />
            </li>
          ))}
          <li>
            <Link href={mobileFab.href} aria-current={fabActive ? "page" : undefined} className={slotCls}>
              <SlotIcon icon={mobileFab.icon} active={fabActive} primary />
              <SlotLabel active={fabActive}>{mobileFab.label}</SlotLabel>
            </Link>
          </li>
          {right.map((item) => (
            <li key={item.href}>
              <Slot item={item} active={isActive(pathname, item.href)} />
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" className={slotCls}>
              <SlotIcon icon={Ellipsis} active={moreActive} />
              <SlotLabel active={moreActive}>Lainnya</SlotLabel>
              {alertBadge && <span aria-hidden className="absolute top-2 right-[calc(50%-22px)] size-2 rounded-full bg-danger ring-2 ring-card" />}
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
