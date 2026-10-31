"use client";

import { Beaker, Plus, Save, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, TextAreaField } from "@/components/ui/input";
import { KeyValue } from "@/components/ui/key-value";
import { Segmented } from "@/components/ui/segmented";
import { ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/status";
import { TechInfo } from "@/components/ui/tech-info";
import { errorMessage } from "@/lib/api/client";
import { useCreatePumpCalibration, useDispensed, usePumpCalibrations } from "@/lib/api/queries";
import type { Actuator } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { calibrationErrorMessage, pumpFlow } from "@/lib/calibration";
import { formatDate, formatDateTime, formatDuration, formatNumber, parseDecimal } from "@/lib/format";

/*
 * Kalibrasi debit pompa peristaltik (Protokol-Data §8): jalankan pompa beberapa kali, tampung, ukur
 * volumenya. Debit = total volume / total waktu. Dari debit itu backend menghitung volume pupuk.
 */

/**
 * Pompa yang debitnya bisa dikalibrasi: flag `pumpCalibratable` dari backend (sumbernya
 * `app.calibration.pump.types`). Backend lama tanpa flag → cek tipe DOSING_PUMP.
 */
export const isCalibratablePump = (a: Pick<Actuator, "type" | "pumpCalibratable">) => a.pumpCalibratable ?? a.type === "DOSING_PUMP";

const MIN_TRIALS = 3;
const DAY = 24 * 3_600_000;
const ranges = { "24h": { label: "1 hari", ms: DAY }, "7d": { label: "7 hari", ms: 7 * DAY }, "30d": { label: "30 hari", ms: 30 * DAY } } as const;
type RangeKey = keyof typeof ranges;

function formatVolume(ml: number): string {
  return ml >= 1000 ? `${formatNumber(ml / 1000, 2)} liter` : `${formatNumber(ml, 0)} mL`;
}

function Dispensed({ actuatorId }: { actuatorId: number }) {
  const [range, setRange] = useState<RangeKey>("24h");
  const q = useDispensed(actuatorId, range, ranges[range].ms);
  const d = q.data;
  return (
    <div className="rounded-inner bg-card-2 p-3.5 ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink-2">Pupuk yang sudah keluar</p>
        <Segmented
          label="Rentang waktu"
          size="sm"
          value={range}
          onChange={setRange}
          options={(Object.keys(ranges) as RangeKey[]).map((k) => ({ value: k, label: ranges[k].label }))}
        />
      </div>
      {q.isPending ? (
        <Skeleton className="mt-3 h-10 w-40" />
      ) : q.error ? (
        <ErrorState className="mt-3" message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        d && (
          <>
            <p className="tabular mt-2 text-2xl font-semibold text-ink">{d.volumeMl != null ? formatVolume(d.volumeMl) : d.runCount ? "Belum bisa dihitung" : "0 mL"}</p>
            <p className="mt-1 text-xs text-muted">
              {d.runCount ? `${d.runCount} kali menyala, total ${formatDuration(d.totalSeconds)}.` : "Pompa tidak menyala pada rentang ini."}
              {d.uncalibratedRunCount > 0 && ` ${d.uncalibratedRunCount} kali menyala sebelum pompa diuji takarannya, tidak ikut dihitung.`}
              {d.unknownDurationRunCount > 0 && ` ${d.unknownDurationRunCount} kali tanpa lama menyala yang tercatat.`}
            </p>
          </>
        )
      )}
    </div>
  );
}

type TrialRow = { duration: string; volume: string };

function CalibrationForm({ actuatorId, onDone }: { actuatorId: number; onDone: () => void }) {
  const create = useCreatePumpCalibration(actuatorId);
  const [rows, setRows] = useState<TrialRow[]>(() => Array.from({ length: MIN_TRIALS }, () => ({ duration: "", volume: "" })));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const setRow = (i: number, patch: Partial<TrialRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  // Baris yang kosong sama sekali diabaikan; baris yang terisi harus lengkap dan > 0 (NaN/undefined > 0 bernilai false).
  const used = rows.map((r) => ({ durationSeconds: parseDecimal(r.duration), volumeMl: parseDecimal(r.volume) })).filter((t) => t.durationSeconds !== undefined || t.volumeMl !== undefined);
  const complete = used.filter((t): t is { durationSeconds: number; volumeMl: number } => t.durationSeconds! > 0 && t.volumeMl! > 0);
  const flow = pumpFlow(complete);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (complete.length !== used.length) {
      setError("Isi lama menyala dan volume dengan angka lebih dari 0 di tiap baris yang dipakai.");
      return;
    }
    if (complete.length < MIN_TRIALS) {
      setError(`Perlu paling sedikit ${MIN_TRIALS} kali ulangan.`);
      return;
    }
    setError(null);
    create.mutate({ trials: complete, notes: notes.trim() || undefined }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-inner bg-card-2 p-3.5 ring-1 ring-line" noValidate>
      <p className="text-sm text-ink-2">
        Nyalakan pompa selama waktu tertentu, tampung cairannya di gelas ukur, lalu catat volumenya. Ulangi paling sedikit {MIN_TRIALS} kali.
      </p>
      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li key={i} className="flex items-end gap-2">
            <span className="mb-3 w-6 shrink-0 text-sm text-muted">{i + 1}.</span>
            <Field label="Lama menyala" inputMode="decimal" value={r.duration} onChange={(e) => setRow(i, { duration: e.target.value })} suffix="dtk" className="min-w-0 flex-1" />
            <Field label="Volume tertampung" inputMode="decimal" value={r.volume} onChange={(e) => setRow(i, { volume: e.target.value })} suffix="mL" className="min-w-0 flex-1" />
            {rows.length > MIN_TRIALS && (
              <IconButton icon={X} label={`Hapus ulangan ${i + 1}`} size="sm" className="mb-1.5" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} />
            )}
          </li>
        ))}
      </ol>
      <Button size="sm" variant="ghost" icon={Plus} className="self-start" onClick={() => setRows((rs) => [...rs, { duration: "", volume: "" }])} disabled={rows.length >= 20}>
        Tambah ulangan
      </Button>
      {flow.flowMlPerSecond != null && (
        <p className="tabular text-sm text-ink">
          Takaran dari {flow.count} ulangan: <span className="font-semibold">{formatNumber(flow.flowMlPerSecond, 2)} mL per detik</span>
        </p>
      )}
      <TextAreaField label="Catatan" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {(error || create.error) && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
          {error ?? calibrationErrorMessage(create.error)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="soft" onClick={onDone} disabled={create.isPending}>
          Batal
        </Button>
        <Button type="submit" variant="accent" icon={Save} loading={create.isPending}>
          Simpan takaran
        </Button>
      </div>
    </form>
  );
}

export function PumpCalibrationCard({ actuator: a }: { actuator: Actuator }) {
  const canWrite = useCanWrite();
  const q = usePumpCalibrations(a.id);
  const [adding, setAdding] = useState(false);
  const current = q.data?.find((c) => c.current);

  return (
    <Card>
      <CardHeader title="Takaran pompa" icon={Beaker} />
      <div className="flex flex-col gap-4">
        {q.isPending ? (
          <Skeleton className="h-16 w-full rounded-inner" />
        ) : q.error ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : current ? (
          <div>
            <p className="tabular text-2xl font-semibold text-ink">{formatNumber(current.flowMlPerSecond, 2)} mL per detik</p>
            <p className="mt-1 text-sm text-muted">
              Diuji {formatDate(current.calibratedAt)} dengan {current.trialCount} ulangan{current.performedBy ? ` oleh ${current.performedBy}` : ""}.
            </p>
          </div>
        ) : (
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <Badge tone="warn">Belum diuji</Badge>
            Takaran pompa ini belum diuji, jadi volume pupuk yang keluar belum bisa dihitung.
          </p>
        )}
        {canWrite &&
          (adding ? (
            <CalibrationForm actuatorId={a.id} onDone={() => setAdding(false)} />
          ) : (
            <Button icon={Beaker} className="self-start" onClick={() => setAdding(true)}>
              {current ? "Uji ulang takaran" : "Uji takaran pompa"}
            </Button>
          ))}
        <Dispensed actuatorId={a.id} />
        {!!q.data?.length && (
          <TechInfo>
            {q.data.map((c) => (
              <KeyValue
                key={c.id}
                className="mt-3 border-t border-line pt-2 first:border-0"
                rows={[
                  ["Waktu uji", `${formatDateTime(c.calibratedAt)}${c.current ? " (dipakai)" : ""}`],
                  ["Debit", `${formatNumber(c.flowMlPerSecond, 3)} mL/dtk`],
                  ["Ulangan", c.trialCount],
                  ["CV debit", c.flowCvPercent != null ? `${formatNumber(c.flowCvPercent, 1)}%` : "—"],
                  ["Tegangan saat uji", c.busVoltage != null ? `${formatNumber(c.busVoltage, 1)} V` : "—"],
                  ["Catatan", c.notes ?? "—"],
                ]}
              />
            ))}
          </TechInfo>
        )}
      </div>
    </Card>
  );
}
