"use client";

import { BellOff } from "lucide-react";
import { useState } from "react";
import { AlertItem } from "@/components/alerts/alert-item";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import type { AlertFilters } from "@/lib/api/endpoints";
import { useAlerts, useOverview } from "@/lib/api/queries";
import type { AlertSeverity } from "@/lib/api/types";

type AckFilter = "open" | "acked" | "all";
type SevFilter = AlertSeverity | "ALL";

export default function AlertsPage() {
  const [ack, setAck] = useState<AckFilter>("open");
  const [sev, setSev] = useState<SevFilter>("ALL");
  const [page, setPage] = useState(0);
  const filters: AlertFilters = {
    acknowledged: ack === "all" ? undefined : ack === "acked",
    severity: sev === "ALL" ? undefined : sev,
    page,
    size: 20,
  };
  const q = useAlerts(filters);
  const counts = useOverview((o) => o.alerts).data;

  return (
    <>
      <PageHeader
        title="Peringatan"
        subtitle={counts ? `${counts.unacknowledged} belum ditangani · ${counts.critical} darurat · ${counts.warning} perlu perhatian` : undefined}
      />
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <Segmented<AckFilter>
            label="Status penanganan"
            value={ack}
            onChange={(v) => (setAck(v), setPage(0))}
            options={[
              { value: "open", label: "Belum ditangani" },
              { value: "acked", label: "Sudah ditangani" },
              { value: "all", label: "Semua" },
            ]}
          />
          <Segmented<SevFilter>
            label="Tingkat"
            value={sev}
            onChange={(v) => (setSev(v), setPage(0))}
            options={[
              { value: "ALL", label: "Semua tingkat" },
              { value: "CRITICAL", label: "Darurat" },
              { value: "WARNING", label: "Perlu perhatian" },
              { value: "INFO", label: "Info" },
            ]}
          />
        </div>
        {q.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-inner" />
            ))}
          </div>
        ) : q.error ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : !q.data.content.length ? (
          <EmptyState icon={<BellOff aria-hidden className="size-5" strokeWidth={2} />} title="Tidak ada peringatan" hint="Semua aman untuk pilihan ini." />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid gap-2 lg:grid-cols-2">
              {q.data.content.map((a) => (
                <AlertItem key={a.id} alert={a} />
              ))}
            </div>
            <Pagination page={q.data.page} totalPages={q.data.totalPages} totalElements={q.data.totalElements} onChange={setPage} busy={q.isFetching} />
          </div>
        )}
      </Card>
    </>
  );
}
