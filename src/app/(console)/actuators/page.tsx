"use client";

import { ChevronDown, ToggleRight, Wrench } from "lucide-react";
import { ActuatorCard } from "@/components/actuators/actuator-card";
import { DeviceIssueChips, livenessTone } from "@/components/devices/device-row";
import { PageHeader } from "@/components/shell/page-header";
import { TrolleyControl } from "@/components/trolley/trolley-control";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status";
import { trolleyCardCodes, trolleyServiceCodes } from "@/config/dashboard-layout";
import { errorMessage } from "@/lib/api/client";
import { useActuators, useDevices, useOverview } from "@/lib/api/queries";
import type { Actuator } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { deviceNameLabel, livenessLabel } from "@/lib/format";

const serviceCodes: readonly string[] = trolleyServiceCodes;

function groupByDevice(list: Actuator[]) {
  const groups = new Map<string, Actuator[]>();
  for (const a of list) groups.set(a.deviceCode, [...(groups.get(a.deviceCode) ?? []), a]);
  return [...groups.entries()];
}

/** Relay mentah kereta (R2 jalan, R3 arah): hanya untuk teknisi saat servis, tertutup secara bawaan. */
function TrolleyService({ list }: { list: Actuator[] }) {
  if (!list.length) return null;
  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-control text-base font-semibold text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
          <span className="flex items-center gap-2.5">
            <Wrench aria-hidden className="size-5 text-muted" strokeWidth={2} />
            Servis kereta kamera (untuk teknisi)
          </span>
          <ChevronDown aria-hidden className="size-5 text-muted transition-transform group-open:rotate-180" />
        </summary>
        <p className="mt-3 mb-3 rounded-inner bg-warn-soft px-3.5 py-2.5 text-sm text-warn-ink">
          Saklar langsung motor kereta. Atur arah dulu, baru nyalakan jalan. Untuk pemakaian biasa gunakan kartu Kereta kamera di atas.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((a) => (
            <ActuatorCard key={a.id} actuator={a} />
          ))}
        </div>
      </details>
    </Card>
  );
}

export default function ActuatorsPage() {
  const q = useActuators();
  const devices = useOverview((o) => Object.fromEntries(o.devices.items.map((d) => [d.deviceCode, d]))).data;
  const names = useDevices((list) => Object.fromEntries(list.map((d) => [d.deviceCode, deviceNameLabel(d.name)]))).data;
  const canWrite = useCanWrite();

  const all = q.data ?? [];
  const service = all.filter((a) => serviceCodes.includes(a.code));
  const regular = all.filter((a) => !serviceCodes.includes(a.code) && !trolleyCardCodes.includes(a.code));

  return (
    <>
      <PageHeader
        title={canWrite ? "Kontrol" : "Status perangkat"}
        subtitle={canWrite ? "Nyalakan atau matikan perangkat." : "Status perangkat (hanya melihat)."}
      />
      {q.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-5 w-40" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-40 rounded-inner" />
                <Skeleton className="h-40 rounded-inner" />
              </div>
            </Card>
          ))}
        </div>
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !all.length ? (
        <EmptyState icon={<ToggleRight aria-hidden className="size-5" strokeWidth={2} />} title="Belum ada perangkat yang bisa dikendalikan" />
      ) : (
        <div className="flex flex-col gap-4">
          <TrolleyControl />
          {groupByDevice(regular).map(([code, list]) => {
            const d = devices?.[code];
            return (
              <Card key={code}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-semibold text-ink">{names?.[code] ?? code}</h2>
                    {d && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                        <StatusDot tone={d.onBackupPower ? "danger" : (livenessTone[d.status] ?? "neutral")} />
                        {livenessLabel[d.status] ?? d.status}
                      </span>
                    )}
                  </div>
                  {d && (d.status !== "ONLINE" || d.onBackupPower) && (
                    <div className="flex flex-wrap gap-1.5">
                      <DeviceIssueChips s={d} />
                    </div>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((a) => (
                    <ActuatorCard key={a.id} actuator={a} />
                  ))}
                </div>
              </Card>
            );
          })}
          <TrolleyService list={service} />
        </div>
      )}
    </>
  );
}
