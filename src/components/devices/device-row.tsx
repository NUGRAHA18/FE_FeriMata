"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Chip, StatusDot, type Tone } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import type { DeviceStatus } from "@/lib/api/types";
import { deviceTypeLabel, formatDuration, livenessLabel, powerSourceLabel } from "@/lib/format";
import { DeviceIcon } from "@/lib/icons";
import { cn } from "@/lib/cn";

export const livenessTone: Record<string, Tone> = { ONLINE: "ok", OFFLINE: "danger", UNKNOWN: "warn" };

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

/** Item alat: ikon jenis alat, nama, jenis dalam bahasa sehari-hari, status terhubung, chip masalah. */
export function DeviceRow({ status: s, name, type, href, className }: DeviceRowProps) {
  const tone = s.onBackupPower ? "danger" : (livenessTone[s.status] ?? "neutral");
  const body = (
    <>
      <div className="flex items-start gap-3">
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
          <DeviceIcon kind={type} aria-hidden className="size-5" strokeWidth={1.7} />
          <StatusDot tone={tone} className="absolute -right-0.5 -bottom-0.5 size-3 ring-2 ring-card-2" pulse={s.status === "UNKNOWN"} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{name ?? s.deviceCode}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{deviceTypeLabel(type) ?? s.deviceCode}</p>
          <p className="mt-1 text-xs text-muted">
            <span className="font-medium text-ink-2">{livenessLabel[s.status] ?? s.status}</span> · <LastSeen s={s} />
          </p>
          {(s.status !== "ONLINE" || s.onBackupPower) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <DeviceIssueChips s={s} />
            </div>
          )}
        </div>
        {href && <ChevronRight aria-hidden className="mt-1 size-4 shrink-0 text-muted" />}
      </div>
    </>
  );
  const cls = cn("block rounded-inner bg-card-2 p-3.5", href && "transition hover:ring-1 hover:ring-line", className);
  return href ? (
    <Link href={href} className={cls} aria-label={`${name ?? s.deviceCode}, ${livenessLabel[s.status] ?? s.status}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
