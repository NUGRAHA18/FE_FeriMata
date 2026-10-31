"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { BottomNav } from "./bottom-nav";
import { MobileHero } from "./mobile-hero";
import { NavRail } from "./nav-rail";
import { ShellProvider, type ConnectionState } from "./shell-context";

type AppShellProps = {
  children: ReactNode;
  alertCount: number;
  connection: ConnectionState;
  initials: string;
  /** Banner global (mode pengembangan, broker terputus, daya cadangan, sesi hampir habis). */
  banners?: ReactNode;
  /** Drawer/overlay global (alert drawer). */
  overlays?: ReactNode;
};

export function AppShell({ children, alertCount, connection, initials, banners, overlays }: AppShellProps) {
  const home = usePathname() === "/";
  return (
    <ShellProvider alertCount={alertCount} connection={connection}>
      <NavRail alertBadge={alertCount > 0} />
      <div className="min-h-dvh px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8 md:pl-[116px] md:pr-6 md:pt-6 lg:pl-[156px] lg:pr-8">
        <div className="mx-auto w-full max-w-[1480px]">
          <MobileHero initials={initials} />
          {/* Ponsel: isi naik menumpang tepi bawah kepala hijau (kartu melayang); Beranda lebih dalam. */}
          <div className={cn("relative", home ? "max-md:-mt-14" : "max-md:-mt-6")}>
            {banners && <div className="mb-4 flex flex-col gap-2 empty:hidden">{banners}</div>}
            <main id="konten">{children}</main>
          </div>
        </div>
      </div>
      <BottomNav alertBadge={alertCount > 0} />
      {overlays}
    </ShellProvider>
  );
}
