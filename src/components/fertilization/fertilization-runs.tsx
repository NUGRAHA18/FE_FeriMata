"use client";

import { History } from "lucide-react";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Badge, type Tone } from "@/components/ui/status";
import { TechInfo } from "@/components/ui/tech-info";
import { errorMessage } from "@/lib/api/client";
import { useFertilizationRuns } from "@/lib/api/queries";
import type { FertilizationRun } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDuration, formatTime } from "@/lib/format";
import { doseSummary, doses, formatFarmDate, runStatusLabel, runView } from "@/lib/fertilization";
import { StageProgress } from "./fertilization-card";

const toneText: Record<Tone, string> = { ok: "text-accent-ink", warn: "text-warn-ink", danger: "text-danger-ink", info: "text-info-ink", neutral: "text-ink-2" };

const aiSeconds = (v: number | null) => (v == null ? "—" : `${Math.round(v * 10) / 10} dtk`);

function RunTech({ run }: { run: FertilizationRun }) {
  const uids: [string, string | null][] = [
    ["stirrer", run.stirrerCommandUid],
    ["N", run.nitrogenCommandUid],
    ["P", run.phosphorusCommandUid],
    ["K", run.potassiumCommandUid],
  ];
  return (
    <TechInfo className="mt-2 px-3 py-1.5 text-xs">
      <table className="mt-2 w-full text-left text-ink-2">
        <thead className="text-muted">
          <tr>
            <th className="py-0.5 font-medium">Pompa</th>
            <th className="py-0.5 font-medium">Diminta AI</th>
            <th className="py-0.5 font-medium">Dikirim</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {doses(run).map((d) => (
            <tr key={d.key}>
              <td className="py-0.5">{d.label}</td>
              <td className="py-0.5">{aiSeconds(d.aiSeconds)}</td>
              <td className="py-0.5">{d.seconds == null ? "—" : `${d.seconds} dtk`}</td>
            </tr>
          ))}
          <tr>
            <td className="py-0.5">Pengaduk</td>
            <td className="py-0.5">—</td>
            <td className="py-0.5">{run.stirrerSeconds == null ? "—" : `${run.stirrerSeconds} dtk`}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 font-mono break-words text-ink-2">
        <span className="block">
          #{run.id} · {run.status}
          {run.step ? ` · step ${run.step}` : ""}
          {run.intervalDays != null ? ` · interval ${run.intervalDays}d` : ""}
          {run.irrigationScheduleId != null ? ` · irrigationScheduleId ${run.irrigationScheduleId}` : ""}
        </span>
        {run.reasonCode && <span className="block">{run.reasonCode}</span>}
        {run.message && <span className="block">{run.message}</span>}
        {uids
          .filter(([, uid]) => uid)
          .map(([k, uid]) => (
            <span key={k} className="block">
              {k}: {uid}
            </span>
          ))}
      </p>
    </TechInfo>
  );
}

function RunItem({ run }: { run: FertilizationRun }) {
  const v = runView(run);
  const dose = run.status === "DONE" || run.status === "PARTIAL" || run.status === "IN_PROGRESS" ? doseSummary(run) : null;
  // Hanya bila pompa benar-benar jalan; SKIPPED/FAILED tidak punya "lama" yang berarti.
  const took = dose && run.startedAt && run.finishedAt ? (Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000 : null;
  return (
    <li className="min-w-0 rounded-inner bg-card p-3 ring-1 ring-line">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-semibold text-ink">
          {formatFarmDate(run.runDate)}
          {run.startedAt && <span className="ml-1.5 text-sm font-normal text-muted">{formatTime(run.startedAt)}</span>}
        </p>
        <Badge tone={v.tone} dot>
          {runStatusLabel[run.status] ?? run.status}
        </Badge>
      </div>
      <p className={cn("mt-1 text-sm font-medium", toneText[v.tone])}>{v.text}</p>
      {dose && <p className="tabular mt-0.5 text-xs text-ink-2">Takaran: {dose}</p>}
      {took != null && took > 0 && <p className="mt-0.5 text-xs text-muted">Lama seluruhnya {formatDuration(took)}</p>}
      {v.detail && run.status !== "IN_PROGRESS" && <p className="mt-1 text-xs text-ink-2">{v.detail}</p>}
      {run.status === "IN_PROGRESS" && <StageProgress run={run} className="mt-3" />}
      <RunTech run={run} />
    </li>
  );
}

/** Riwayat pemupukan, terbaru di atas, termasuk yang dilewati dan gagal. */
export function FertilizationRunsCard() {
  const [page, setPage] = useState(0);
  const q = useFertilizationRuns(page);
  return (
    <Card>
      <CardHeader title="Riwayat pupuk" icon={History} />
      {q.isPending ? (
        <Skeleton className="h-24 w-full rounded-inner" />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data.content.length ? (
        <EmptyState title="Belum pernah dipupuk otomatis" hint="Catatan muncul di sini setelah hari pupuk pertama." />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted">Takaran = lama tiap pompa pupuk menyala.</p>
          <ul className="flex flex-col gap-2">
            {q.data.content.map((r) => (
              <RunItem key={r.id} run={r} />
            ))}
          </ul>
          <Pagination page={q.data.page} totalPages={q.data.totalPages} totalElements={q.data.totalElements} onChange={setPage} busy={q.isFetching} />
        </div>
      )}
    </Card>
  );
}
