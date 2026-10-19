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
import { useAlerts, useDevices, useOverview, useSensor, useSensorLatest } from "@/lib/api/queries";
import type { Sensor } from "@/lib/api/types";
import { formatDateTime, formatReading, formatUnit } from "@/lib/format";
import { useConnectionState } from "@/lib/realtime/stomp";
import { cn } from "@/lib/cn";

type Tab = "history" | "detail" | "device" | "activity";
const tabs: { value: Tab; label: string }[] = [
  { value: "history", label: "Riwayat" },
  { value: "detail", label: "Pengaturan" },
  { value: "device", label: "Alat" },
  { value: "activity", label: "Peringatan" },
];

function LatestValue({ sensor: s }: { sensor: Sensor }) {
  const latest = useSensorLatest(s.id);
  const stale = useConnectionState() !== "connected";
  const r = latest.data;
  const value = formatReading(r);
  const unit = formatUnit(r?.unit ?? s.unit);
  return (
    <Card className="flex flex-col items-center py-8 text-center">
      <p className="text-sm text-muted">Angka terakhir</p>
      {latest.isPending ? (
        <Skeleton className="mt-3 h-16 w-40" />
      ) : (
        <p className={cn("tabular mt-2 flex items-start text-ink", stale && r && "opacity-60")}>
          <span className="metric-value text-[72px] font-normal sm:text-[88px]">{value ?? "—"}</span>
          {value && unit && <span className="mt-2 text-3xl text-muted">{unit}</span>}
        </p>
      )}
      <p className="mt-2 text-sm text-muted">
        {r ? (
          <>
            <RelativeTime iso={r.recordedAt} prefix="dicatat " /> · {formatDateTime(r.recordedAt)}
          </>
        ) : latest.isPending ? (
          " "
        ) : (
          "Belum ada data dari sensor ini."
        )}
      </p>
      {stale && r && <p className="mt-1 text-xs text-warn-ink">Koneksi terputus — angka ini mungkin sudah lama.</p>}
    </Card>
  );
}

function DeviceTab({ sensor: s }: { sensor: Sensor }) {
  const status = useOverview((o) => o.devices.items.find((d) => d.id === s.deviceId)).data;
  const device = useDevices((list) => list.find((d) => d.id === s.deviceId)).data;
  if (!status) return <EmptyState title={`Alat ${s.deviceCode}`} hint="Status alat belum tersedia." />;
  return (
    <div className="flex flex-col gap-3">
      <DeviceRow status={status} name={device?.name} type={device?.type} href={`/devices/${s.deviceId}`} />
      {device?.description && <p className="text-sm text-ink-2">{device.description}</p>}
    </div>
  );
}

/** Peringatan yang terkait sensor ini, dari filter backend (`?sensorId=`), bukan tebakan dari overview. */
function ActivityTab({ sensor: s }: { sensor: Sensor }) {
  const q = useAlerts({ sensorId: s.id, page: 0, size: 10 });
  return (
    <div className="flex flex-col gap-3">
      {q.isPending ? (
        <Skeleton className="h-24 rounded-inner" />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : q.data.content.length ? (
        q.data.content.map((a) => <AlertItem key={a.id} alert={a} />)
      ) : (
        <EmptyState title="Tidak ada peringatan untuk sensor ini" />
      )}
      <Link href="/alerts" className="inline-flex items-center gap-1 self-start text-sm font-medium text-ink-2 hover:text-ink">
        Semua peringatan <ArrowUpRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}

export default function SensorDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const q = useSensor(id);
  const [tab, setTab] = useState<Tab>("history");
  const s = q.data;

  return (
    <>
      <PageHeader backHref="/sensors" title={s?.name ?? "Sensor"} subtitle={s?.description ?? undefined} />
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
                  {!s.enabled && <Badge tone="warn">Dimatikan</Badge>}
                  {s.autoRegistered && <Badge tone="info">Baru terdeteksi, belum diperiksa</Badge>}
                </div>
              )}
            </div>
            <Card>
              <Tabs value={tab} onChange={setTab} tabs={tabs} label="Bagian detail sensor" className="mb-4" />
              {tab === "history" && <HistoryPanel sensorId={s.id} unit={formatUnit(s.unit)} label={s.name} />}
              {tab === "detail" && (
                <div className="flex flex-col gap-5">
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-ink-2">Ubah nama atau satuan</h3>
                    <SensorEditForm key={s.id} sensor={s} />
                  </div>
                  <details className="rounded-inner bg-card-2 px-3.5 py-2 text-sm">
                    <summary className="cursor-pointer font-medium text-ink-2">Info teknis</summary>
                    <KeyValue
                      className="mt-2"
                      rows={[
                        ["Kode", <span key="c" className="font-mono">{s.code}</span>],
                        ["Metric key", <span key="m" className="font-mono">{s.metricKey}</span>],
                        ["Satuan mentah", s.unit ?? "—"],
                        ["Tipe", s.type ?? "—"],
                        ["Alat", s.deviceCode],
                        ["Diperbarui", formatDateTime(s.updatedAt)],
                      ]}
                    />
                    <h4 className="mt-3 mb-2 text-sm font-medium text-ink-2">Pemasangan (Modbus / kanal)</h4>
                    <MetadataTable metadata={s.metadata} />
                  </details>
                </div>
              )}
              {tab === "device" && <DeviceTab sensor={s} />}
              {tab === "activity" && <ActivityTab sensor={s} />}
            </Card>
          </div>
        )
      )}
    </>
  );
}
