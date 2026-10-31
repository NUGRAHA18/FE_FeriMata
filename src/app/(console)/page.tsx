"use client";

import { ActivityCard } from "@/components/dashboard/activity-card";
import { CultivationCard } from "@/components/dashboard/cultivation-card";
import { CameraCard } from "@/components/dashboard/camera-card";
import { ConditionsCard } from "@/components/dashboard/conditions-card";
import { ControlCard } from "@/components/dashboard/control-card";
import { DevicesCard } from "@/components/dashboard/devices-card";
import { ReadingMetricCard, SystemStatusCard, TankCard } from "@/components/dashboard/metric-tiles";
import { FirstVisitGuide } from "@/components/onboarding/guide";
import { LeafCorner } from "@/components/illustrations";
import { SectionHeader } from "@/components/ui/card";
import { AlertPill, ConnectionIndicator } from "@/components/shell/header-status";
import { useShell } from "@/components/shell/shell-context";
import { ErrorState } from "@/components/ui/skeleton";
import { soilMetricCards, soilMetricKey } from "@/config/dashboard-layout";
import { siteConfig } from "@/config/site";
import { errorMessage } from "@/lib/api/client";
import { useOverview } from "@/lib/api/queries";
import { useSession } from "@/lib/auth/use-session";

function firstName(fullName: string | null | undefined, username: string | undefined) {
  return (fullName?.trim().split(/\s+/)[0] || username || "").trim();
}

/**
 * Kepala beranda tablet/desktop: judul besar di kiri, status di kanan, rumpun daun di pojok.
 * Di ponsel kepala Beranda adalah blok hijau MobileHero (AppShell).
 */
function DashboardHeader() {
  const { alertCount, connection } = useShell();
  const user = useSession()?.user;
  const name = firstName(user?.fullName, user?.username);
  return (
    <header className="relative mb-6 hidden md:block">
      <LeafCorner className="pointer-events-none absolute -top-6 -right-6 h-36 w-52 lg:-right-8" />
      <div className="relative flex flex-wrap items-end justify-between gap-4 md:pr-40">
        <div className="min-w-0">
          <h1 className="text-[34px] leading-tight font-bold tracking-tight text-ink">{siteConfig.name}</h1>
          <p className="mt-0.5 text-[15px] text-ink-2">{name ? `Halo, ${name} — kondisi greenhouse hari ini` : "Kondisi greenhouse hari ini"}</p>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionIndicator state={connection} />
          <AlertPill count={alertCount} />
        </div>
      </div>
    </header>
  );
}

export default function DashboardPage() {
  const overview = useOverview((o) => o.system.generatedAt);
  const overviewError = overview.error;

  return (
    <>
      <DashboardHeader />
      <FirstVisitGuide />
      {/* Bila masih ada angka terakhir, banner offline di atas sudah menjelaskan masalahnya. */}
      {overviewError && overview.data === undefined && (
        <ErrorState className="mb-4" message={`Data belum bisa dimuat: ${errorMessage(overviewError)}`} />
      )}
      {/* items-start: tiap kolom setinggi isinya sendiri. Tanpa ini kartu Alat ikut memanjang setinggi
          kolom kiri dan menyisakan kotak putih kosong yang panjang di bagian bawah.
          Desktop lebar (xl): baris 1 = kondisi/kontrol/umur | Alat; baris 2 = Angka sensor selebar dua kolom
          (supaya kolom Alat tidak menyisakan ruang kosong panjang); kamera & aktivitas di kolom kanan
          sepanjang dua baris. Di bawah xl dua kolom seperti tablet; urutan mengikuti DOM. */}
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.95fr)_minmax(0,0.95fr)] xl:grid-rows-[auto_1fr]">
        <div className="flex min-w-0 flex-col gap-4 md:col-span-2 xl:col-span-1 xl:col-start-1 xl:row-start-1">
          <ConditionsCard />
          <ControlCard />
          <CultivationCard />
        </div>
        {/*
          Dua kolom di ponsel supaya angkanya besar dan terbaca; tiga kolom di tablet, empat mulai lg.
          Status alat + 7 sensor tanah mengisi baris penuh (di tiga kolom kartu status selebar dua), lalu
          tangki pupuk satu baris sendiri. Dengan begitu tidak ada sel kosong dan tidak ada kartu yang
          ikut memanjang mengikuti kartu tangki yang lebih tinggi.
        */}
        <section aria-labelledby="judul-sensor" className="min-w-0 md:col-span-2 xl:col-start-1 xl:row-start-2">
          <SectionHeader id="judul-sensor" title="Angka sensor" href="/sensors" linkLabel="Semua sensor" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            <SystemStatusCard className="sm:col-span-2 lg:col-span-1" />
            {soilMetricCards.map((m) => (
              <ReadingMetricCard key={m.suffix} metricKey={soilMetricKey(m.suffix)} label={m.label} icon={m.icon} />
            ))}
            <TankCard className="col-span-2 sm:col-span-3 lg:col-span-4" />
          </div>
        </section>
        <DevicesCard className="xl:col-start-2 xl:row-start-1" />
        <div className="flex min-w-0 flex-col gap-4 xl:col-start-3 xl:row-span-2 xl:row-start-1">
          <CameraCard />
          <ActivityCard />
        </div>
      </div>
    </>
  );
}
