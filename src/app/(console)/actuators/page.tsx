"use client";

import { Camera, ToggleRight } from "lucide-react";
import { ActuatorCard } from "@/components/actuators/actuator-card";
import { useTrolleyStation } from "@/components/dashboard/conditions-card";
import { DeviceIssueChips, livenessTone } from "@/components/devices/device-row";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status";
import { trolleyActuatorCodes } from "@/config/dashboard-layout";
import { errorMessage } from "@/lib/api/client";
import { useActuators, useDevices, useOverview } from "@/lib/api/queries";
import type { Actuator } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { livenessLabel, stationLabel } from "@/lib/format";

function groupByDevice(list: Actuator[]) {
  const groups = new Map<string, Actuator[]>();
  for (const a of list) groups.set(a.deviceCode, [...(groups.get(a.deviceCode) ?? []), a]);
  return [...groups.entries()];
}

function TrolleyNote() {
  const station = useTrolleyStation();
  return (
    <p className="mb-3 flex items-start gap-2 rounded-inner bg-info-soft px-3.5 py-2.5 text-sm text-info">
      <Camera aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>Kereta kamera sekarang {stationLabel(station)}.</span>
    </p>
  );
}

export default function ActuatorsPage() {
  const q = useActuators();
  const devices = useOverview((o) => Object.fromEntries(o.devices.items.map((d) => [d.deviceCode, d]))).data;
  const names = useDevices((list) => Object.fromEntries(list.map((d) => [d.deviceCode, d.name]))).data;
  const canWrite = useCanWrite();

  return (
    <>
      <PageHeader
        title={canWrite ? "Kontrol" : "Status alat"}
        subtitle={canWrite ? "Nyalakan atau matikan pompa, lampu, dan kereta kamera." : "Status pompa, lampu, dan kereta kamera. Akun Anda hanya bisa melihat."}
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
      ) : !q.data.length ? (
        <EmptyState icon={<ToggleRight aria-hidden className="size-5 text-muted" />} title="Belum ada alat yang bisa dikendalikan" />
      ) : (
        <div className="flex flex-col gap-4">
          {groupByDevice(q.data).map(([code, list]) => {
            const d = devices?.[code];
            return (
              <Card key={code}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-medium text-ink">{names?.[code] ?? code}</h2>
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
                {list.some((a) => trolleyActuatorCodes.includes(a.code)) && <TrolleyNote />}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((a) => (
                    <ActuatorCard key={a.id} actuator={a} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
