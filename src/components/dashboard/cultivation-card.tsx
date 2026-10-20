"use client";

import { Sprout } from "lucide-react";
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
    <Card>
      <CardHeader title="Umur tanaman" icon={Sprout} href="/cultivation" hrefLabel="Buka halaman tanaman" />
      {q.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : !c ? (
        <p className="text-sm text-muted">Belum ada siklus tanam yang aktif. Buka halaman Tanaman untuk mencatat tanggal tanam.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted">Hari setelah tanam</p>
            <p className="tabular metric-value mt-1 text-[38px] font-normal text-ink">
              {c.hst} <span className="text-base text-muted">HST</span>
            </p>
            <p className="mt-0.5 text-xs text-muted">tanam {formatDate(c.transplantDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted">Fase sekarang</p>
            <p className="mt-1 text-xl font-medium text-ink">{phase ? phase.name : "—"}</p>
            {c.nextPhase && c.daysUntilNextPhase != null && (
              <p className="mt-0.5 text-xs text-muted">
                {c.daysUntilNextPhase} hari lagi ke {c.nextPhase.name}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted">Target kepekatan pupuk (EC)</p>
            <p className="tabular mt-1 text-xl font-medium text-ink">
              {phase && phase.ecTargetMin != null && phase.ecTargetMax != null
                ? `${formatNumber(phase.ecTargetMin, 2)}–${formatNumber(phase.ecTargetMax, 2)} mS/cm`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Perbandingan N : P : K</p>
            <p className="tabular mt-1 text-xl font-medium text-ink">
              {phase && phase.ratioN != null && phase.ratioP != null && phase.ratioK != null
                ? `${formatNumber(phase.ratioN, 1)} : ${formatNumber(phase.ratioP, 1)} : ${formatNumber(phase.ratioK, 1)}`
                : "—"}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {c.treatmentPlantCount} tanaman perlakuan dari {c.plantCount}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
