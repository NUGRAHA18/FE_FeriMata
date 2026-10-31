"use client";

import Link from "next/link";
import { ChevronRight, Cpu } from "lucide-react";
import { DeviceRow } from "@/components/devices/device-row";
import { Card, CardHeader, Inset } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { useDevices, useOverview } from "@/lib/api/queries";
import type { Device, DeviceStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";

function Summary({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs leading-tight text-ink-2">{label}</p>
      <p className="tabular mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

const DEVICE_PREVIEW = 6;

/** Terputus / memakai baterai dulu, lalu belum pernah terhubung, lalu yang sehat; urutan asli dipertahankan. */
function byProblem(items: DeviceStatus[]): DeviceStatus[] {
  const rank = (s: DeviceStatus) => (s.status === "OFFLINE" || s.onBackupPower ? 0 : s.status === "UNKNOWN" ? 1 : 2);
  return [...items].sort((a, b) => rank(a) - rank(b));
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
    <Card mobileBare className={cn("@container flex min-w-0 flex-col", className)}>
      <CardHeader mobileSection title="Alat" icon={Cpu} href="/devices" hrefLabel="Buka daftar alat" />
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
          {/* Kartu sempit (tablet, kolom tengah): 2×2 supaya label tidak bertabrakan; lebar: 4 sejajar. */}
          {/* Ponsel (tanpa kartu pembungkus): ringkasan jadi satu strip putih sendiri. */}
          <div className="mb-3 grid grid-cols-2 items-end gap-x-4 gap-y-3 px-1 @[22rem]:grid-cols-4 md:mb-4 max-md:rounded-inner max-md:bg-card max-md:p-3.5 max-md:shadow-card max-md:ring-1 max-md:ring-line">
            <Summary label="Alat" value={d.total} />
            <Summary label="Terhubung" value={d.online} />
            <Summary label="Sensor" value={d.sensors} />
            <Summary label="Bisa dikendalikan" value={d.actuators} />
          </div>
          {/* Tanpa area gulir di dalam kartu: alat bermasalah dulu, maksimal DEVICE_PREVIEW, sisanya di halaman Alat. */}
          <ul className="flex flex-col gap-2">
            {byProblem(d.items)
              .slice(0, DEVICE_PREVIEW)
              .map((s) => (
                <li key={s.id}>
                  <DeviceRow status={s} name={names?.[s.id]?.name} type={names?.[s.id]?.type} href={`/devices/${s.id}`} />
                </li>
              ))}
          </ul>
          {d.items.length > DEVICE_PREVIEW && (
            <Link
              href="/devices"
              className="mt-3 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control text-sm font-semibold text-accent-ink transition hover:bg-accent-soft"
            >
              Lihat semua alat ({d.items.length}) <ChevronRight aria-hidden className="size-4" />
            </Link>
          )}
        </>
      )}
    </Card>
  );
}
