"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AlertPill, ConnectionIndicator } from "./header-status";
import { useShell } from "./shell-context";

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Kontrol khusus halaman (mis. pemilih plot) — di kanan, setelah pill alert. */
  actions?: ReactNode;
  /** Tampilkan tombol kembali (halaman detail). */
  backHref?: string;
  className?: string;
};

/**
 * Header halaman. Pada desktop menampilkan judul besar di kiri dan status global
 * (koneksi realtime, pill "N Alert") di kanan, mengikuti referensi tablet.
 */
export function PageHeader({ title, subtitle, actions, backHref, className }: PageHeaderProps) {
  const router = useRouter();
  const { alertCount, connection } = useShell();
  return (
    <header className={cn("mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 md:mb-6", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            onClick={(e) => {
              if (window.history.length > 1) {
                e.preventDefault();
                router.back();
              }
            }}
            aria-label="Kembali"
            className="grid size-10 shrink-0 place-items-center rounded-control bg-card text-ink-2 hover:bg-card-2"
          >
            <ArrowLeft aria-hidden className="size-[18px]" strokeWidth={1.6} />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[26px] leading-tight font-normal tracking-tight text-ink md:text-[32px]">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <div className="hidden items-center gap-2 md:flex">
          <ConnectionIndicator state={connection} />
          <AlertPill count={alertCount} />
        </div>
        {actions}
      </div>
    </header>
  );
}
