"use client";

import { PicBattery, PicDevices, PicTank, pictoTile, type Picto } from "@/components/icons/pictos";
import { MetricCard, type MetricStatus } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { tankKeys } from "@/config/dashboard-layout";
import { useOverview, useReadingByMetric } from "@/lib/api/queries";
import { formatReading, formatUnit, powerSourceLabel } from "@/lib/format";
import { useConnectionState } from "@/lib/realtime/stomp";
import { cn } from "@/lib/cn";

/** Kartu angka untuk satu metric key. Tanpa data → "—" (bukan error). */
export function ReadingMetricCard({ metricKey, label, icon, compact }: { metricKey: string; label: string; icon: Picto; compact?: boolean }) {
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
 * Kartu "Alat terhubung": jumlah alat yang terhubung + sumber listrik. Kartu putih seperti yang lain;
 * kotak ikon & badge hijau bila semua terhubung & PLN, kuning bila ada yang terputus, merah bila
 * memakai baterai.
 */
export function SystemStatusCard({ compact, className }: { compact?: boolean; className?: string }) {
  const s = useOverview(selectSystem).data;
  const tone = !s ? "accent" : s.backup ? "danger" : s.issues > 0 ? "warn" : "accent";
  const status = !s ? "memuat…" : s.backup ? "Memakai baterai" : s.issues > 0 ? `${s.issues} alat terputus` : "Semua terhubung";
  return (
    <MetricCard
      label="Alat terhubung"
      icon={s?.backup ? PicBattery : PicDevices}
      value={s ? `${s.online}` : null}
      unit={s ? `dari ${s.total}` : null}
      tone={tone}
      href="/devices"
      compact={compact}
      className={className}
      status={s ? { tone: tone === "accent" ? "ok" : tone, label: status } : null}
      hint={s ? `Listrik: ${powerSourceLabel(s.power)}` : status}
    />
  );
}

/**
 * EC tangki dibanding target EC fase tanam berjalan (dari backend, mS/cm). Tanpa tanggal semai atau
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

/**
 * Float LOW drum → status air. 1 = air cukup; selain itu air rendah atau kabel putus, dan backend
 * menolak pompa air utama, pompa pupuk & pengaduk. Tanpa pembacaan → null.
 */
export function floatLowStatus(r: { value: number | null; textValue?: string | null } | null | undefined): MetricStatus | null {
  if (!r) return null;
  const raw = r.value != null ? String(r.value) : (r.textValue ?? "").trim().toUpperCase();
  const ok = raw === "1" || raw === "CLOSED" || raw === "TRUE";
  return ok ? { tone: "ok", label: "Air drum cukup" } : { tone: "danger", label: "Air drum rendah" };
}

/** EC, pH & suhu larutan di drum pupuk, plus status float LOW, dalam satu kartu. */
export function TankCard({ compact, className }: { compact?: boolean; className?: string }) {
  const ec = useReadingByMetric(tankKeys.ec);
  const ph = useReadingByMetric(tankKeys.ph);
  const temp = useReadingByMetric(tankKeys.waterTemperature);
  const level = floatLowStatus(useReadingByMetric(tankKeys.floatLowOk));
  const stale = useConnectionState() !== "connected";
  const target = useOverview((o) => {
    const p = o.cultivation?.currentPhase;
    return p ? { min: p.ecTargetMin, max: p.ecTargetMax } : null;
  }).data;
  const ecStatus = ecTargetStatus(ec, target);
  const latest = [ec, ph, temp].filter(Boolean).sort((a, b) => (a!.recordedAt < b!.recordedAt ? 1 : -1))[0];
  const ecUnit = formatUnit(ec?.unit);
  const valueCls = cn("metric-value truncate", compact ? "text-[clamp(1.375rem,17cqi,1.75rem)]" : "text-[clamp(1.5rem,19cqi,2.25rem)]");
  return (
    <section aria-label="Tangki pupuk" className={cn("@container flex min-w-0 flex-col rounded-card bg-card shadow-card ring-1 ring-line", compact ? "p-3.5" : "p-4 sm:p-5", className)}>
      <span className={cn(pictoTile, compact ? "size-10" : "size-12")}>
        <PicTank className={compact ? "size-7" : "size-8"} />
      </span>
      <p className={cn("mt-3 font-semibold text-ink-2", compact ? "text-sm" : "text-sm sm:text-[15px]")}>Tangki pupuk</p>
      <dl className={cn("tabular mt-2 grid grid-cols-1 gap-2.5 @[12rem]:grid-cols-2 @[26rem]:grid-cols-3", stale && latest && "opacity-60")}>
        <div className="min-w-0">
          <dt className="text-xs text-ink-2">Kepekatan (EC)</dt>
          <dd className="mt-1 flex flex-wrap items-baseline gap-x-1">
            <span className={valueCls}>{formatReading(ec) ?? "—"}</span>
            {ec && ecUnit && <span className="text-xs font-medium text-ink-2">{ecUnit}</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-ink-2">Keasaman (pH)</dt>
          <dd className="mt-1">
            <span className={valueCls}>{formatReading(ph) ?? "—"}</span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-ink-2">Suhu larutan</dt>
          <dd className="mt-1 flex flex-wrap items-baseline gap-x-1">
            <span className={valueCls}>{formatReading(temp) ?? "—"}</span>
            {temp && formatUnit(temp.unit) && <span className="text-xs font-medium text-ink-2">{formatUnit(temp.unit)}</span>}
          </dd>
        </div>
      </dl>
      {(ecStatus || level) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ecStatus && (
            <Badge tone={ecStatus.tone} className="text-xs">
              {ecStatus.label}
            </Badge>
          )}
          {level && (
            <span title={level.tone === "danger" ? "Air rendah atau kabel float putus — pompa air utama, pompa pupuk dan pengaduk tidak bisa dinyalakan." : undefined}>
              <Badge tone={level.tone} className="text-xs">
                {level.label}
              </Badge>
            </span>
          )}
        </div>
      )}
      <p className="mt-auto truncate pt-2 text-xs text-ink-2 sm:pt-3 sm:text-[13px]">
        {latest ? <RelativeTime iso={latest.recordedAt} prefix="diperbarui " /> : "belum ada data"}
      </p>
    </section>
  );
}
