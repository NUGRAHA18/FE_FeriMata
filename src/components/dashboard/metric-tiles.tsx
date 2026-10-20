"use client";

import { Activity, BatteryWarning, Beaker, type LucideIcon } from "lucide-react";
import { MetricCard, type MetricStatus } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { tankKeys } from "@/config/dashboard-layout";
import { useOverview, useReadingByMetric } from "@/lib/api/queries";
import { formatReading, formatUnit, powerSourceLabel } from "@/lib/format";
import { useConnectionState } from "@/lib/realtime/stomp";
import { cn } from "@/lib/cn";

/** Kartu angka untuk satu metric key. Tanpa data → "—" (bukan error). */
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
      hint={r ? <RelativeTime iso={r.recordedAt} prefix="diperbarui " /> : "belum ada data"}
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
 * Kartu hero "Alat terhubung": jumlah alat yang terhubung + sumber listrik.
 * Hijau bila semua terhubung & PLN; kuning bila ada yang terputus; merah bila memakai baterai.
 */
export function SystemStatusCard({ compact }: { compact?: boolean }) {
  const s = useOverview(selectSystem).data;
  const tone = !s ? "accent" : s.backup ? "danger" : s.issues > 0 ? "warn" : "accent";
  const status = !s ? "memuat…" : s.backup ? "Memakai baterai" : s.issues > 0 ? `${s.issues} alat terputus` : "Semua alat terhubung";
  return (
    <MetricCard
      label="Alat terhubung"
      icon={s?.backup ? BatteryWarning : Activity}
      value={s ? `${s.online}` : null}
      unit={s ? `dari ${s.total}` : null}
      tone={tone}
      href="/devices"
      compact={compact}
      badge={
        s && (
          <span className="mb-1 rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
            Listrik: {powerSourceLabel(s.power)}
          </span>
        )
      }
      hint={status}
    />
  );
}

/**
 * EC tangki dibanding target EC fase tanam berjalan (dari backend, mS/cm). Tanpa siklus aktif atau
 * target → null, karena frontend tidak mengarang rentang ideal.
 */
export function ecTargetStatus(
  ec: { value: number | null; unit: string | null } | null | undefined,
  target: { min: number | null; max: number | null } | null | undefined,
): MetricStatus | null {
  if (ec?.value == null || target?.min == null || target.max == null) return null;
  const unit = ec.unit?.toLowerCase();
  const ms = unit === "us/cm" || unit === "µs/cm" ? ec.value / 1000 : unit === "ms/cm" ? ec.value : null;
  if (ms == null) return null;
  // Label pendek agar muat di kartu dua kolom; angka target ada di kartu "Umur tanaman".
  if (ms < target.min) return { tone: "warn", label: "Terlalu encer" };
  if (ms > target.max) return { tone: "danger", label: "Terlalu pekat" };
  return { tone: "ok", label: "Sesuai target" };
}

/** EC & pH tangki pupuk (flow cell) dalam satu kartu. */
export function TankCard({ compact }: { compact?: boolean }) {
  const ec = useReadingByMetric(tankKeys.ec);
  const ph = useReadingByMetric(tankKeys.ph);
  const stale = useConnectionState() !== "connected";
  const target = useOverview((o) => {
    const p = o.cultivation?.currentPhase;
    return p ? { min: p.ecTargetMin, max: p.ecTargetMax } : null;
  }).data;
  const ecStatus = ecTargetStatus(ec, target);
  const latest = [ec, ph].filter(Boolean).sort((a, b) => (a!.recordedAt < b!.recordedAt ? 1 : -1))[0];
  const ecUnit = formatUnit(ec?.unit);
  const valueCls = cn("metric-value truncate font-normal", compact ? "text-[clamp(1.375rem,6.5vw,1.75rem)]" : "text-[clamp(1.5rem,7vw,2.5rem)]");
  return (
    <section aria-label="Tangki pupuk" className={cn("flex min-w-0 flex-col rounded-card bg-card shadow-card", compact ? "p-3.5" : "p-4 sm:p-5")}>
      <span className={cn("grid shrink-0 place-items-center rounded-full bg-info-soft text-info", compact ? "size-9" : "size-10 sm:size-11")}>
        <Beaker aria-hidden className={cn(compact ? "size-[18px]" : "size-5 sm:size-[22px]")} strokeWidth={1.8} />
      </span>
      <p className={cn("mt-3 font-medium text-ink-2", compact ? "text-sm" : "text-sm sm:text-base")}>Tangki pupuk</p>
      <dl className={cn("tabular mt-2 flex flex-col gap-1.5", stale && latest && "opacity-60")}>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-sm text-ink-2">
            Kepekatan (EC)
            {ecUnit && <span className="block text-xs">{ecUnit}</span>}
          </dt>
          <dd className={valueCls}>{formatReading(ec) ?? "—"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-sm text-ink-2">Keasaman (pH)</dt>
          <dd className={valueCls}>{formatReading(ph) ?? "—"}</dd>
        </div>
      </dl>
      {ecStatus && (
        <Badge tone={ecStatus.tone} className="mt-2 self-start text-xs">
          {ecStatus.label}
        </Badge>
      )}
      <p className="mt-auto truncate pt-2 text-xs text-ink-2 sm:pt-3 sm:text-[13px]">
        {latest ? <RelativeTime iso={latest.recordedAt} prefix="diperbarui " /> : "belum ada data"}
      </p>
    </section>
  );
}
