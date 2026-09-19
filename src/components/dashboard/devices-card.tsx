"use client";

import { Cpu } from "lucide-react";
import { DeviceRow } from "@/components/devices/device-row";
import { Card, CardHeader, Inset } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { useDevices, useOverview } from "@/lib/api/queries";
import type { Device } from "@/lib/api/types";
import { cn } from "@/lib/cn";

function Summary({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="tabular mt-0.5 text-xl text-ink">{value}</p>
    </div>
  );
}

const namesOf = (list: Device[]) => Object.fromEntries(list.map((d) => [d.id, { name: d.name, type: d.type }]));

/** Kartu Perangkat: ringkasan Total/Online/Sensor/Aktuator + daftar perangkat logis. */
export function DevicesCard({ className }: { className?: string }) {
  const overview = useOverview((o) => ({
    total: o.devices.total,
    online: o.devices.online,
    sensors: o.sensors.total,
    actuators: o.actuators.length,
    items: o.devices.items,
  }));
  // Nama & tipe tidak ada di DeviceStatus — diambil dari /api/devices.
  const names = useDevices(namesOf).data;
  const d = overview.data;

  return (
    <Card className={cn("flex min-w-0 flex-col", className)}>
      <CardHeader title="Perangkat" icon={Cpu} href="/devices" hrefLabel="Buka daftar perangkat" />
      {overview.error ? (
        <ErrorState message={errorMessage(overview.error)} onRetry={() => overview.refetch()} />
      ) : !d ? (
        <>
          <Skeleton className="mb-4 h-12 w-full" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Inset key={i}>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </Inset>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-4 gap-2 px-1">
            <Summary label="Total" value={d.total} />
            <Summary label="Online" value={d.online} />
            <Summary label="Sensor" value={d.sensors} />
            <Summary label="Aktuator" value={d.actuators} />
          </div>
          <ul className="scroll-thin -mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 lg:max-h-[640px]">
            {d.items.map((s) => (
              <li key={s.id}>
                <DeviceRow status={s} name={names?.[s.id]?.name} type={names?.[s.id]?.type} href={`/devices/${s.id}`} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
