"use client";

import { Cpu } from "lucide-react";
import { DeviceRow } from "@/components/devices/device-row";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { useDevices, useOverview } from "@/lib/api/queries";

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card className="py-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`tabular metric-value mt-1 text-4xl ${tone ?? "text-ink"}`}>{value}</p>
    </Card>
  );
}

export default function DevicesPage() {
  const overview = useOverview((o) => o.devices);
  const devices = useDevices((list) => Object.fromEntries(list.map((d) => [d.id, d])));
  const d = overview.data;

  return (
    <>
      <PageHeader title="Perangkat" subtitle="Liveness dan sumber daya per perangkat logis." />
      {overview.isPending ? (
        <Skeleton className="h-96 rounded-card" />
      ) : overview.error ? (
        <ErrorState message={errorMessage(overview.error)} onRetry={() => overview.refetch()} />
      ) : (
        d && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Total" value={d.total} />
              <Stat label="Online" value={d.online} />
              <Stat label="Offline" value={d.offline} tone={d.offline ? "text-danger" : undefined} />
              <Stat label="Belum melapor" value={d.unknown} tone={d.unknown ? "text-warn-ink" : undefined} />
            </div>
            <Card>
              {d.items.length ? (
                <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {d.items.map((s) => (
                    <li key={s.id}>
                      <DeviceRow status={s} name={devices.data?.[s.id]?.name} type={devices.data?.[s.id]?.type} href={`/devices/${s.id}`} className="h-full" />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={<Cpu aria-hidden className="size-5 text-muted" />} title="Belum ada perangkat terdaftar" />
              )}
            </Card>
          </div>
        )
      )}
    </>
  );
}
