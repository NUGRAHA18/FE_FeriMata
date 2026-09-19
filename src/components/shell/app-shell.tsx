"use client";

import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { MobileTopBar } from "./mobile-top-bar";
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
  return (
    <ShellProvider alertCount={alertCount} connection={connection}>
      <NavRail alertBadge={alertCount > 0} />
      <div className="min-h-dvh px-4 pt-[max(16px,env(safe-area-inset-top))] pb-28 md:pb-8 md:pl-[104px] md:pr-6 md:pt-6 lg:pr-8">
        <div className="mx-auto w-full max-w-[1480px]">
          <MobileTopBar initials={initials} />
          {banners && <div className="mb-4 flex flex-col gap-2 empty:hidden">{banners}</div>}
          <main id="konten">{children}</main>
        </div>
      </div>
      <BottomNav alertBadge={alertCount > 0} />
      {overlays}
    </ShellProvider>
  );
}
