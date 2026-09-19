"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Chip, StatusDot, type Tone } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import type { DeviceStatus } from "@/lib/api/types";
import { formatDuration, livenessLabel, powerSourceLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

export const livenessTone: Record<string, Tone> = { ONLINE: "ok", OFFLINE: "danger", UNKNOWN: "warn" };

/** Chip masalah perangkat: OFFLINE, UNKNOWN, daya cadangan. */
export function DeviceIssueChips({ s }: { s: Pick<DeviceStatus, "status" | "onBackupPower" | "powerSource" | "lastSeenAt"> }) {
  return (
    <>
      {s.status === "OFFLINE" && (
        <Chip tone="danger">
          Offline{s.lastSeenAt ? " sejak " : ""}
          {s.lastSeenAt && <RelativeTime iso={s.lastSeenAt} />}
        </Chip>
      )}
      {s.status === "UNKNOWN" && <Chip tone="warn">Belum pernah melapor</Chip>}
      {s.onBackupPower && <Chip tone="danger">Daya cadangan · {powerSourceLabel(s.powerSource)}</Chip>}
    </>
  );
}

/** "terakhir terlihat 40 dtk lalu · dianggap offline setelah 120 dtk" — timeout dari backend. */
export function LastSeen({ s }: { s: Pick<DeviceStatus, "lastSeenAt" | "offlineTimeoutSeconds"> }) {
  return (
    <span>
      {s.lastSeenAt ? <RelativeTime iso={s.lastSeenAt} prefix="terakhir terlihat " /> : "belum pernah terlihat"}
      {" · "}dianggap offline setelah {formatDuration(s.offlineTimeoutSeconds)}
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

/** Item perangkat gaya referensi: titik status, nama tebal, `#KODE • tipe`, chip peringatan. */
export function DeviceRow({ status: s, name, type, href, className }: DeviceRowProps) {
  const tone = s.onBackupPower ? "danger" : (livenessTone[s.status] ?? "neutral");
  const body = (
    <>
      <div className="flex items-start gap-2.5">
        <StatusDot tone={tone} className="mt-1.5" pulse={s.status === "UNKNOWN"} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{name ?? s.deviceCode}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            #{s.deviceCode}
            {type ? ` • ${type}` : ""}
          </p>
          <p className="mt-1 text-[11px] text-muted">
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
