"use client";

import Link from "next/link";
import { ChevronRight, EyeOff } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/status";
import { errorMessage } from "@/lib/api/client";
import { useAllActuators, useAllSensors } from "@/lib/api/queries";
import { actuatorTypeLabel } from "@/lib/format";
import { ActuatorPicto, pictoTile, SensorPicto } from "@/components/icons/pictos";
import { cn } from "@/lib/cn";

// Item nonaktif disaring backend di layar lain; hanya di sini diambil dengan `includeDisabled`
// agar sensor baru terdeteksi bisa ditinjau. Pengaktifan dilakukan di halaman detail.

type Item = { key: string; href: string; name: string; kind: string; isNew: boolean; icon: ReactNode };

function Row({ item }: { item: Item }) {
  return (
    <li>
      <Link
        href={item.href}
        className="flex min-h-14 items-center gap-3 rounded-inner bg-card p-3 ring-1 ring-line transition hover:bg-card-2 hover:ring-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className={cn(pictoTile, "size-10")}>{item.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{item.name}</span>
          <span className="block truncate text-xs text-muted">{item.kind}</span>
        </span>
        {/* "Dimatikan" sudah tersirat dari judul kartu; di ponsel ruangnya dipakai untuk nama. */}
        <Badge tone={item.isNew ? "info" : "neutral"} dot className={cn("shrink-0", !item.isNew && "max-sm:hidden")}>
          {item.isNew ? "Baru terdeteksi" : "Dimatikan"}
        </Badge>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={2} />
      </Link>
    </li>
  );
}

export function DisabledItemsCard() {
  const sensors = useAllSensors();
  const actuators = useAllActuators();
  const error = sensors.error ?? actuators.error;

  const items: Item[] = [
    ...(sensors.data ?? [])
      .filter((s) => !s.enabled)
      .map((s) => ({
        key: `s${s.id}`,
        href: `/sensors/${s.id}`,
        name: s.name,
        kind: `Sensor · ${s.deviceCode}`,
        isNew: s.autoRegistered,
        icon: <SensorPicto kind={s.type} className="size-6 opacity-70" />,
      })),
    ...(actuators.data ?? [])
      .filter((a) => !a.enabled)
      .map((a) => ({
        key: `a${a.id}`,
        href: `/actuators/${a.id}`,
        name: a.name,
        kind: actuatorTypeLabel(a.type) ?? a.code,
        isNew: false,
        icon: <ActuatorPicto kind={a.type} className="size-6 opacity-70" />,
      })),
  ];

  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Sensor & alat yang dimatikan" icon={EyeOff} />
      <p className="mb-3 text-sm text-ink-2">
        Tidak tampil di halaman lain. Buka salah satu untuk memeriksanya; nyalakan lagi lewat saklar <strong>Sensor aktif</strong> atau{" "}
        <strong>Boleh dinyalakan</strong> di halamannya.
      </p>
      {sensors.isPending || actuators.isPending ? (
        <Skeleton className="h-28 w-full rounded-inner" />
      ) : error ? (
        <ErrorState
          message={errorMessage(error)}
          onRetry={() => {
            void sensors.refetch();
            void actuators.refetch();
          }}
        />
      ) : !items.length ? (
        <p className="rounded-inner bg-card-2 px-3.5 py-3 text-sm text-ink-2 ring-1 ring-line">Semua sensor dan alat sedang aktif.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((i) => (
            <Row key={i.key} item={i} />
          ))}
        </ul>
      )}
    </Card>
  );
}
