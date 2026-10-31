"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { AlertPill, ConnectionIndicator } from "./header-status";
import { heroBtn } from "./mobile-hero";
import { useShell } from "./shell-context";

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Kontrol khusus halaman (mis. kotak cari). Ponsel: di kepala hijau; desktop: di kanan, setelah pill alert. */
  actions?: ReactNode;
  /** Tampilkan tombol kembali (halaman detail). */
  backHref?: string;
  className?: string;
};

function BackLink({ href, className }: { href: string; className: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      aria-label="Kembali"
      className={className}
    >
      <ArrowLeft aria-hidden className="size-[18px]" strokeWidth={2} />
    </Link>
  );
}

/**
 * Header halaman.
 * Ponsel: isinya dipasang (portal) ke kepala hijau MobileHero — tombol kembali di kiri atas, judul &
 * subjudul selebar layar, lalu `actions`. State tetap milik halaman karena portal ada di pohon halaman.
 * Tablet/desktop: judul besar di kiri, status global (koneksi, pill peringatan) dan `actions` di kanan.
 */
export function PageHeader({ title, subtitle, actions, backHref, className }: PageHeaderProps) {
  const { alertCount, connection, heroSlots } = useShell();
  return (
    <>
      {backHref && heroSlots.lead && createPortal(<BackLink href={backHref} className={heroBtn} />, heroSlots.lead)}
      {heroSlots.title &&
        createPortal(
          <>
            <h1 className="line-clamp-2 text-[24px] leading-tight font-semibold tracking-tight break-words">{title}</h1>
            {subtitle && <p className="mt-1 line-clamp-2 text-[13px] text-hero-muted">{subtitle}</p>}
          </>,
          heroSlots.title,
        )}
      {actions && heroSlots.actions && createPortal(<div className="mt-4 flex flex-wrap items-center gap-2 [&_input]:rounded-full">{actions}</div>, heroSlots.actions)}

      <header className={cn("mb-6 hidden flex-wrap items-center justify-between gap-x-4 gap-y-3 md:flex", className)}>
        <div className="flex min-w-0 items-center gap-3">
          {backHref && (
            <BackLink
              href={backHref}
              className="grid size-10 shrink-0 place-items-center rounded-control bg-card text-accent shadow-card ring-1 ring-line transition hover:bg-accent-soft"
            />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[32px] leading-tight font-bold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-0.5 truncate text-[15px] text-ink-2">{subtitle}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConnectionIndicator state={connection} />
          <AlertPill count={alertCount} />
          {actions}
        </div>
      </header>
    </>
  );
}
