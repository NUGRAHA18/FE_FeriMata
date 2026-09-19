"use client";

import { BatteryWarning, Clock, FlaskConical, RadioTower } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Tone } from "@/components/ui/status";
import { useOverview } from "@/lib/api/queries";
import { formatDuration } from "@/lib/format";
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

const iconCls = "size-[18px]";

/** Banner yang diturunkan dari overview: broker terputus, daya cadangan, mode pengembangan. */
export function SystemBanners() {
  const flags = useOverview((o) => ({
    dev: o.system.mode === "DEVELOPMENT",
    messagingDown: !o.system.messagingConnected,
    transport: o.system.messagingTransport,
    backup: o.devices.items.filter((d) => d.onBackupPower).map((d) => d.deviceCode),
  })).data;
  if (!flags) return null;
  return (
    <>
      {flags.backup.length > 0 && (
        <Banner tone="danger" icon={<BatteryWarning aria-hidden className={iconCls} strokeWidth={1.8} />}>
          <strong className="font-semibold">Mode baterai — listrik PLN padam / daya cadangan</strong> ({flags.backup.join(", ")}). Dosing,
          sampling, dan trolley akan ditolak oleh backend.
        </Banner>
      )}
      {flags.messagingDown && (
        <Banner tone="warn" icon={<RadioTower aria-hidden className={iconCls} strokeWidth={1.8} />}>
          <strong className="font-semibold">Broker pesan terputus</strong>
          {flags.transport ? ` (${flags.transport})` : ""} — perintah aktuator tidak akan sampai ke perangkat.
        </Banner>
      )}
      {flags.dev && (
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-info-soft px-3 py-1 text-xs font-medium text-info">
          <FlaskConical aria-hidden className="size-3.5" strokeWidth={1.8} />
          Mode pengembangan — data simulasi
        </p>
      )}
    </>
  );
}

/** Peringatan 5 menit sebelum token (60 menit, tanpa refresh) kedaluwarsa. */
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
          Masuk ulang
        </Button>
      }
    >
      Sesi berakhir dalam <strong className="tabular font-semibold">{formatDuration(left)}</strong>. Backend belum mendukung perpanjangan sesi —
      simpan pekerjaan lalu masuk ulang.
    </Banner>
  );
}
