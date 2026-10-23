"use client";

import { BatteryWarning, Clock, FlaskConical, RadioTower, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Tone } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { useLatestReceivedAt, useOverview } from "@/lib/api/queries";
import { formatDateTime, formatDuration } from "@/lib/format";
import { useIsOnline } from "@/lib/offline/use-offline-snapshot";
import { LeafCorner } from "@/components/illustrations";
import { cn } from "@/lib/cn";
import { useNow } from "@/lib/use-now";

const toneClass: Partial<Record<Tone, string>> = {
  warn: "bg-warn-soft text-warn-ink",
  danger: "bg-danger-soft text-danger-ink",
  info: "bg-info-soft text-info",
};

export function Banner({ tone, icon, children, action }: { tone: Tone; icon: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div role="status" className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-inner px-4 py-3 text-sm", toneClass[tone])}>
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

const iconCls = "size-5";

/** Banner dari overview: koneksi ke alat putus, memakai baterai, mode percobaan. Bahasa sehari-hari. */
export function SystemBanners() {
  const flags = useOverview((o) => ({
    dev: o.system.mode === "DEVELOPMENT",
    messagingDown: !o.system.messagingConnected,
    backup: o.devices.items.filter((d) => d.onBackupPower).map((d) => d.deviceCode),
  })).data;
  if (!flags) return null;
  return (
    <>
      {flags.backup.length > 0 && (
        <Banner tone="danger" icon={<BatteryWarning aria-hidden className={iconCls} strokeWidth={1.8} />}>
          <strong className="font-semibold">Listrik PLN padam, sistem memakai baterai.</strong> Pompa pupuk dan kereta kamera dihentikan sementara
          sampai listrik kembali.
        </Banner>
      )}
      {flags.messagingDown && (
        <Banner tone="warn" icon={<RadioTower aria-hidden className={iconCls} strokeWidth={1.8} />}>
          <strong className="font-semibold">Koneksi ke alat terputus.</strong> Perintah nyalakan/matikan belum bisa dikirim sekarang.
        </Banner>
      )}
      {flags.dev && (
        <p className="relative inline-flex w-full items-center gap-2 overflow-hidden rounded-inner bg-accent-soft px-3.5 py-2.5 pr-16 text-[13px] font-medium text-accent ring-1 ring-line sm:w-fit sm:rounded-full sm:py-1.5">
          <FlaskConical aria-hidden className="size-4 shrink-0" strokeWidth={1.9} />
          Mode percobaan — angka di layar bukan dari sensor asli
          <LeafCorner className="absolute -top-1 right-0 h-12 w-16" />
        </p>
      )}
    </>
  );
}

/**
 * Data tidak bisa diperbarui (tanpa internet, atau server tidak menjawab): angka yang tampil adalah
 * data terakhir yang tersimpan di HP ini — sebutkan kapan, supaya tidak dikira angka sekarang.
 */
export function OfflineBanner() {
  const online = useIsOnline();
  const q = useOverview((o) => o.system.generatedAt);
  const lastReceived = useLatestReceivedAt();
  const hasData = q.data !== undefined;
  if (online && !(q.error && hasData)) return null;
  const lastAt = Math.max(q.dataUpdatedAt, lastReceived);
  return (
    <Banner tone="warn" icon={<WifiOff aria-hidden className={iconCls} strokeWidth={1.8} />}>
      <strong className="font-semibold">{online ? "Data belum bisa diperbarui dari server." : "Tidak ada sambungan internet."}</strong>{" "}
      {hasData && lastAt > 0 ? (
        <>
          Angka yang tampil adalah data terakhir, {formatDateTime(lastAt)} (<RelativeTime iso={new Date(lastAt).toISOString()} />
          ). Perintah ke alat belum bisa dikirim.
        </>
      ) : (
        "Belum ada data tersimpan di perangkat ini."
      )}
    </Banner>
  );
}

/** Peringatan 5 menit sebelum sesi 7 hari (refresh token) habis. */
export function SessionExpiryBanner({ expiresAt, onRelogin }: { expiresAt: string; onRelogin: () => void }) {
  const now = useNow();
  const left = Math.round((Date.parse(expiresAt) - now) / 1000);
  if (!now || left > 5 * 60 || left <= 0) return null;
  return (
    <Banner
      tone="warn"
      icon={<Clock aria-hidden className={iconCls} strokeWidth={1.8} />}
      action={
        <Button size="sm" variant="dark" onClick={onRelogin}>
          Masuk lagi
        </Button>
      }
    >
      Sesi Anda habis dalam <strong className="tabular font-semibold">{formatDuration(left)}</strong>. Setelah itu Anda perlu masuk lagi.
    </Banner>
  );
}
