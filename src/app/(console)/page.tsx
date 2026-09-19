"use client";

import { ActivityCard } from "@/components/dashboard/activity-card";
import { CameraCard } from "@/components/dashboard/camera-card";
import { ConditionsCard } from "@/components/dashboard/conditions-card";
import { DevicesCard } from "@/components/dashboard/devices-card";
import { ReadingMetricCard, SystemStatusCard, TankCard } from "@/components/dashboard/metric-tiles";
import { PageHeader } from "@/components/shell/page-header";
import { ErrorState } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { plotMetricKey, plots, soilMetricCards, type PlotId } from "@/config/dashboard-layout";
import { siteConfig } from "@/config/site";
import { errorMessage } from "@/lib/api/client";
import { useOverview } from "@/lib/api/queries";
import { useLocalChoice } from "@/lib/local-state";

const plotIds = plots.map((p) => p.id);

export default function DashboardPage() {
  const [plot, setPlot] = useLocalChoice<PlotId>("fertimata.plot", plotIds, "a");
  const overviewError = useOverview((o) => o.system.generatedAt).error;

  return (
    <>
      <PageHeader
        title={siteConfig.name}
        actions={
          <Select label="Pilih plot" id="plot" value={plot} onChange={(e) => setPlot(e.target.value as PlotId)} wrapperClassName="w-full sm:w-auto" className="w-full">
            {plots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        }
      />
      {overviewError && (
        <ErrorState className="mb-4" message={`Gagal memuat ringkasan dashboard: ${errorMessage(overviewError)}`} />
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.95fr)_minmax(0,0.95fr)]">
        <div className="flex min-w-0 flex-col gap-4 md:col-span-2 lg:col-span-1">
          <ConditionsCard plot={plot} onPlotChange={setPlot} />
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <SystemStatusCard />
            {soilMetricCards.map((m) => (
              <ReadingMetricCard key={`${plot}-${m.suffix}`} metricKey={plotMetricKey(plot, m.suffix)} label={m.label} icon={m.icon} />
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
