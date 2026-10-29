"use client";

import { IrrigationScheduleCard } from "@/components/actuators/irrigation-schedule";
import { PageHeader } from "@/components/shell/page-header";

/** Jadwal siram harian. Semua peran bisa membuka; hanya operator/admin yang bisa mengubah. */
export default function IrrigationPage() {
  return (
    <>
      <PageHeader title="Jadwal siram" subtitle="Pompa siram menyala sendiri setiap hari." />
      <div className="mx-auto w-full max-w-3xl">
        <IrrigationScheduleCard />
      </div>
    </>
  );
}
