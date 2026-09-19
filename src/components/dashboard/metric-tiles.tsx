"use client";

import { Activity, BatteryWarning, Beaker, type LucideIcon } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { RelativeTime } from "@/components/ui/time";
import { tankKeys } from "@/config/dashboard-layout";
import { useOverview, useReadingByMetric } from "@/lib/api/queries";
import { formatReading, formatUnit, powerSourceLabel } from "@/lib/format";
import { useConnectionState } from "@/lib/realtime/stomp";
import { cn } from "@/lib/cn";

/** Kartu metrik untuk satu metric key. Tanpa data → "—" (bukan error). */
export function ReadingMetricCard({ metricKey, label, icon, compact }: { metricKey: string; label: string; icon: LucideIcon; compact?: boolean }) {
  const r = useReadingByMetric(metricKey);
  const stale = useConnectionState() !== "connected";
  return (
    <MetricCard
      label={label}
      icon={icon}
      value={formatReading(r)}
      unit={formatUnit(r?.unit)}
      href={r ? `/sensors/${r.sensorId}` : "/sensors"}
      stale={stale && !!r}
      compact={compact}
      hint={
        r ? (
          <>
            <RelativeTime iso={r.recordedAt} prefix="diperbarui " />
            <span className="hidden sm:inline"> · {r.sensorCode}</span>
          </>
        ) : (
          "belum ada data"
        )
      }
    />
  );
}

type SystemState = { online: number; total: number; issues: number; backup: boolean; power: string | null };

function selectSystem(o: {
  devices: { online: number; total: number; items: { status: string; onBackupPower: boolean; powerSource: string | null; deviceCode: string }[] };
}): SystemState {
  const items = o.devices.items;
  const reporter = items.find((d) => d.onBackupPower) ?? items.find((d) => d.powerSource) ?? null;
  return {
    online: o.devices.online,
    total: o.devices.total,
    issues: items.filter((d) => d.status !== "ONLINE").length,
    backup: items.some((d) => d.onBackupPower),
    power: reporter?.powerSource ?? null,
  };
}

/**
 * Kartu hero "Status Sistem": online/total perangkat + sumber daya.
 * Hijau bila semua online & PLN; amber bila ada OFFLINE/UNKNOWN; merah bila daya cadangan.
 */
export function SystemStatusCard({ compact }: { compact?: boolean }) {
  const s = useOverview(selectSystem).data;
  const tone = !s ? "accent" : s.backup ? "danger" : s.issues > 0 ? "warn" : "accent";
  const status = !s ? "memuat…" : s.backup ? "Daya cadangan aktif" : s.issues > 0 ? `${s.issues} bermasalah` : "Semua online";
  return (
    <MetricCard
      label="Status Sistem"
      icon={s?.backup ? BatteryWarning : Activity}
      value={s ? `${s.online}` : null}
      unit={s ? `/${s.total}` : null}
      tone={tone}
      href="/devices"
      compact={compact}
      badge={
        s && (
          <span className="mb-1 rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
            {powerSourceLabel(s.power)}
          </span>
        )
      }
      hint={status}
    />
  );
}

/** EC & pH tangki mixing (flow cell) dalam satu kartu. */
export function TankCard({ compact }: { compact?: boolean }) {
  const ec = useReadingByMetric(tankKeys.ec);
  const ph = useReadingByMetric(tankKeys.ph);
  const stale = useConnectionState() !== "connected";
  const latest = [ec, ph].filter(Boolean).sort((a, b) => (a!.recordedAt < b!.recordedAt ? 1 : -1))[0];
  const ecUnit = formatUnit(ec?.unit);
  return (
    <section aria-label="Tangki nutrisi" className={cn("flex min-w-0 flex-col rounded-card bg-card shadow-card", compact ? "p-3" : "p-3 sm:p-5")}>
      <Beaker aria-hidden className="mt-1 size-4 text-ink-2 sm:size-[18px]" strokeWidth={1.5} />
      <p className={cn("mt-2 font-medium text-ink-2", compact ? "text-xs" : "text-xs sm:text-sm")}>Tangki nutrisi</p>
      <dl className={cn("tabular flex flex-col gap-1", compact ? "mt-2" : "mt-2 sm:mt-3", stale && latest && "opacity-60")}>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-muted">
            EC{ecUnit && <span className="block text-[10px]">{ecUnit}</span>}
          </dt>
          <dd className={cn("metric-value truncate", compact ? "text-xl" : "text-xl sm:text-3xl")}>{formatReading(ec) ?? "—"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-muted">pH</dt>
          <dd className={cn("metric-value truncate", compact ? "text-xl" : "text-xl sm:text-3xl")}>{formatReading(ph) ?? "—"}</dd>
        </div>
      </dl>
      <p className="mt-auto truncate pt-2 text-[11px] text-muted sm:pt-3 sm:text-xs">
        {latest ? <RelativeTime iso={latest.recordedAt} prefix="diperbarui " /> : "belum ada data"}
      </p>
    </section>
  );
}
