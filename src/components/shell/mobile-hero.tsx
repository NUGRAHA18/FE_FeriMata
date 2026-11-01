"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, CircleHelp } from "lucide-react";
import { useCallback } from "react";
import { StatusDot } from "@/components/ui/status";
import { productName } from "@/config/site";
import { useSession } from "@/lib/auth/use-session";
import { formatLongDate } from "@/lib/format";
import { guideHref } from "@/lib/guide-content";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { useShell, type ConnectionState, type HeroSlotKey } from "./shell-context";

function firstName(fullName: string | null | undefined, username: string | undefined) {
  return (fullName?.trim().split(/\s+/)[0] || username || "").trim();
}

const connectionText: Record<ConnectionState, string> = {
  connected: "Data langsung dari greenhouse",
  connecting: "Menyambungkan…",
  disconnected: "Koneksi terputus",
};

/** Tombol bulat transparan di atas hijau tua (panduan, lonceng, kembali). */
export const heroBtn =
  "relative grid size-10 shrink-0 place-items-center rounded-full bg-hero-chip text-hero-fg transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** Ref callback stabil untuk satu slot (callback baru tiap render akan memicu set state berulang). */
function useSlotRef(key: HeroSlotKey) {
  const { setHeroSlot } = useShell();
  return useCallback((el: HTMLDivElement | null) => setHeroSlot(key, el), [setHeroSlot, key]);
}

function Greeting() {
  const user = useSession()?.user;
  const name = firstName(user?.fullName, user?.username);
  const now = useNow();
  return (
    <div className="min-w-0 pt-0.5">
      <h1 className="truncate text-[22px] leading-tight tracking-tight">
        {name ? (
          <>
            Halo, <span className="font-semibold">{name}</span>
          </>
        ) : (
          <span className="font-semibold">{productName}</span>
        )}
      </h1>
      <p className="tabular mt-1 truncate text-[13px] text-hero-muted" suppressHydrationWarning>
        {now ? formatLongDate(now) : " "}
      </p>
    </div>
  );
}

/** Baris status Beranda: koneksi (bukan tombol) di kiri, peringatan (tombol) di kanan. */
function StatusRow() {
  const { alertCount, connection, openAlertDrawer } = useShell();
  const tone = connection === "connected" ? "ok" : connection === "connecting" ? "neutral" : "warn";
  return (
    <div className="mt-4 flex h-11 items-center gap-2 rounded-full bg-hero-chip pr-1.5 pl-4 ring-1 ring-white/10">
      <p role="status" className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
        <StatusDot tone={tone} pulse={connection !== "connected"} className="ring-2 ring-white/20" />
        <span className="truncate">{connectionText[connection]}</span>
      </p>
      <button
        type="button"
        onClick={openAlertDrawer}
        aria-label={`${alertCount} peringatan belum ditangani — buka daftar peringatan`}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white",
          alertCount > 0 ? "bg-hero-fg text-hero" : "text-hero-muted hover:bg-white/10",
        )}
      >
        <span className="tabular">{alertCount}</span> peringatan
        <ChevronRight aria-hidden className="-mr-1 size-3.5" strokeWidth={2.2} />
      </button>
    </div>
  );
}

/** Kepala halaman ponsel (< 768 px). Beranda: sapaan + tanggal + status; halaman lain: logo/tombol
 * kembali, judul, dan kontrol halaman. Isi halaman menumpang di tepi bawahnya (AppShell). */
export function MobileHero({ initials }: { initials: string }) {
  const { alertCount, openAlertDrawer } = useShell();
  const pathname = usePathname();
  const home = pathname === "/";
  const leadRef = useSlotRef("lead");
  const titleRef = useSlotRef("title");
  const actionsRef = useSlotRef("actions");

  const buttons = (
    <div className="flex shrink-0 items-center gap-2">
      {pathname !== "/panduan" && (
        <Link href={guideHref(pathname)} aria-label="Panduan untuk halaman ini" title="Panduan" className={heroBtn}>
          <CircleHelp aria-hidden className="size-5" strokeWidth={1.8} />
        </Link>
      )}
      <button
        type="button"
        onClick={openAlertDrawer}
        aria-label={alertCount > 0 ? `${alertCount} peringatan belum ditangani` : "Peringatan"}
        title="Peringatan"
        className={heroBtn}
      >
        <Bell aria-hidden className="size-5" strokeWidth={1.8} />
        {alertCount > 0 && <span aria-hidden className="absolute top-2 right-2.5 size-2 rounded-full bg-danger ring-2 ring-hero" />}
      </button>
      <Link
        href="/profile"
        aria-label="Akun"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-hero-fg text-sm font-semibold text-hero ring-2 ring-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {initials}
      </Link>
    </div>
  );

  return (
    <header
      className={cn(
        "-mx-4 -mt-[max(16px,env(safe-area-inset-top))] rounded-b-[28px] bg-hero px-4 pt-[calc(max(16px,env(safe-area-inset-top))+8px)] text-hero-fg md:hidden",
        home ? "pb-[72px]" : "pb-11",
      )}
    >
      {home ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <Greeting />
            {buttons}
          </div>
          <StatusRow />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center">
              {/* Diisi tombol kembali oleh PageHeader halaman detail; kosong → logo. */}
              <div ref={leadRef} className="peer empty:hidden" />
              <Logo className="size-10 rounded-[12px] shadow-none ring-white/30 peer-[:not(:empty)]:hidden" />
            </div>
            {buttons}
          </div>
          <div ref={titleRef} className="mt-3 min-w-0" />
          <div ref={actionsRef} className="empty:hidden" />
        </>
      )}
    </header>
  );
}
