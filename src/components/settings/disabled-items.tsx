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
import { SensorIcon } from "@/lib/icons";

/*
 * Sensor & alat yang dimatikan tidak tampil di layar lain (backend menyaringnya). Di sini saja
 * daftarnya diambil dengan `includeDisabled`, supaya operator bisa meninjau sensor yang baru
 * terdeteksi dan mengaktifkan kembali yang perlu. Mengaktifkan dilakukan di halaman detailnya.
 */

type Item = { key: string; href: string; name: string; kind: string; isNew: boolean; icon: ReactNode };

function Row({ item }: { item: Item }) {
  return (
    <li>
      <Link
        href={item.href}
        className="flex min-h-14 items-center gap-3 rounded-inner bg-card p-3 ring-1 ring-line transition hover:bg-card-2 hover:ring-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-sunken text-ink-2">{item.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{item.name}</span>
          <span className="block truncate text-xs text-muted">{item.kind}</span>
        </span>
        <Badge tone={item.isNew ? "info" : "neutral"} dot>
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
        icon: <SensorIcon kind={s.type} aria-hidden className="size-[18px]" strokeWidth={1.8} />,
      })),
    ...(actuators.data ?? [])
      .filter((a) => !a.enabled)
      .map((a) => ({
        key: `a${a.id}`,
        href: `/actuators/${a.id}`,
        name: a.name,
        kind: actuatorTypeLabel(a.type) ?? a.code,
        isNew: false,
        icon: <EyeOff aria-hidden className="size-[18px]" strokeWidth={1.8} />,
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
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((i) => (
            <Row key={i.key} item={i} />
          ))}
        </ul>
      )}
    </Card>
  );
}
