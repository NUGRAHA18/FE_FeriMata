"use client";

import { ActivityCard } from "@/components/dashboard/activity-card";
import { CultivationCard } from "@/components/dashboard/cultivation-card";
import { CameraCard } from "@/components/dashboard/camera-card";
import { ConditionsCard } from "@/components/dashboard/conditions-card";
import { DevicesCard } from "@/components/dashboard/devices-card";
import { ReadingMetricCard, SystemStatusCard, TankCard } from "@/components/dashboard/metric-tiles";
import { GreenhouseScene, LeafCorner } from "@/components/illustrations";
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
 * Kepala beranda. Ponsel: kartu sapaan bergambar greenhouse, lalu baris status (koneksi, peringatan).
 * Desktop: judul besar di kiri, status di kanan, rumpun daun di pojok.
 */
function DashboardHeader() {
  const { alertCount, connection } = useShell();
  const user = useSession()?.user;
  const name = firstName(user?.fullName, user?.username);
  return (
    <header className="relative mb-4 md:mb-6">
      {/* Ponsel */}
      <div className="md:hidden">
        <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-accent-soft to-card px-5 py-5 pr-32 shadow-card ring-1 ring-line">
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink">{name ? `Halo, ${name}!` : siteConfig.name}</h1>
          <p className="mt-1 text-sm text-ink-2">Kondisi greenhouse hari ini</p>
          <GreenhouseScene className="absolute right-0 bottom-0 h-[92px] w-[150px]" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <ConnectionIndicator state={connection} />
          <AlertPill count={alertCount} />
        </div>
      </div>
      {/* Desktop */}
      <LeafCorner className="pointer-events-none absolute -top-6 -right-8 hidden h-36 w-52 md:block lg:-right-8" />
      <div className="relative hidden flex-wrap items-end justify-between gap-4 md:flex md:pr-40">
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
  const overviewError = useOverview((o) => o.system.generatedAt).error;

  return (
    <>
      <DashboardHeader />
      {overviewError && (
        <ErrorState className="mb-4" message={`Data belum bisa dimuat: ${errorMessage(overviewError)}`} />
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.95fr)_minmax(0,0.95fr)]">
        <div className="flex min-w-0 flex-col gap-4 md:col-span-2 lg:col-span-1">
          <ConditionsCard />
          <CultivationCard />
          {/* Dua kolom di ponsel supaya angkanya besar dan terbaca; tiga kolom mulai tablet. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <SystemStatusCard />
            {soilMetricCards.map((m) => (
              <ReadingMetricCard key={m.suffix} metricKey={soilMetricKey(m.suffix)} label={m.label} icon={m.icon} />
            ))}
            <TankCard />
          </div>
        </div>
        <DevicesCard />
        <div className="flex min-w-0 flex-col gap-4">
          <CameraCard />
          <ActivityCard />
        </div>
      </div>
    </>
  );
}
