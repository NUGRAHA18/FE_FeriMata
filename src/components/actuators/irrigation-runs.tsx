"use client";

import { History } from "lucide-react";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { StatusDot, type Tone } from "@/components/ui/status";
import { TechInfo } from "@/components/ui/tech-info";
import { errorMessage } from "@/lib/api/client";
import { useIrrigationRuns } from "@/lib/api/queries";
import type { IrrigationRun } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { groupRunsByDay, irrigationRunView, isIrrigationRunPending, runDayLabel } from "@/lib/irrigation";
import { useNow } from "@/lib/use-now";

const toneText: Record<Tone, string> = { ok: "text-accent-ink", warn: "text-warn-ink", danger: "text-danger-ink", info: "text-info-ink", neutral: "text-ink-2" };

function RunTech({ run }: { run: IrrigationRun }) {
  return (
    <TechInfo className="mt-2 px-3 py-1.5 text-xs">
      <p className="mt-1.5 font-mono break-words text-ink-2">
        <span className="block">
          #{run.id} · {run.result}
          {run.commandStatus ? ` · command ${run.commandStatus}` : ""}
          {run.durationSeconds != null ? ` · ${run.durationSeconds} s` : ""}
          {run.irrigationScheduleId != null ? ` · irrigationScheduleId ${run.irrigationScheduleId}` : " · jadwal sudah dihapus"}
        </span>
        {run.reasonCode && <span className="block">{run.reasonCode}</span>}
        {run.message && <span className="block">{run.message}</span>}
        {run.commandUid && <span className="block">{run.commandUid}</span>}
        {run.commandFailureCode && <span className="block">{run.commandFailureCode}</span>}
        {run.commandError && <span className="block">{run.commandError}</span>}
        <span className="block">Dicatat {formatDateTime(run.recordedAt)}</span>
      </p>
    </TechInfo>
  );
}

function RunItem({ run }: { run: IrrigationRun }) {
  const v = irrigationRunView(run);
  return (
    <li className="flex min-w-0 items-start gap-3 rounded-inner bg-card p-3 ring-1 ring-line">
      <span className="tabular w-12 shrink-0 text-lg leading-6 font-semibold text-ink">{run.time}</span>
      <div className="min-w-0 flex-1">
        <p className="flex items-start gap-1.5 text-sm leading-6">
          <StatusDot tone={v.tone} pulse={isIrrigationRunPending(run)} className="mt-2" />
          <span className={cn("font-medium", toneText[v.tone])}>{v.text}</span>
        </p>
        {v.detail && <p className="mt-0.5 text-xs text-ink-2">{v.detail}</p>}
        <RunTech run={run} />
      </div>
    </li>
  );
}

/** Riwayat siram terjadwal per hari, terbaru di atas, termasuk yang dibatalkan, gagal, dan terlewat. */
export function IrrigationRunsCard() {
  const [page, setPage] = useState(0);
  const q = useIrrigationRuns(page);
  const now = useNow();
  return (
    <Card>
      <CardHeader title="Riwayat siram" icon={History} />
      {q.isPending ? (
        <Skeleton className="h-24 w-full rounded-inner" />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data.content.length ? (
        <EmptyState title="Belum ada riwayat siram" hint="Catatan muncul di sini setelah jam siram pertama berjalan." />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted">Satu catatan untuk tiap jam siram, termasuk yang dibatalkan, gagal, atau terlewat.</p>
          {groupRunsByDay(q.data.content).map((g) => (
            <div key={g.date}>
              <h3 className="mb-1.5 text-xs font-semibold text-ink-2">{runDayLabel(g.date, now || undefined)}</h3>
              <ul className="flex flex-col gap-2">
                {g.runs.map((r) => (
                  <RunItem key={r.id} run={r} />
                ))}
              </ul>
            </div>
          ))}
          <Pagination page={q.data.page} totalPages={q.data.totalPages} totalElements={q.data.totalElements} onChange={setPage} busy={q.isFetching} />
        </div>
      )}
    </Card>
  );
}
