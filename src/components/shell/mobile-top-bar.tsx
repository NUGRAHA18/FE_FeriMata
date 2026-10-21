"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { ConnectionIndicator } from "./header-status";
import { Logo } from "./logo";
import { productName } from "@/config/site";
import { useShell } from "./shell-context";

/** Top bar mobile: logo + nama aplikasi kiri; kanan lonceng peringatan dan avatar. Tema ada di menu "Lainnya". */
export function MobileTopBar({ initials }: { initials: string }) {
  const { alertCount, connection, openAlertDrawer } = useShell();
  return (
    <div className="mb-4 flex items-center justify-between md:hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        <Logo />
        <span className="truncate text-[22px] font-bold tracking-tight text-ink">{productName}</span>
        <ConnectionIndicator state={connection} compact />
      </div>
      <div className="flex items-center gap-2">
        <IconButton
          icon={Bell}
          label={alertCount > 0 ? `${alertCount} peringatan belum ditangani` : "Peringatan"}
          badge={alertCount > 0}
          onClick={openAlertDrawer}
          size="lg"
          className="rounded-full bg-card ring-1 ring-line"
        />
        <Link
          href="/profile"
          aria-label="Akun"
          className="grid size-12 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent ring-1 ring-line"
        >
          {initials}
        </Link>
      </div>
    </div>
  );
}
