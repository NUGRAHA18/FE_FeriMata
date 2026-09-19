"use client";

import { useState } from "react";
import { Badge, type Tone } from "@/components/ui/status";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { useActuatorCommands } from "@/lib/api/queries";
import { commandStatusLabel, formatDateTime, formatDuration, sourceLabel } from "@/lib/format";

const statusTone: Record<string, Tone> = { EXECUTED: "ok", FAILED: "danger", SENT: "info", PENDING: "neutral", CANCELLED: "neutral" };
const shortStatus: Record<string, string> = { ...commandStatusLabel, SENT: "Terkirim" };

/** Tabel riwayat perintah berhalaman. Halaman pertama diperbarui realtime dari event. */
export function CommandHistory({ actuatorId }: { actuatorId: number }) {
  const [page, setPage] = useState(0);
  const q = useActuatorCommands(actuatorId, page, 20);

  if (q.isPending) return <Skeleton className="h-48 w-full rounded-inner" />;
  if (q.error) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data.content.length) return <EmptyState title="Belum ada perintah" hint="Riwayat perintah aktuator ini akan muncul di sini." />;

  return (
    <div className="flex flex-col gap-3">
      <div className="scroll-thin overflow-x-auto rounded-inner bg-card-2">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line">
              <th className="px-3.5 py-2.5 font-medium">Waktu diminta</th>
              <th className="px-3.5 py-2.5 font-medium">Perintah</th>
              <th className="px-3.5 py-2.5 font-medium">Status</th>
              <th className="px-3.5 py-2.5 font-medium">Sumber</th>
              <th className="px-3.5 py-2.5 font-medium">Dijalankan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {q.data.content.map((c) => {
              const d = typeof c.parameters?.durationSeconds === "number" ? c.parameters.durationSeconds : null;
              return (
                <tr key={c.id} className="align-top">
                  <td className="tabular px-3.5 py-2.5 whitespace-nowrap text-ink-2">{formatDateTime(c.requestedAt)}</td>
                  <td className="px-3.5 py-2.5">
                    <span className="font-medium text-ink">{c.commandType}</span>
                    {d != null && <span className="text-muted"> · {formatDuration(d)}</span>}
                    <p className="font-mono text-[11px] text-muted">{c.commandUid}</p>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Badge tone={statusTone[c.status] ?? "neutral"}>{shortStatus[c.status] ?? c.status}</Badge>
                    {c.errorMessage && <p className="mt-1 max-w-56 text-xs text-danger-ink">{c.errorMessage}</p>}
                  </td>
                  <td className="px-3.5 py-2.5 text-ink-2">{c.requestedBy ?? sourceLabel[c.source] ?? c.source}</td>
                  <td className="tabular px-3.5 py-2.5 whitespace-nowrap text-ink-2">{c.executedAt ? formatDateTime(c.executedAt) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={q.data.page} totalPages={q.data.totalPages} totalElements={q.data.totalElements} onChange={setPage} busy={q.isFetching} />
    </div>
  );
}
