"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { AlertDrawer } from "@/components/alerts/alert-drawer";
import { AppShell } from "@/components/shell/app-shell";
import { Banner, SessionExpiryBanner, SystemBanners } from "@/components/shell/banners";
import { Logo } from "@/components/shell/logo";
import { useOverview } from "@/lib/api/queries";
import { ensureFreshToken, needsRefresh, REFRESH_LEEWAY_MS } from "@/lib/auth/refresh";
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
        Memuat…
      </div>
    </div>
  );
}

function AuthedConsole({ session, children }: { session: Session; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  useRealtime(session.token);
  const connection = useConnectionState();
  const alertCount = useOverview((o) => o.alerts.unacknowledged).data ?? 0;

  // Perpanjang token akses diam-diam sebelum habis; sesi berakhir hanya saat refresh token habis.
  useEffect(() => {
    if (!session.refreshToken) {
      const ms = Date.parse(session.expiresAt) - Date.now();
      const t = setTimeout(() => endSession("expired"), Math.max(0, Math.min(ms, 2 ** 31 - 1)));
      return () => clearTimeout(t);
    }
    const until = Date.parse(session.expiresAt) - Date.now() - REFRESH_LEEWAY_MS;
    const t = setTimeout(() => void ensureFreshToken(), needsRefresh(session.expiresAt) ? 0 : Math.max(1000, Math.min(until, 2 ** 31 - 1)));
    const end = Date.parse(session.refreshExpiresAt) - Date.now();
    const t2 = setTimeout(() => endSession("expired"), Math.max(0, Math.min(end, 2 ** 31 - 1)));
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [session.expiresAt, session.refreshExpiresAt, session.refreshToken]);

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
          {session.user.mustChangePassword && pathname !== "/profile" && (
            <Banner
              tone="warn"
              icon={<KeyRound aria-hidden className="size-5" strokeWidth={1.8} />}
              action={
                <Link href="/profile?ganti-sandi=1" className="inline-flex h-9 items-center rounded-control bg-active px-3 text-sm font-medium text-active-fg hover:opacity-90">
                  Ganti sekarang
                </Link>
              }
            >
              <strong className="font-semibold">Kata sandi Anda masih sandi sementara.</strong> Ganti dengan kata sandi Anda sendiri.
            </Banner>
          )}
          <SessionExpiryBanner expiresAt={session.refreshExpiresAt} onRelogin={relogin} />
          <SystemBanners />
        </>
      }
      overlays={<AlertDrawer />}
    >
      {children}
    </AppShell>
  );
}

/** Gerbang auth: tanpa sesi → /login?next=<path>; sesi berakhir → cache dibersihkan. */
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
