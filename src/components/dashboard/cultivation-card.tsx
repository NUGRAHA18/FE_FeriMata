"use client";

import { Sprout } from "lucide-react";
import { GardenStrip } from "@/components/illustrations";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/lib/api/queries";
import { formatDate, formatNumber } from "@/lib/format";

/** Kartu ringkas umur tanaman: HST hari ini, fase berjalan, target EC dan rasio N:P:K fase itu. */
export function CultivationCard() {
  const q = useOverview((o) => o.cultivation ?? null);
  const c = q.data;
  const phase = c?.currentPhase ?? null;
  return (
    <Card className="@container overflow-hidden pb-20 sm:pb-24">
      <GardenStrip className="absolute inset-x-0 bottom-0 h-24 w-full" />
      <CardHeader title="Umur tanaman" icon={Sprout} href="/cultivation" hrefLabel="Buka halaman tanaman" />
      {q.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : !c ? (
        <p className="text-sm text-ink-2">Belum ada siklus tanam yang aktif. Buka halaman Tanaman untuk mencatat tanggal tanam.</p>
      ) : (
        <div className="relative grid grid-cols-2 gap-x-4 gap-y-4 @2xl:grid-cols-4 @2xl:gap-0 @2xl:divide-x @2xl:divide-line @2xl:[&>div]:px-4 @2xl:[&>div:first-child]:pl-0">
          <div>
            <p className="text-sm text-ink-2">Hari setelah tanam</p>
            <p className="tabular metric-value mt-1 text-[40px] text-ink">
              {c.hst} <span className="text-base font-medium text-ink-2">HST</span>
            </p>
            <p className="mt-0.5 text-xs text-ink-2">tanam {formatDate(c.transplantDate)}</p>
          </div>
          <div>
            <p className="text-sm text-ink-2">Fase sekarang</p>
            <p className="mt-1 text-xl font-bold text-ink">{phase ? phase.name : "—"}</p>
            {c.nextPhase && c.daysUntilNextPhase != null && (
              <p className="mt-0.5 text-xs text-ink-2">
                {c.daysUntilNextPhase} hari lagi ke {c.nextPhase.name}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-ink-2">Target kepekatan pupuk (EC)</p>
            <p className="tabular mt-1 text-xl font-semibold text-ink">
              {phase && phase.ecTargetMin != null && phase.ecTargetMax != null
                ? `${formatNumber(phase.ecTargetMin, 2)}–${formatNumber(phase.ecTargetMax, 2)} mS/cm`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-ink-2">Perbandingan N : P : K</p>
            <p className="tabular mt-1 text-xl font-semibold text-ink">
              {phase && phase.ratioN != null && phase.ratioP != null && phase.ratioK != null
                ? `${formatNumber(phase.ratioN, 1)} : ${formatNumber(phase.ratioP, 1)} : ${formatNumber(phase.ratioK, 1)}`
                : "—"}
            </p>
            <p className="mt-0.5 text-xs text-ink-2">
              {c.treatmentPlantCount} tanaman perlakuan dari {c.plantCount}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
