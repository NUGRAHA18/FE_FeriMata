"use client";

import { BrainCircuit, ImagePlus, ScanSearch, X } from "lucide-react";
import { useRef, useState } from "react";
import { scoreLabel } from "@/components/ai/detection-parts";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Chip } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { TechInfo } from "@/components/ui/tech-info";
import { errorMessage } from "@/lib/api/client";
import type { AiDetectKind, AiHistoryKind } from "@/lib/api/endpoints";
import { useAiHistory, useAiStatus, useRunAiDetection } from "@/lib/api/queries";
import type { AiDetectionRun, AiHistoryRow } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import {
  aiInputLabels,
  aiStatusView,
  deficiencyRows,
  diseaseLabels,
  fertilizationDecision,
  irrigationDecision,
  MAX_PHOTOS,
  validatePhotos,
} from "@/lib/ai-service";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";

/** Lencana kecil status layanan AI, dengan detail teknis di title. */
export function AiStatusChip() {
  const q = useAiStatus();
  const v = aiStatusView(q.data, q.isError);
  const title = q.data
    ? [q.data.message, q.data.latencyMs != null ? `${q.data.latencyMs} ms` : null].filter(Boolean).join(" · ")
    : q.error
      ? errorMessage(q.error)
      : undefined;
  return (
    <Chip tone={v.tone === "ok" ? "ok" : v.tone === "warn" ? "warn" : "neutral"} icon={BrainCircuit} title={title} role="status">
      {v.text}
    </Chip>
  );
}

// ── Periksa daun sekarang (OPERATOR) ─────────────────────────────────────────

const kindOptions: { value: AiDetectKind; label: string }[] = [
  { value: "deficiency", label: "Kekurangan nutrisi" },
  { value: "disease", label: "Penyakit" },
];

function DetectionResult({ run }: { run: AiDetectionRun }) {
  const source = `Dari ${run.photos} foto`;
  if (run.kind === "disease") {
    const labels = diseaseLabels(run.result);
    return (
      <div className="rounded-inner bg-card-2 p-3.5 ring-1 ring-line" role="status">
        <p className="text-xs text-muted">{source}</p>
        {labels.length ? (
          <>
            <p className="mt-1 font-semibold text-warn-ink">Ditemukan tanda penyakit:</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {labels.map((l) => (
                <li key={l}>
                  <Chip tone="warn" icon={false}>
                    {l}
                  </Chip>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 font-semibold text-accent-ink">Tidak ditemukan tanda penyakit.</p>
        )}
        <p className="mt-2 text-xs text-muted">Ini dugaan dari foto, bukan kepastian. Cocokkan dengan daun di lapangan.</p>
      </div>
    );
  }
  const rows = deficiencyRows(run.result);
  return (
    <div className="rounded-inner bg-card-2 p-3.5 ring-1 ring-line" role="status">
      <p className="text-xs text-muted">{source}. Dari semua gejala yang terlihat, berapa bagian menunjukkan tiap kekurangan.</p>
      {rows.length && rows.some(([, v]) => v > 0) ? (
        <dl className="mt-2 flex flex-col gap-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <dt className="text-ink-2" title={k}>
                  {scoreLabel(k)}
                </dt>
                <dd className="tabular font-medium text-ink">{Math.round(v)}%</dd>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
                <div className="h-full rounded-full bg-ink-2" style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
              </div>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-1 font-semibold text-accent-ink">Tidak terlihat tanda kekurangan nutrisi.</p>
      )}
      <p className="mt-2 text-xs text-muted">Ini dugaan dari foto, bukan kepastian. Cocokkan dengan daun di lapangan.</p>
    </div>
  );
}

export function DetectNowCard() {
  const canWrite = useCanWrite();
  const run = useRunAiDetection();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<AiDetectKind>("deficiency");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  if (!canWrite) return null;

  const pick = (list: FileList | null) => {
    const next = [...files, ...Array.from(list ?? [])];
    const err = validatePhotos(next);
    setFileError(err);
    if (!err) setFiles(next);
    if (input.current) input.current.value = "";
  };

  return (
    <Card>
      <CardHeader title="Periksa daun sekarang" icon={ScanSearch} />
      <p className="mb-3 text-sm text-ink-2">AI memeriksa foto daun. Tanpa memilih foto, dipakai foto patroli kamera terbaru.</p>
      <div className="flex flex-col gap-3">
        <Segmented
          label="Jenis pemeriksaan"
          value={kind}
          onChange={(k) => {
            setKind(k);
            run.reset();
          }}
          options={kindOptions}
        />
        <div className="flex flex-col gap-2">
          <input ref={input} type="file" accept="image/jpeg,image/png" multiple hidden onChange={(e) => pick(e.target.files)} />
          <Button variant="soft" icon={ImagePlus} onClick={() => input.current?.click()} disabled={files.length >= MAX_PHOTOS || run.isPending} className="w-full sm:w-auto sm:self-start">
            Pilih foto sendiri (opsional)
          </Button>
          {files.length > 0 && (
            <ul className="flex flex-col gap-1">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex min-w-0 items-center gap-2 rounded-inner bg-card-2 px-3 py-1.5 text-sm ring-1 ring-line">
                  <span className="min-w-0 flex-1 truncate text-ink-2">{f.name}</span>
                  <IconButton icon={X} size="sm" label={`Buang ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))} disabled={run.isPending} />
                </li>
              ))}
            </ul>
          )}
          {fileError && (
            <p role="alert" className="text-sm text-danger-ink">
              {fileError}
            </p>
          )}
        </div>
        <Button variant="accent" size="lg" icon={ScanSearch} loading={run.isPending} onClick={() => run.mutate({ kind, images: files })} className="w-full sm:w-auto sm:self-end">
          {files.length ? `Periksa ${files.length} foto` : "Periksa foto patroli terbaru"}
        </Button>
        {run.isPending && <p className="text-sm text-muted">AI sedang memeriksa, bisa sampai satu menit…</p>}
        {run.error && (
          <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
            {(run.error as { status?: number }).status === 400 && !files.length ? "Belum ada foto patroli. Jalankan patroli kamera dulu, atau pilih foto sendiri." : errorMessage(run.error)}
          </p>
        )}
        {run.data && <DetectionResult run={run.data} />}
      </div>
    </Card>
  );
}

// ── Keputusan AI terakhir ────────────────────────────────────────────────────

function InputTable({ input }: { input: Record<string, unknown> | null }) {
  if (!input) return null;
  const entries = Object.entries(input);
  if (!entries.length) return null;
  return (
    <TechInfo className="mt-2 px-3 py-1.5 text-xs">
      <p className="mt-1.5 text-muted">Data yang dibaca AI saat memutuskan:</p>
      <dl className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-ink-2">
        {entries.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="truncate" title={k}>
              {aiInputLabels[k] ?? k}
            </dt>
            <dd className="tabular text-right">{typeof v === "number" ? (formatNumber(v, 2) ?? "—") : String(v ?? "—")}</dd>
          </div>
        ))}
      </dl>
    </TechInfo>
  );
}

function HistoryItem({ kind, row }: { kind: AiHistoryKind; row: AiHistoryRow }) {
  if (kind === "irrigation") {
    const d = irrigationDecision(row);
    return (
      <li className="rounded-inner bg-card p-3 ring-1 ring-line">
        <p className="text-xs text-muted">{formatDateTime(d.at)}</p>
        <p className="mt-0.5 font-medium text-ink">{d.seconds == null ? "—" : d.seconds <= 0 ? "Tidak perlu siram" : `Siram ${formatDuration(d.seconds)}`}</p>
        {d.hst != null && <p className="text-xs text-ink-2">Umur tanaman {d.hst} HST</p>}
        <InputTable input={d.input} />
      </li>
    );
  }
  const d = fertilizationDecision(row);
  const none = [d.n, d.p, d.k].every((x) => x == null || x <= 0);
  return (
    <li className="rounded-inner bg-card p-3 ring-1 ring-line">
      <p className="text-xs text-muted">{formatDateTime(d.at)}</p>
      <p className="tabular mt-0.5 font-medium text-ink">
        {none ? "Tidak perlu pupuk" : `N ${formatDuration(d.n)} · P ${formatDuration(d.p)} · K ${formatDuration(d.k)}`}
      </p>
      <InputTable input={d.input} />
    </li>
  );
}

/** Catatan keputusan AI (lama siram, takaran pupuk) dari layanan AI sendiri — termasuk yang tidak dijalankan backend. */
export function AiHistoryCard() {
  const [kind, setKind] = useState<AiHistoryKind>("irrigation");
  const q = useAiHistory(kind, 20);
  return (
    <Card>
      <CardHeader title="Keputusan AI terakhir" icon={BrainCircuit} />
      <Tabs
        label="Jenis keputusan"
        value={kind}
        onChange={setKind}
        tabs={[
          { value: "irrigation", label: "Lama siram" },
          { value: "fertilization", label: "Takaran pupuk" },
        ]}
        className="mb-3"
      />
      <p className="mb-3 text-xs text-muted">Catatan dari layanan AI. Keputusan bisa tercatat walau pompa tidak jadi menyala (misalnya ditolak demi keamanan).</p>
      {q.isPending ? (
        <Skeleton className="h-24 w-full rounded-inner" />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data.length ? (
        <EmptyState title="Belum ada catatan" />
      ) : (
        <ul className="scroll-thin flex max-h-[28rem] flex-col gap-2 overflow-y-auto p-px">
          {q.data.map((row, i) => (
            <HistoryItem key={typeof row.id === "string" ? row.id : i} kind={kind} row={row} />
          ))}
        </ul>
      )}
    </Card>
  );
}
