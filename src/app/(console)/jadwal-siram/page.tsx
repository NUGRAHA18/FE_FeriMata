"use client";

import { AiServiceStatusCard } from "@/components/ai/ai-service-cards";
import { IrrigationRunsCard } from "@/components/actuators/irrigation-runs";
import { IrrigationScheduleCard } from "@/components/actuators/irrigation-schedule";
import { FertilizationCard } from "@/components/fertilization/fertilization-card";
import { FertilizationRunsCard } from "@/components/fertilization/fertilization-runs";
import { PageHeader } from "@/components/shell/page-header";

/** Jadwal siram harian + pupuk otomatis (dituang sebelum jam siram pertama pada hari pupuk).
 *  Semua peran bisa membuka; hanya operator/admin yang bisa mengubah. */
export default function IrrigationPage() {
  return (
    <>
      <PageHeader title="Siram & pupuk" subtitle="Pompa siram menyala sendiri setiap hari; pada hari pupuk, pupuk dituang dulu." />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {/* Lama siram & takaran pupuk bergantung pada AI; tampilkan statusnya paling atas. */}
        <AiServiceStatusCard />
        <IrrigationScheduleCard />
        <FertilizationCard />
        <IrrigationRunsCard />
        <FertilizationRunsCard />
      </div>
    </>
  );
}
