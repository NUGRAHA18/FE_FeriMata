"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Gauge, Plug, SlidersHorizontal } from "lucide-react";
import { ReportedState } from "@/components/actuators/actuator-card";
import { DeviceIssueChips, LastSeen, livenessTone } from "@/components/devices/device-row";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { KeyValue } from "@/components/ui/key-value";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status";
import { errorMessage } from "@/lib/api/client";
import { useActuators, useDevice, useDeviceStatus, useOverview, useReadingBySensor, useSensors } from "@/lib/api/queries";
import type { Sensor } from "@/lib/api/types";
import { formatDateTime, formatReading, formatUnit, livenessLabel, powerSourceLabel } from "@/lib/format";

function SensorLine({ sensor: s }: { sensor: Sensor }) {
  const r = useReadingBySensor(s.id);
  const v = formatReading(r);
  return (
    <Link href={`/sensors/${s.id}`} className="flex items-center justify-between gap-3 rounded-inner bg-card-2 px-3.5 py-2.5 hover:ring-1 hover:ring-line">
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{s.name}</p>
        <p className="truncate font-mono text-[11px] text-muted">{s.metricKey}</p>
      </div>
      <p className="tabular shrink-0 text-sm text-ink">
        {v ?? "—"} {v && <span className="text-muted">{formatUnit(r?.unit ?? s.unit)}</span>}
      </p>
    </Link>
  );
}

export default function DeviceDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const device = useDevice(id);
  // Status realtime dari overview; fallback ke GET /devices/{id}/status.
  const live = useOverview((o) => o.devices.items.find((d) => d.id === id)).data;
  const fetched = useDeviceStatus(id);
  const status = live ?? fetched.data;
  const sensors = useSensors((list) => list.filter((s) => s.deviceId === id));
  const actuators = useActuators((list) => list.filter((a) => a.deviceId === id));
  const d = device.data;

  return (
    <>
      <PageHeader backHref="/devices" title={d?.name ?? "Perangkat"} subtitle={d ? `#${d.deviceCode}${d.type ? ` • ${d.type}` : ""}` : undefined} />
      {device.isPending ? (
        <Skeleton className="h-80 rounded-card" />
      ) : device.error ? (
        <ErrorState message={errorMessage(device.error)} onRetry={() => device.refetch()} />
      ) : (
        d && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="Liveness & daya" icon={Plug} />
              {status ? (
                <>
                  <p className="flex items-center gap-2 text-2xl text-ink">
                    <StatusDot tone={status.onBackupPower ? "danger" : (livenessTone[status.status] ?? "neutral")} className="size-2.5" />
                    {livenessLabel[status.status] ?? status.status}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    <LastSeen s={status} />
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <DeviceIssueChips s={status} />
                  </div>
                  <KeyValue
                    className="mt-4"
                    rows={[
                      ["Sumber daya", powerSourceLabel(status.powerSource)],
                      ["Daya cadangan", status.onBackupPower ? "Ya" : "Tidak"],
                      ["Sumber daya diperbarui", formatDateTime(status.powerSourceUpdatedAt)],
                      ["Terakhir terlihat", formatDateTime(status.lastSeenAt)],
                      ["Timeout offline", `${status.offlineTimeoutSeconds} dtk`],
                    ]}
                  />
                </>
              ) : fetched.error ? (
                <ErrorState message={errorMessage(fetched.error)} />
              ) : (
                <Skeleton className="h-40" />
              )}
              <h3 className="mt-5 mb-2 text-sm font-medium text-ink-2">Informasi</h3>
              <KeyValue
                rows={[
                  ["Kode", <span key="c" className="font-mono">{d.deviceCode}</span>],
                  ["Tipe", d.type ?? "—"],
                  ["Deskripsi", d.description ?? "—"],
                  ["Terdaftar", formatDateTime(d.createdAt)],
                ]}
              />
            </Card>
            <Card>
              <CardHeader title={`Sensor (${sensors.data?.length ?? 0})`} icon={Gauge} href="/sensors" hrefLabel="Semua sensor" />
              {sensors.isPending ? (
                <Skeleton className="h-40" />
              ) : sensors.error ? (
                <ErrorState message={errorMessage(sensors.error)} onRetry={() => sensors.refetch()} />
              ) : sensors.data.length ? (
                <div className="flex flex-col gap-2">
                  {sensors.data.map((s) => (
                    <SensorLine key={s.id} sensor={s} />
                  ))}
                </div>
              ) : (
                <EmptyState title="Perangkat ini tidak punya sensor" />
              )}
            </Card>
            <Card>
              <CardHeader title={`Aktuator (${actuators.data?.length ?? 0})`} icon={SlidersHorizontal} href="/actuators" hrefLabel="Kontrol aktuator" />
              {actuators.isPending ? (
                <Skeleton className="h-40" />
              ) : actuators.error ? (
                <ErrorState message={errorMessage(actuators.error)} onRetry={() => actuators.refetch()} />
              ) : actuators.data.length ? (
                <div className="flex flex-col gap-2">
                  {actuators.data.map((a) => (
                    <Link key={a.id} href={`/actuators/${a.id}`} className="flex items-center gap-3 rounded-inner bg-card-2 px-3.5 py-2.5 hover:ring-1 hover:ring-line">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{a.name}</p>
                        <p className="truncate font-mono text-[11px] text-muted">{a.code}</p>
                      </div>
                      <ReportedState actuator={a} />
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState title="Perangkat ini tidak punya aktuator" />
              )}
            </Card>
          </div>
        )
      )}
    </>
  );
}
