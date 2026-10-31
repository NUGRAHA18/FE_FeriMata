"use client";

import Link from "next/link";
import { Gauge } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { inputClass } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { errorMessage } from "@/lib/api/client";
import { useDevices, useReadingBySensor, useSensors } from "@/lib/api/queries";
import type { Sensor } from "@/lib/api/types";
import { deviceNameLabel, formatNumber, formatReading, formatUnit } from "@/lib/format";
import { pictoTile, SensorPicto } from "@/components/icons/pictos";
import { useConnectionState } from "@/lib/realtime/stomp";
import { cn } from "@/lib/cn";

/** Kartu sensor: ikon jenis, nama, angka besar, kapan diperbarui. Kode teknis ada di halaman detail. */
function SensorTile({ sensor: s }: { sensor: Sensor }) {
  const r = useReadingBySensor(s.id);
  const stale = useConnectionState() !== "connected";
  const value = formatReading(r);
  const unit = formatUnit(r?.unit ?? s.unit);
  return (
    <Link
      href={`/sensors/${s.id}`}
      className={cn("flex min-w-0 flex-col rounded-inner bg-card-2 p-4 transition hover:ring-1 hover:ring-line", !s.enabled && "opacity-70")}
    >
      {/* Ikon di atas, nama selebar kartu: di ponsel dua kolom, nama di samping ikon terpotong. */}
      <span className={cn(pictoTile, "size-11 bg-card")}>
        <SensorPicto kind={s.type} className="size-7" />
      </span>
      <p className="mt-3 line-clamp-2 text-sm font-medium leading-snug text-ink">{s.name}</p>
      {(!s.enabled || s.autoRegistered) && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {!s.enabled && <Badge tone="warn">Dimatikan</Badge>}
          {s.autoRegistered && <Badge tone="info">Baru terdeteksi</Badge>}
        </div>
      )}
      <p className={cn("tabular mt-2 flex flex-wrap items-baseline gap-x-1 text-ink", stale && r && "opacity-60")}>
        <span className="metric-value text-[30px] sm:text-[40px]">{value ?? "—"}</span>
        {value && unit && <span className="text-base text-muted">{unit}</span>}
      </p>
      {r?.calibratedValue != null && (
        <p className="tabular mt-1 truncate text-xs text-ink-2">
          dikoreksi lab: {formatNumber(r.calibratedValue)}
          {unit && ` ${unit}`}
        </p>
      )}
      <p className="mt-2 truncate text-xs text-muted">{r ? <RelativeTime iso={r.recordedAt} prefix="diperbarui " /> : "belum ada data"}</p>
    </Link>
  );
}

export default function SensorsPage() {
  const q = useSensors();
  const deviceNames = useDevices((list) => Object.fromEntries(list.map((d) => [d.deviceCode, deviceNameLabel(d.name)]))).data;
  const [filter, setFilter] = useState("");
  const groups = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const map = new Map<string, Sensor[]>();
    for (const s of q.data ?? []) {
      if (f && ![s.name, s.code, s.metricKey, s.deviceCode, deviceNames?.[s.deviceCode] ?? ""].some((x) => x.toLowerCase().includes(f))) continue;
      map.set(s.deviceCode, [...(map.get(s.deviceCode) ?? []), s]);
    }
    return [...map.entries()];
  }, [q.data, filter, deviceNames]);

  return (
    <>
      <PageHeader
        title="Sensor"
        subtitle={q.data ? `${q.data.length} sensor terpasang` : undefined}
        actions={
          <input
            type="search"
            aria-label="Cari sensor"
            placeholder="Cari sensor…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={cn(inputClass, "h-11 w-full bg-card text-sm sm:w-64")}
          />
        }
      />
      {q.isPending ? (
        <Card>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-inner" />
            ))}
          </div>
        </Card>
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !groups.length ? (
        <EmptyState icon={<Gauge aria-hidden className="size-5" strokeWidth={2} />} title={filter ? "Tidak ada sensor yang cocok" : "Belum ada sensor"} />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(([device, list]) => (
            <Card key={device}>
              <h2 className="mb-3 flex items-baseline gap-2 text-base font-semibold text-ink">
                {deviceNames?.[device] ?? device} <span className="text-xs font-normal text-muted">{list.length} sensor</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {list.map((s) => (
                  <SensorTile key={s.id} sensor={s} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
