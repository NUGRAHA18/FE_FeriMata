"use client";

import { Calculator, FlaskConical, Plus, Save, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ExportButton } from "@/components/ui/export-button";
import { Field, Switch, TextAreaField } from "@/components/ui/input";
import { KeyValue } from "@/components/ui/key-value";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/status";
import { TechInfo } from "@/components/ui/tech-info";
import { ApiRequestError, errorMessage } from "@/lib/api/client";
import { exportCalibrationSamplesCsv } from "@/lib/api/endpoints";
import {
  useAddCalibrationSample,
  useAddDriftCheck,
  useCalibrationSamples,
  useCreateSensorCalibration,
  useDeleteCalibrationSample,
  useDriftChecks,
  useFitCalibration,
  useSensorCalibrations,
} from "@/lib/api/queries";
import type { CalibrationSample, Sensor, SensorCalibration } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { calibrationErrorMessage, formatEquation, localInputToIso, nowLocalInput } from "@/lib/calibration";
import { csvFilename } from "@/lib/csv";
import { formatDate, formatDateTime, formatNumber, parseDecimal } from "@/lib/format";
import { serverCsv } from "@/lib/reports";

/*
 * Tab "Kalibrasi" di detail sensor (Protokol-Data §7): sampel tanah diukur di lab berpasangan dengan
 * angka sensor saat itu, lalu backend menghitung model koreksi. Pelihat hanya membaca.
 */

const fmt = (n: number | null | undefined, unit = "") => (n == null ? "—" : `${formatNumber(n)}${unit ? ` ${unit}` : ""}`);

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-2">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function FitStats({ c, unit }: { c: SensorCalibration; unit: string }) {
  return (
    <KeyValue
      className="mt-2"
      rows={[
        ["Rumus", <span key="e" className="font-mono text-xs">{formatEquation(c)}</span>],
        ["Metode", c.method],
        ["Jumlah sampel", c.sampleCount ?? "—"],
        ["R²", formatNumber(c.rSquared, 3) ?? "—"],
        ["RMSE", fmt(c.rmse, unit)],
        ["MAE", fmt(c.mae, unit)],
        ["Bias (Bland-Altman)", fmt(c.bias, unit)],
        ["Batas kesesuaian 95%", c.loaLower != null && c.loaUpper != null ? `${formatNumber(c.loaLower)} s/d ${formatNumber(c.loaUpper)} ${unit}` : "—"],
      ]}
    />
  );
}

/** Ringkasan kalibrasi yang berlaku sekarang, dengan bahasa sehari-hari. */
function CurrentCalibration({ sensor, unit }: { sensor: Sensor; unit: string }) {
  const q = useSensorCalibrations(sensor.id);
  if (q.isPending) return <Skeleton className="h-20 w-full rounded-inner" />;
  if (q.error) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const current = q.data.find((c) => c.current);
  return (
    <div className="rounded-inner bg-card-2 p-3.5 text-sm ring-1 ring-line">
      {current ? (
        <>
          <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
            <Badge tone="ok">Sudah dikalibrasi</Badge>
            <span>sejak {formatDate(current.validFrom)}</span>
          </p>
          <p className="mt-1.5 text-ink-2">
            Angka sensor ini dikoreksi dengan hasil uji lab{current.sampleCount ? ` dari ${current.sampleCount} sampel` : ""}.
            {current.mae != null && ` Rata-rata selisih dengan lab sekitar ${fmt(current.mae, unit)}.`}
          </p>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 font-medium text-ink">
            <Badge tone="neutral">Belum dikalibrasi</Badge>
          </p>
          <p className="mt-1.5 text-ink-2">Angka yang tampil adalah angka mentah dari sensor. Kumpulkan sampel lab di bawah untuk mengoreksinya.</p>
        </>
      )}
      {q.data.length > 0 && (
        <TechInfo className="mt-3 bg-card">
          {q.data.map((c) => (
            <div key={c.id ?? "preview"} className="mt-3 border-t border-line pt-2 first:border-0">
              <p className="text-xs text-muted">
                Berlaku {formatDateTime(c.validFrom)}
                {c.current && " · dipakai sekarang"}
                {c.createdBy && ` · ${c.createdBy}`}
              </p>
              <FitStats c={c} unit={unit} />
              {c.notes && <p className="mt-1 text-xs text-ink-2">{c.notes}</p>}
            </div>
          ))}
        </TechInfo>
      )}
    </div>
  );
}

function SampleForm({ sensor, unit, onDone }: { sensor: Sensor; unit: string; onDone: () => void }) {
  const add = useAddCalibrationSample(sensor.id);
  const [f, setF] = useState({ sampledAt: nowLocalInput(), labValue: "", sensorValue: "", labMethod: "", sampleCode: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const lab = parseDecimal(f.labValue);
    const raw = parseDecimal(f.sensorValue);
    const errs: Record<string, string> = {};
    if (lab === undefined || Number.isNaN(lab)) errs.labValue = "Isi angka hasil lab.";
    if (raw !== undefined && Number.isNaN(raw)) errs.sensorValue = "Isi angka, atau kosongkan.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    add.mutate(
      {
        sampledAt: localInputToIso(f.sampledAt),
        labValue: lab!,
        sensorValue: raw,
        labMethod: f.labMethod.trim() || undefined,
        sampleCode: f.sampleCode.trim() || undefined,
        notes: f.notes.trim() || undefined,
      },
      { onSuccess: onDone, onError: (err) => err instanceof ApiRequestError && setErrors(err.fieldErrors()) },
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-inner bg-card-2 p-3.5 ring-1 ring-line sm:grid-cols-2" noValidate>
      <Field label="Waktu sampel tanah diambil" type="datetime-local" value={f.sampledAt} onChange={(e) => set({ sampledAt: e.target.value })} error={errors.sampledAt} />
      <Field label="Hasil lab" inputMode="decimal" value={f.labValue} onChange={(e) => set({ labValue: e.target.value })} suffix={unit} error={errors.labValue} required />
      <Field
        label="Angka sensor saat itu"
        inputMode="decimal"
        value={f.sensorValue}
        onChange={(e) => set({ sensorValue: e.target.value })}
        suffix={unit}
        error={errors.sensorValue}
        hint="Kosongkan: diambil otomatis dari angka sensor pada waktu itu."
      />
      <Field label="Metode lab" value={f.labMethod} onChange={(e) => set({ labMethod: e.target.value })} placeholder="Kjeldahl" error={errors.labMethod} />
      <Field label="Kode sampel" value={f.sampleCode} onChange={(e) => set({ sampleCode: e.target.value })} placeholder="LAB-2026-031" error={errors.sampleCode} />
      <TextAreaField label="Catatan" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      {add.error && !Object.keys(errors).length && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink sm:col-span-2">
          {calibrationErrorMessage(add.error)}
        </p>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="soft" onClick={onDone} disabled={add.isPending}>
          Batal
        </Button>
        <Button type="submit" variant="accent" icon={Save} loading={add.isPending}>
          Simpan sampel
        </Button>
      </div>
    </form>
  );
}

function Samples({ sensor, unit }: { sensor: Sensor; unit: string }) {
  const canWrite = useCanWrite();
  const q = useCalibrationSamples(sensor.id);
  const del = useDeleteCalibrationSample(sensor.id);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<CalibrationSample | null>(null);

  return (
    <Section
      title="Sampel lab"
      action={
        canWrite &&
        !adding && (
          <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
            Tambah sampel
          </Button>
        )
      }
    >
      {adding && <SampleForm sensor={sensor} unit={unit} onDone={() => setAdding(false)} />}
      {q.isPending ? (
        <Skeleton className="h-24 w-full rounded-inner" />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data.length ? (
        <EmptyState title="Belum ada sampel lab" hint="Ambil sampel tanah di dekat sensor, catat waktunya, lalu masukkan hasil lab-nya di sini." />
      ) : (
        <>
          <div className="scroll-thin max-h-80 overflow-auto rounded-inner bg-card-2 ring-1 ring-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card-2 text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="px-3.5 py-2 text-left font-medium">Waktu (WIB)</th>
                  <th className="px-3.5 py-2 text-right font-medium">Sensor</th>
                  <th className="px-3.5 py-2 text-right font-medium">Lab</th>
                  <th className="px-3.5 py-2 text-left font-medium">Keterangan</th>
                  {canWrite && <th className="w-10" aria-label="Hapus" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {q.data.map((s) => (
                  <tr key={s.id}>
                    <td className="tabular px-3.5 py-2 text-ink-2">{formatDateTime(s.sampledAt)}</td>
                    <td className="tabular px-3.5 py-2 text-right text-ink">{fmt(s.sensorValue)}</td>
                    <td className="tabular px-3.5 py-2 text-right text-ink">{fmt(s.labValue)}</td>
                    <td className="px-3.5 py-2 text-xs text-muted">{[s.sampleCode, s.labMethod, s.notes].filter(Boolean).join(" · ") || "—"}</td>
                    {canWrite && (
                      <td className="px-1 py-1">
                        <IconButton icon={Trash2} label={`Hapus sampel ${formatDateTime(s.sampledAt)}`} size="sm" onClick={() => setDeleting(s)} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ExportButton
            label="Unduh sampel lab (CSV)"
            run={(signal) => serverCsv(exportCalibrationSamplesCsv(sensor.id, signal))}
            filename={() => csvFilename("sampel-kalibrasi", sensor.code)}
          />
        </>
      )}
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && del.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        pending={del.isPending}
        error={deleting && del.error ? errorMessage(del.error) : null}
        tone="danger"
        title="Hapus sampel lab ini?"
        confirmLabel="Hapus"
      >
        {deleting && `Sampel ${formatDateTime(deleting.sampledAt)} (lab ${fmt(deleting.labValue, unit)}) akan dihapus. Kalibrasi yang sudah disimpan tidak berubah.`}
      </ConfirmDialog>
    </Section>
  );
}

/** Hitung model dari sampel lab: pratinjau dulu, simpan bila hasilnya masuk akal. */
function Fit({ sensor, unit }: { sensor: Sensor; unit: string }) {
  const fit = useFitCalibration(sensor.id);
  const manual = useCreateSensorCalibration(sensor.id);
  const [covariates, setCovariates] = useState("");
  const [preview, setPreview] = useState<SensorCalibration | null>(null);
  const [saved, setSaved] = useState(false);
  const [m, setM] = useState({ intercept: "", slope: "" });
  const covariateKeys = covariates
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  function run(save: boolean) {
    setSaved(false);
    fit.mutate(
      { covariateKeys: covariateKeys.length ? covariateKeys : undefined, save },
      {
        onSuccess: (c) => {
          setPreview(save ? null : c);
          setSaved(save);
        },
      },
    );
  }

  function submitManual(e: FormEvent) {
    e.preventDefault();
    const intercept = parseDecimal(m.intercept);
    const slope = parseDecimal(m.slope);
    if (intercept === undefined || slope === undefined || Number.isNaN(intercept) || Number.isNaN(slope)) return;
    manual.mutate({ intercept, slope, notes: "Dimasukkan manual" }, { onSuccess: () => setM({ intercept: "", slope: "" }) });
  }

  return (
    <Section title="Hitung kalibrasi">
      <p className="text-sm text-ink-2">Setelah ada beberapa sampel lab, hitung koreksinya. Periksa hasilnya dulu, baru simpan.</p>
      <div className="flex flex-wrap gap-2">
        <Button icon={Calculator} onClick={() => run(false)} loading={fit.isPending && !fit.variables?.save}>
          Hitung dari sampel lab
        </Button>
        {preview && (
          <Button variant="accent" icon={Save} onClick={() => run(true)} loading={fit.isPending && !!fit.variables?.save}>
            Simpan & pakai
          </Button>
        )}
      </div>
      {fit.error && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
          {calibrationErrorMessage(fit.error)}
        </p>
      )}
      {saved && <p className="text-sm text-accent">Tersimpan. Angka baru dari sensor ini akan dikoreksi.</p>}
      {preview && (
        <div className="rounded-inner bg-card-2 p-3.5 text-sm ring-1 ring-line">
          <p className="text-ink">
            Hasil hitungan dari {preview.sampleCount ?? "?"} sampel
            {preview.mae != null && <>: rata-rata selisih dengan lab sekitar {fmt(preview.mae, unit)}</>}.
          </p>
          <p className="mt-1 text-xs text-muted">Belum disimpan. Tekan “Simpan & pakai” untuk memakainya.</p>
          <TechInfo className="mt-3 bg-card">
            <FitStats c={preview} unit={unit} />
          </TechInfo>
        </div>
      )}
      <TechInfo>
        <Field
          className="mt-3"
          label="Kovariat (opsional)"
          value={covariates}
          onChange={(e) => setCovariates(e.target.value)}
          placeholder="soil.a.moisture, soil.a.temperature"
          hint="Metric key dipisah koma, maks. 5. Dipakai sebagai regresi berganda (Protokol §7 langkah 4)."
        />
        <form onSubmit={submitManual} className="mt-4 flex flex-col gap-3" noValidate>
          <p className="text-sm font-medium text-ink-2">Masukkan model dari luar (R / SPSS)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Intersep" inputMode="decimal" value={m.intercept} onChange={(e) => setM((x) => ({ ...x, intercept: e.target.value }))} />
            <Field label="Kemiringan (slope)" inputMode="decimal" value={m.slope} onChange={(e) => setM((x) => ({ ...x, slope: e.target.value }))} />
          </div>
          {manual.error && <p className="text-xs text-danger-ink">{calibrationErrorMessage(manual.error)}</p>}
          {manual.isSuccess && <p className="text-xs text-accent">Model tersimpan.</p>}
          <Button type="submit" size="sm" variant="dark" icon={Save} loading={manual.isPending} className="self-end" disabled={!m.intercept.trim() || !m.slope.trim()}>
            Simpan model
          </Button>
        </form>
      </TechInfo>
    </Section>
  );
}

function DriftForm({ sensor, unit, onDone }: { sensor: Sensor; unit: string; onDone: () => void }) {
  const add = useAddDriftCheck(sensor.id);
  const [f, setF] = useState({ standardName: "", referenceValue: "", measuredValue: "", notes: "" });
  const [cleaned, setCleaned] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const ref = parseDecimal(f.referenceValue);
    const measured = parseDecimal(f.measuredValue);
    const errs: Record<string, string> = {};
    if (!f.standardName.trim()) errs.standardName = "Isi nama larutan standar.";
    if (ref === undefined || Number.isNaN(ref)) errs.referenceValue = "Isi angka larutan standar.";
    if (measured !== undefined && Number.isNaN(measured)) errs.measuredValue = "Isi angka, atau kosongkan.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    add.mutate(
      { standardName: f.standardName.trim(), referenceValue: ref!, measuredValue: measured, probeCleaned: cleaned, notes: f.notes.trim() || undefined },
      { onSuccess: onDone, onError: (err) => err instanceof ApiRequestError && setErrors(err.fieldErrors()) },
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-inner bg-card-2 p-3.5 ring-1 ring-line sm:grid-cols-3" noValidate>
      <Field label="Larutan standar" value={f.standardName} onChange={(e) => set({ standardName: e.target.value })} placeholder="EC 1413 µS/cm" error={errors.standardName} />
      <Field label="Angka larutan standar" inputMode="decimal" value={f.referenceValue} onChange={(e) => set({ referenceValue: e.target.value })} suffix={unit} error={errors.referenceValue} />
      <Field
        label="Angka terbaca sensor"
        inputMode="decimal"
        value={f.measuredValue}
        onChange={(e) => set({ measuredValue: e.target.value })}
        suffix={unit}
        error={errors.measuredValue}
        hint="Kosongkan: pakai angka terakhir sensor."
      />
      <div className="flex items-center justify-between gap-3 sm:col-span-3">
        <span className="text-sm text-ink-2">Ujung sensor sudah dibersihkan</span>
        <Switch checked={cleaned} onChange={setCleaned} label="Ujung sensor sudah dibersihkan" />
      </div>
      <TextAreaField label="Catatan" value={f.notes} onChange={(e) => set({ notes: e.target.value })} className="sm:col-span-3" />
      {add.error && !Object.keys(errors).length && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink sm:col-span-3">
          {calibrationErrorMessage(add.error)}
        </p>
      )}
      <div className="flex justify-end gap-2 sm:col-span-3">
        <Button variant="soft" onClick={onDone} disabled={add.isPending}>
          Batal
        </Button>
        <Button type="submit" variant="accent" icon={Save} loading={add.isPending}>
          Simpan cek
        </Button>
      </div>
    </form>
  );
}

/** Cek berkala di larutan standar (Protokol §7 langkah 6): seberapa jauh sensor bergeser. */
function DriftChecks({ sensor, unit }: { sensor: Sensor; unit: string }) {
  const canWrite = useCanWrite();
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const q = useDriftChecks(sensor.id, page);

  return (
    <Section
      title="Cek di larutan standar"
      action={
        canWrite &&
        !adding && (
          <Button size="sm" icon={FlaskConical} onClick={() => setAdding(true)}>
            Catat cek
          </Button>
        )
      }
    >
      {adding && <DriftForm sensor={sensor} unit={unit} onDone={() => setAdding(false)} />}
      {q.isPending ? (
        <Skeleton className="h-16 w-full rounded-inner" />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data.content.length ? (
        <EmptyState title="Belum pernah dicek" hint="Celupkan sensor ke larutan standar secara berkala untuk melihat apakah angkanya bergeser." />
      ) : (
        <>
          <ol className="flex flex-col gap-2">
            {q.data.content.map((d) => (
              <li key={d.id} className="rounded-inner bg-card-2 p-3 text-sm ring-1 ring-line">
                <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-ink">
                  <span className="font-medium">{d.standardName}</span>
                  <span className="text-xs text-muted">
                    {formatDateTime(d.checkedAt)}
                    {d.performedBy ? ` · ${d.performedBy}` : ""}
                  </span>
                </p>
                <p className="tabular mt-1 text-ink-2">
                  Standar {fmt(d.referenceValue, unit)} · terbaca {fmt(d.measuredValue, unit)}
                  {d.deviationPercent != null && ` · selisih ${formatNumber(d.deviationPercent, 1)}%`}
                </p>
                {(d.notes || !d.probeCleaned) && (
                  <p className="mt-1 text-xs text-muted">{[!d.probeCleaned && "ujung sensor belum dibersihkan", d.notes].filter(Boolean).join(" · ")}</p>
                )}
              </li>
            ))}
          </ol>
          <Pagination page={page} totalPages={q.data.totalPages} totalElements={q.data.totalElements} onChange={setPage} busy={q.isFetching} />
        </>
      )}
    </Section>
  );
}

export function CalibrationPanel({ sensor, unit }: { sensor: Sensor; unit: string }) {
  const canWrite = useCanWrite();
  return (
    <div className="flex flex-col gap-6">
      <CurrentCalibration sensor={sensor} unit={unit} />
      <Samples sensor={sensor} unit={unit} />
      {canWrite && <Fit sensor={sensor} unit={unit} />}
      <DriftChecks sensor={sensor} unit={unit} />
    </div>
  );
}
