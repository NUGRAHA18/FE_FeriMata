"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { AlertItem } from "@/components/alerts/alert-item";
import { DeviceRow } from "@/components/devices/device-row";
import { HistoryPanel } from "@/components/sensors/history-panel";
import { SensorEditForm } from "@/components/sensors/sensor-edit-form";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { KeyValue, MetadataTable } from "@/components/ui/key-value";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { RelativeTime } from "@/components/ui/time";
import { errorMessage } from "@/lib/api/client";
import { useDevices, useOverview, useSensor, useSensorLatest } from "@/lib/api/queries";
import type { Sensor } from "@/lib/api/types";
import { formatDateTime, formatReading, formatUnit } from "@/lib/format";
import { useConnectionState } from "@/lib/realtime/stomp";
import { cn } from "@/lib/cn";

type Tab = "detail" | "history" | "device" | "activity";
const tabs: { value: Tab; label: string }[] = [
  { value: "detail", label: "Detail" },
  { value: "history", label: "Riwayat" },
  { value: "device", label: "Perangkat" },
  { value: "activity", label: "Aktivitas" },
];

function LatestValue({ sensor: s }: { sensor: Sensor }) {
  const latest = useSensorLatest(s.id);
  const stale = useConnectionState() !== "connected";
  const r = latest.data;
  const value = formatReading(r);
  const unit = formatUnit(r?.unit ?? s.unit);
  return (
    <Card className="flex flex-col items-center py-8 text-center">
      <p className="text-sm text-muted">Nilai terakhir</p>
      {latest.isPending ? (
        <Skeleton className="mt-3 h-16 w-40" />
      ) : (
        <p className={cn("tabular mt-2 flex items-start text-ink", stale && r && "opacity-60")}>
          <span className="metric-value text-[72px] sm:text-[88px]">{value ?? "—"}</span>
          {value && unit && <span className="mt-2 text-3xl font-light text-muted">{unit}</span>}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        {r ? (
          <>
            <RelativeTime iso={r.recordedAt} prefix="dicatat " /> · {formatDateTime(r.recordedAt)}
          </>
        ) : latest.isPending ? (
          " "
        ) : (
          "Belum ada pembacaan dari sensor ini."
        )}
      </p>
      {stale && r && <p className="mt-1 text-xs text-warn-ink">Realtime terputus — data mungkin tidak terkini.</p>}
    </Card>
  );
}

function DeviceTab({ sensor: s }: { sensor: Sensor }) {
  const status = useOverview((o) => o.devices.items.find((d) => d.id === s.deviceId)).data;
  const device = useDevices((list) => list.find((d) => d.id === s.deviceId)).data;
  if (!status) return <EmptyState title={`Perangkat ${s.deviceCode}`} hint="Status perangkat belum tersedia." />;
  return (
    <div className="flex flex-col gap-3">
      <DeviceRow status={status} name={device?.name} type={device?.type} href={`/devices/${s.deviceId}`} />
      {device?.description && <p className="text-sm text-ink-2">{device.description}</p>}
    </div>
  );
}

function ActivityTab({ sensor: s }: { sensor: Sensor }) {
  const alerts = useOverview((o) => o.alerts.active.filter((a) => a.relatedSensorId === s.id)).data ?? [];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Alert aktif yang terkait sensor ini (dari 10 alert aktif terbaru). Backend belum menyediakan filter alert per sensor.
      </p>
      {alerts.length ? alerts.map((a) => <AlertItem key={a.id} alert={a} />) : <EmptyState title="Tidak ada alert aktif untuk sensor ini" />}
      <Link href="/alerts" className="inline-flex items-center gap-1 self-start text-sm font-medium text-ink-2 hover:text-ink">
        Semua alert <ArrowUpRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}

export default function SensorDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const q = useSensor(id);
  const [tab, setTab] = useState<Tab>("detail");
  const s = q.data;

  return (
    <>
      <PageHeader backHref="/sensors" title={s?.name ?? "Sensor"} subtitle={s ? `#${s.code} • ${s.deviceCode}` : undefined} />
      {q.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-52 rounded-card" />
          <Skeleton className="h-80 rounded-card" />
        </div>
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        s && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]">
            <div className="flex flex-col gap-4">
              <LatestValue sensor={s} />
              {(s.autoRegistered || !s.enabled) && (
                <div className="flex flex-wrap gap-2">
                  {!s.enabled && <Badge tone="warn">Nonaktif</Badge>}
                  {s.autoRegistered && <Badge tone="info">Terdaftar otomatis dari telemetri</Badge>}
                </div>
              )}
            </div>
            <Card>
              <Tabs value={tab} onChange={setTab} tabs={tabs} label="Bagian detail sensor" className="mb-4" />
              {tab === "detail" && (
                <div className="flex flex-col gap-5">
                  <KeyValue
                    rows={[
                      ["Nama", s.name],
                      ["Kode", <span key="c" className="font-mono">{s.code}</span>],
                      ["Metric key", <span key="m" className="font-mono">{s.metricKey}</span>],
                      ["Satuan", s.unit ? `${formatUnit(s.unit) || s.unit} (${s.unit})` : "—"],
                      ["Tipe", s.type ?? "—"],
                      ["Perangkat", s.deviceCode],
                      ["Deskripsi", s.description ?? "—"],
                      ["Diperbarui", formatDateTime(s.updatedAt)],
                    ]}
                  />
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-ink-2">Metadata</h3>
                    <MetadataTable metadata={s.metadata} />
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-ink-2">Ubah sensor</h3>
                    <SensorEditForm key={s.id} sensor={s} />
                  </div>
                </div>
              )}
              {tab === "history" && <HistoryPanel sensorId={s.id} unit={formatUnit(s.unit)} label={s.name} />}
              {tab === "device" && <DeviceTab sensor={s} />}
              {tab === "activity" && <ActivityTab sensor={s} />}
            </Card>
          </div>
        )
      )}
    </>
  );
}
