"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CircleHelp } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { ConnectionIndicator } from "./header-status";
import { Logo } from "./logo";
import { productName } from "@/config/site";
import { guideHref } from "@/lib/guide-content";
import { useShell } from "./shell-context";

/** Top bar mobile: logo + nama aplikasi kiri; kanan lonceng peringatan dan avatar. Tema ada di menu "Lainnya". */
export function MobileTopBar({ initials }: { initials: string }) {
  const { alertCount, connection, openAlertDrawer } = useShell();
  const pathname = usePathname();
  return (
    <div className="mb-4 flex items-center justify-between md:hidden">
      <div className="flex min-w-0 items-center gap-2 min-[400px]:gap-2.5">
        <Logo />
        <span className="truncate text-[20px] font-bold tracking-tight text-ink min-[400px]:text-[22px]">{productName}</span>
        <ConnectionIndicator state={connection} compact />
      </div>
      <div className="flex shrink-0 items-center gap-1.5 min-[400px]:gap-2">
        {pathname !== "/panduan" && (
          <Link
            href={guideHref(pathname)}
            aria-label="Panduan untuk halaman ini"
            title="Panduan"
            className="grid size-11 place-items-center rounded-full bg-card text-ink-2 ring-1 ring-line transition hover:text-ink min-[400px]:size-12"
          >
            <CircleHelp aria-hidden className="size-[22px]" strokeWidth={1.8} />
          </Link>
        )}
        <IconButton
          icon={Bell}
          label={alertCount > 0 ? `${alertCount} peringatan belum ditangani` : "Peringatan"}
          badge={alertCount > 0}
          onClick={openAlertDrawer}
          size="lg"
          className="size-11 rounded-full bg-card ring-1 ring-line min-[400px]:size-12"
        />
        <Link
          href="/profile"
          aria-label="Akun"
          className="grid size-11 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent ring-1 ring-line min-[400px]:size-12"
        >
          {initials}
        </Link>
      </div>
    </div>
  );
}
