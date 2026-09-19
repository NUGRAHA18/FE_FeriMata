"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { ConnectionIndicator } from "./header-status";
import { Logo } from "./logo";
import { useShell } from "./shell-context";
import { ThemeToggle } from "./theme-toggle";

/** Top bar mobile: logo kiri; kanan indikator koneksi, lonceng, avatar. */
export function MobileTopBar({ initials }: { initials: string }) {
  const { alertCount, connection, openAlertDrawer } = useShell();
  return (
    <div className="mb-4 flex items-center justify-between md:hidden">
      <Logo />
      <div className="flex items-center gap-2">
        <ConnectionIndicator state={connection} compact />
        <ThemeToggle />
        <IconButton
          icon={Bell}
          label={alertCount > 0 ? `${alertCount} alert belum ditangani` : "Alert"}
          badge={alertCount > 0}
          onClick={openAlertDrawer}
          size="lg"
          className="bg-card"
        />
        <Link
          href="/profile"
          aria-label="Profil"
          className="grid size-12 place-items-center rounded-[14px] bg-active text-sm font-semibold text-active-fg"
        >
          {initials}
        </Link>
      </div>
    </div>
  );
}
