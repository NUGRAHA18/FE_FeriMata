"use client";

import { Pencil, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { TechInfo } from "@/components/ui/tech-info";
import { BigInput } from "@/components/ui/time-input";
import { errorMessage } from "@/lib/api/client";
import { useFertilizationDose, useSetFertilizationDose } from "@/lib/api/queries";
import type { FertilizationDose } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { doseErrorMessage, formatMl, mlSummary, mlText, parseMl } from "@/lib/fertilization";

/* Takaran pupuk hybrid (BE ≥ 4 Nov 2026): bawaan AI; petani boleh mengisi mililiter N/P/K sendiri.
 * Backend mengubah ml ke detik dengan debit pompa hasil takar; EC/pH drum basi tetap menahan pupuk. */

type Mode = "AI" | "MANUAL";
type Key = "N" | "P" | "K";
const KEYS: Key[] = ["N", "P", "K"];
const LABEL: Record<Key, string> = { N: "Nitrogen (N)", P: "Fosfor (P)", K: "Kalium (K)" };

function stored(d: FertilizationDose, k: Key) {
  return k === "N" ? d.nitrogenMl : k === "P" ? d.phosphorusMl : d.potassiumMl;
}

function DoseForm({ dose, onDone }: { dose: FertilizationDose; onDone: () => void }) {
  const set = useSetFertilizationDose();
  const [mode, setMode] = useState<Mode>(dose.mode === "MANUAL" ? "MANUAL" : "AI");
  const [text, setText] = useState<Record<Key, string>>({ N: mlText(dose.nitrogenMl), P: mlText(dose.phosphorusMl), K: mlText(dose.potassiumMl) });
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const pump = (k: Key) => dose.pumps.find((p) => p.nutrient === k);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === "AI") return set.mutate({ mode: "AI" }, { onSuccess: onDone });
    const next: Partial<Record<Key, string>> = {};
    const value: Partial<Record<Key, number>> = {};
    for (const k of KEYS) {
      const p = parseMl(text[k]);
      if (!p.ok) next[k] = p.error;
      else {
        const max = pump(k)?.maxMl;
        if (p.value > 0 && pump(k)?.flowMlPerSecond == null) next[k] = "Pompa ini belum ditakar debitnya. Isi 0, atau takar dulu.";
        else if (max != null && p.value > max) next[k] = `Paling banyak ${formatMl(max)} sekali pupuk.`;
        value[k] = p.value;
      }
    }
    if (!Object.keys(next).length && KEYS.every((k) => value[k] === 0)) next.N = "Isi paling tidak satu takaran lebih dari 0.";
    setErrors(next);
    if (Object.keys(next).length) return;
    set.mutate({ mode: "MANUAL", nitrogenMl: value.N, phosphorusMl: value.P, potassiumMl: value.K }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-inner bg-card p-3.5 ring-1 ring-line sm:p-4" noValidate>
      <Segmented
        label="Takaran pupuk"
        value={mode}
        onChange={(m) => (setMode(m), setErrors({}), set.reset())}
        options={[
          { value: "AI", label: "Otomatis (AI)" },
          { value: "MANUAL", label: "Atur sendiri" },
        ]}
        className="self-start"
      />
      {mode === "AI" ? (
        <p className="text-sm text-ink-2">AI menghitung takaran N, P, dan K dari kondisi tanah dan foto daun pada hari pupuk.</p>
      ) : (
        <>
          <p className="text-sm text-ink-2">Isi berapa mililiter tiap pupuk dituang setiap kali memupuk. Isi 0 bila unsur itu tidak perlu.</p>
          {KEYS.map((k) => {
            const p = pump(k);
            const uncalibrated = p?.flowMlPerSecond == null;
            return (
              <BigInput
                key={k}
                label={LABEL[k]}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={text[k]}
                onChange={(e) => (setText((t) => ({ ...t, [k]: e.target.value.replace(/[^\d.,]/g, "") })), setErrors((x) => ({ ...x, [k]: undefined })))}
                suffix="ml"
                error={errors[k]}
                hint={
                  uncalibrated
                    ? "Pompa ini belum ditakar debitnya, jadi hanya bisa 0. Takar di kartu Takaran pompa."
                    : p?.maxMl != null
                      ? `Paling banyak ${formatMl(p.maxMl)} sekali pupuk.`
                      : undefined
                }
              />
            );
          })}
          <p className="text-xs text-muted">Pupuk tetap tidak dituang bila angka EC dan pH drum sudah lama.</p>
        </>
      )}
      {set.error && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
          {doseErrorMessage(set.error)}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="soft" size="lg" onClick={onDone} disabled={set.isPending} className="w-full sm:w-auto">
          Batal
        </Button>
        <Button type="submit" variant="accent" size="lg" icon={Save} loading={set.isPending} className="w-full sm:w-auto">
          Simpan takaran
        </Button>
      </div>
    </form>
  );
}

/** Baris "Takaran" di kartu pupuk otomatis + tombol Ubah takaran. */
export function DoseSection() {
  const canWrite = useCanWrite();
  const q = useFertilizationDose();
  const [editing, setEditing] = useState(false);

  if (q.isPending) return <Skeleton className="mt-3 h-12 w-full rounded-inner" />;
  if (q.error) return <p className="mt-3 text-sm text-danger-ink">Takaran pupuk tidak bisa dibaca: {errorMessage(q.error)}</p>;
  const d = q.data;
  if (editing) {
    return (
      <div className="mt-3">
        <DoseForm dose={d} onDone={() => setEditing(false)} />
      </div>
    );
  }
  const manual = d.mode === "MANUAL";
  return (
    <div className="mt-3 rounded-inner bg-sunken px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-muted">Takaran</p>
          <p className="font-medium text-ink">{manual ? "Atur sendiri" : "Otomatis (AI)"}</p>
          {manual && <p className="tabular text-sm text-ink-2">{mlSummary(stored(d, "N"), stored(d, "P"), stored(d, "K")) ?? "—"}</p>}
        </div>
        {canWrite && (
          <Button variant="soft" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
            Ubah takaran
          </Button>
        )}
      </div>
      {(d.updatedBy || d.pumps.length > 0) && (
        <TechInfo className="mt-2 px-3 py-1.5 text-xs">
          <p className="mt-1.5 font-mono break-words text-ink-2">
            {d.updatedBy && <span className="block">updatedBy: {d.updatedBy}</span>}
            {d.pumps.map((p) => (
              <span key={p.nutrient} className="block">
                {p.actuatorCode}: flow {p.flowMlPerSecond ?? "—"} ml/s, maxMl {p.maxMl ?? "—"}
                {p.available ? "" : " (unavailable)"}
              </span>
            ))}
          </p>
        </TechInfo>
      )}
    </div>
  );
}
