"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Chip, StatusLine, type Tone } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import type { DeviceStatus } from "@/lib/api/types";
import { deviceNameLabel, deviceTypeLabel, formatDuration, livenessLabel, powerSourceLabel } from "@/lib/format";
import { DevicePicto, pictoTile } from "@/components/icons/pictos";
import { cn } from "@/lib/cn";

/** Terhubung · Terputus · Belum pernah terhubung (tidak diketahui). */
export const livenessTone: Record<string, Tone> = { ONLINE: "ok", OFFLINE: "danger", UNKNOWN: "neutral" };

/** Chip masalah alat: terputus, belum pernah terhubung, memakai baterai. */
export function DeviceIssueChips({ s }: { s: Pick<DeviceStatus, "status" | "onBackupPower" | "powerSource" | "lastSeenAt"> }) {
  return (
    <>
      {s.status === "OFFLINE" && (
        <Chip tone="danger">
          Terputus{s.lastSeenAt ? " sejak " : ""}
          {s.lastSeenAt && <RelativeTime iso={s.lastSeenAt} />}
        </Chip>
      )}
      {s.status === "UNKNOWN" && <Chip tone="warn">Belum pernah terhubung</Chip>}
      {s.onBackupPower && <Chip tone="danger">Listrik dari {powerSourceLabel(s.powerSource)}</Chip>}
    </>
  );
}

/** "kabar terakhir 40 dtk lalu" (timeout dari backend hanya ditampilkan bila detail diminta). */
export function LastSeen({ s, withTimeout }: { s: Pick<DeviceStatus, "lastSeenAt" | "offlineTimeoutSeconds">; withTimeout?: boolean }) {
  return (
    <span>
      {s.lastSeenAt ? <RelativeTime iso={s.lastSeenAt} prefix="kabar terakhir " /> : "belum pernah memberi kabar"}
      {withTimeout && <> · dianggap terputus bila diam lebih dari {formatDuration(s.offlineTimeoutSeconds)}</>}
    </span>
  );
}

type DeviceRowProps = {
  status: DeviceStatus;
  name?: string | null;
  type?: string | null;
  href?: string;
  className?: string;
};

/** Item alat: ikon tipe, nama, jenis, dan status satu baris (titik + teks + kabar terakhir). */
export function DeviceRow({ status: s, name: rawName, type, href, className }: DeviceRowProps) {
  const name = deviceNameLabel(rawName) ?? s.deviceCode;
  // Terputus atau memakai baterai: bingkai kartu sedikit kemerahan, selain itu netral.
  const problem = s.status === "OFFLINE" || s.onBackupPower;
  const body = (
    <div className="flex items-start gap-3">
      <span className={cn(pictoTile, "size-10")}>
        <DevicePicto kind={type} className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] leading-5 font-semibold text-ink" title={name}>
          {name}
        </p>
        <p className="truncate text-xs leading-4 text-ink-2">{deviceTypeLabel(type) ?? s.deviceCode}</p>
        <StatusLine className="mt-1.5" tone={livenessTone[s.status] ?? "neutral"} label={livenessLabel[s.status] ?? s.status} pulse={s.status === "UNKNOWN"}>
          <LastSeen s={s} />
        </StatusLine>
        {s.onBackupPower && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone="danger">Listrik dari {powerSourceLabel(s.powerSource)}</Chip>
          </div>
        )}
      </div>
      {href && <ChevronRight aria-hidden className="mt-2.5 size-4 shrink-0 text-muted" strokeWidth={2} />}
    </div>
  );
  const cls = cn(
    "block rounded-inner bg-card p-3 ring-1 ring-line",
    href && "transition hover:bg-card-2 hover:ring-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    problem && "ring-danger/30",
    className,
  );
  const label = `${name}, ${livenessLabel[s.status] ?? s.status}${s.onBackupPower ? ", memakai baterai" : ""}`;
  return href ? (
    <Link href={href} className={cls} aria-label={label}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
