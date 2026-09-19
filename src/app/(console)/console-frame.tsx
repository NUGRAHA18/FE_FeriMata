"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AlertDrawer } from "@/components/alerts/alert-drawer";
import { AppShell } from "@/components/shell/app-shell";
import { SessionExpiryBanner, SystemBanners } from "@/components/shell/banners";
import { Logo } from "@/components/shell/logo";
import { useOverview } from "@/lib/api/queries";
import { endSession, type Session } from "@/lib/auth/session";
import { useSession } from "@/lib/auth/use-session";
import { useRealtime, useConnectionState } from "@/lib/realtime/stomp";

function initialsOf(s: Session) {
  const name = s.user.fullName?.trim() || s.user.username;
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase() || "OP";
}

function currentPath() {
  return window.location.pathname + window.location.search;
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy>
      <div className="flex flex-col items-center gap-3 text-sm text-muted">
        <Logo className="animate-pulse" />
        Memuat konsol…
      </div>
    </div>
  );
}

function AuthedConsole({ session, children }: { session: Session; children: ReactNode }) {
  const router = useRouter();
  useRealtime(session.token);
  const connection = useConnectionState();
  const alertCount = useOverview((o) => o.alerts.unacknowledged).data ?? 0;

  // Logout otomatis tepat saat token kedaluwarsa.
  useEffect(() => {
    const ms = Date.parse(session.expiresAt) - Date.now();
    const t = setTimeout(() => endSession("expired"), Math.max(0, Math.min(ms, 2 ** 31 - 1)));
    return () => clearTimeout(t);
  }, [session.expiresAt]);

  const relogin = () => {
    const next = currentPath();
    endSession("logout");
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  };

  return (
    <AppShell
      alertCount={alertCount}
      connection={connection}
      initials={initialsOf(session)}
      banners={
        <>
          <SessionExpiryBanner expiresAt={session.expiresAt} onRelogin={relogin} />
          <SystemBanners />
        </>
      }
      overlays={<AlertDrawer />}
    >
      {children}
    </AppShell>
  );
}

/** Gerbang auth konsol: tanpa sesi → /login?next=<path>; sesi berakhir → cache dibersihkan. */
export function ConsoleFrame({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();

  useEffect(() => {
    if (session !== null) return;
    qc.clear();
    router.replace(`/login?next=${encodeURIComponent(currentPath())}`);
  }, [session, router, qc, pathname]);

  if (!session) return <Splash />;
  return <AuthedConsole session={session}>{children}</AuthedConsole>;
}
