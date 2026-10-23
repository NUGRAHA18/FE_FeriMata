"use client";

import { CalendarDays, ClipboardList, Plus, Save, Sprout } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Inset } from "@/components/ui/card";
import { ExportButton } from "@/components/ui/export-button";
import { Field, TextAreaField } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { errorMessage } from "@/lib/api/client";
import type { PhaseInput, PlantInput } from "@/lib/api/endpoints";
import { useAddObservation, useCreateCycle, useCreatePlant, useCycleToday, useObservations, usePlants, usePutPhases } from "@/lib/api/queries";
import type { CycleToday, GrowthPhase, Plant } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { csvFilename } from "@/lib/csv";
import { formatDate, formatDateTime, formatNumber, formatUnit } from "@/lib/format";
import { cn } from "@/lib/cn";
import { exportObservations } from "@/lib/reports";

/* ── Label domain penelitian (Protokol-Data.md §2, §6) ─────────────────────── */

const treatments: { value: string; label: string; hint: string }[] = [
  { value: "K0", label: "K0 · Kontrol", hint: "pupuk lengkap" },
  { value: "N-", label: "N− · Kurang Nitrogen", hint: "N 20%" },
  { value: "P-", label: "P− · Kurang Fosfor", hint: "P 20%" },
  { value: "K-", label: "K− · Kurang Kalium", hint: "K 20%" },
];
const treatmentLabel = (code: string | null) => 
  treatments.find((t) => t.value === code)?.label ?? (code ? code : "Tanaman biasa");
const treatmentTone: Record<string, "ok" | "warn" | "danger" | "info" | "neutral"> = { K0: "ok", "N-": "warn", "P-": "info", "K-": "danger" };
const comparisonLabel: Record<string, string> = { 
  FERTIMATA: "Sistem FertiMata", 
  SIMONKORI: "Sistem lama (SimonKori)", 
  NONE: "—" 
};

const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

/* ── Siklus: buat baru ─────────────────────────────────────────────────────── */

function NewCycleForm() {
  const create = useCreateCycle();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [variety, setVariety] = useState("");
  const [transplantDate, setTransplantDate] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate({ code: code.trim(), name: name.trim() || code.trim(), variety: variety.trim() || undefined, transplantDate });
  }

  return (
    <Card>
      <CardHeader title="Mulai siklus tanam" icon={CalendarDays} />
      <p className="mb-4 text-sm text-ink-2">
        Belum ada siklus tanam aktif. Isi tanggal tanam (transplant) supaya aplikasi bisa menghitung umur tanaman (HST) dan fase pertumbuhan. Fase bawaan
        dibuat otomatis dan bisa diubah setelahnya.
      </p>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Kode siklus" value={code} onChange={(e) => setCode(e.target.value)} placeholder="MT-2026-09" required hint="Huruf, angka, titik, strip." />
        <Field label="Nama" value={name} onChange={(e) => setName(e.target.value)} placeholder="Musim tanam September 2026" />
        <Field label="Varietas (opsional)" value={variety} onChange={(e) => setVariety(e.target.value)} placeholder="Melon netted" />
        <Field label="Tanggal tanam" type="date" value={transplantDate} onChange={(e) => setTransplantDate(e.target.value)} required />
        {create.error && (
          <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink sm:col-span-2">
            {errorMessage(create.error)}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" variant="accent" size="lg" icon={Sprout} loading={create.isPending} disabled={!code.trim() || !transplantDate}>
            Mulai siklus
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ── Siklus aktif: ringkasan + fase ────────────────────────────────────────── */

function PhaseEditor({ cycleId, phases, onDone }: { cycleId: number; phases: GrowthPhase[]; onDone: () => void }) {
  const put = usePutPhases(cycleId);
  const [rows, setRows] = useState<PhaseInput[]>(() =>
    phases.map((p) => ({ code: p.code, name: p.name, startHst: p.startHst, endHst: p.endHst, ecTargetMin: p.ecTargetMin, ecTargetMax: p.ecTargetMax, ratioN: p.ratioN, ratioP: p.ratioP, ratioK: p.ratioK, notes: p.notes })),
  );
  const set = (i: number, patch: Partial<PhaseInput>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  function submit(e: FormEvent) {
    e.preventDefault();
    put.mutate(rows, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <p className="text-xs text-muted">HST = hari setelah tanam. Akhir kosong berarti sampai siklus selesai. Angka EC dan N:P:K dipakai untuk target pemupukan fase itu.</p>
      <div className="scroll-thin overflow-x-auto rounded-inner bg-card-2 ring-1 ring-line">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line">
              <th className="px-3 py-2 font-medium">Fase</th>
              <th className="px-3 py-2 font-medium">HST mulai</th>
              <th className="px-3 py-2 font-medium">HST akhir</th>
              <th className="px-3 py-2 font-medium">EC min</th>
              <th className="px-3 py-2 font-medium">EC maks</th>
              <th className="px-3 py-2 font-medium">N</th>
              <th className="px-3 py-2 font-medium">P</th>
              <th className="px-3 py-2 font-medium">K</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-3 py-2">
                  <input aria-label={`Nama fase ${i + 1}`} className="w-36 rounded-md bg-card px-2 py-1.5 text-sm ring-1 ring-line" value={r.name} onChange={(e) => set(i, { name: e.target.value, code: r.code || e.target.value.toUpperCase().replace(/\W+/g, "_") })} />
                </td>
                {(
                  [
                    ["startHst", r.startHst],
                    ["endHst", r.endHst],
                    ["ecTargetMin", r.ecTargetMin],
                    ["ecTargetMax", r.ecTargetMax],
                    ["ratioN", r.ratioN],
                    ["ratioP", r.ratioP],
                    ["ratioK", r.ratioK],
                  ] as [keyof PhaseInput, number | null | undefined][]
                ).map(([key, value]) => (
                  <td key={key} className="px-3 py-2">
                    <input
                      aria-label={`${key} fase ${i + 1}`}
                      inputMode="decimal"
                      className="tabular w-20 rounded-md bg-card px-2 py-1.5 text-sm ring-1 ring-line"
                      value={value ?? ""}
                      onChange={(e) => set(i, { [key]: key === "startHst" ? Number(e.target.value || 0) : numOrNull(e.target.value) } as Partial<PhaseInput>)}
                    />
                  </td>
                ))}
                <td className="px-3 py-2">
                  <Button size="sm" variant="ghost" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
                    Hapus
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {put.error && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
          {errorMessage(put.error)}
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <Button icon={Plus} onClick={() => setRows((x) => [...x, { code: "", name: "", startHst: (x[x.length - 1]?.endHst ?? 0) + 1, endHst: null, ecTargetMin: null, ecTargetMax: null, ratioN: null, ratioP: null, ratioK: null }])}>
          Tambah fase
        </Button>
        <div className="flex gap-2">
          <Button variant="soft" onClick={onDone} disabled={put.isPending}>
            Batal
          </Button>
          <Button type="submit" variant="dark" icon={Save} loading={put.isPending}>
            Simpan fase
          </Button>
        </div>
      </div>
    </form>
  );
}

function CycleCard({ today }: { today: CycleToday }) {
  const canWrite = useCanWrite();
  const [editing, setEditing] = useState(false);
  const c = today.cycle;
  const phase = today.currentPhase;
  return (
    <Card>
      <CardHeader title={c.name} icon={CalendarDays} action={<Badge tone="ok">Siklus aktif</Badge>} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Inset>
          <p className="text-sm text-muted">Umur tanaman</p>
          <p className="tabular metric-value mt-1 text-[40px] text-ink">
            {today.hst} <span className="text-base text-muted">HST</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">tanam {formatDate(c.transplantDate)}</p>
        </Inset>
        <Inset>
          <p className="text-sm text-muted">Fase sekarang</p>
          <p className="mt-1 text-xl font-semibold text-ink">{phase?.name ?? "Di luar fase"}</p>
          {today.nextPhase && today.daysUntilNextPhase != null && (
            <p className="mt-0.5 text-xs text-muted">
              {today.daysUntilNextPhase} hari lagi ke {today.nextPhase.name}
            </p>
          )}
        </Inset>
        <Inset>
          <p className="text-sm text-muted">Target EC fase ini</p>
          <p className="tabular mt-1 text-xl font-semibold text-ink">
            {phase && phase.ecTargetMin != null && phase.ecTargetMax != null ? `${formatNumber(phase.ecTargetMin, 2)}–${formatNumber(phase.ecTargetMax, 2)} mS/cm` : "—"}
          </p>
        </Inset>
        <Inset>
          <p className="text-sm text-muted">N : P : K fase ini</p>
          <p className="tabular mt-1 text-xl font-semibold text-ink">
            {phase && phase.ratioN != null && phase.ratioK != null ? `${formatNumber(phase.ratioN, 1)} : ${formatNumber(phase.ratioP ?? 1, 1)} : ${formatNumber(phase.ratioK, 1)}` : "—"}
          </p>
        </Inset>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-2">Fase pertumbuhan</h3>
        {canWrite && !editing && (
          <Button size="sm" onClick={() => setEditing(true)}>
            Ubah fase
          </Button>
        )}
      </div>
      {editing ? (
        <div className="mt-3">
          <PhaseEditor cycleId={c.id} phases={c.phases} onDone={() => setEditing(false)} />
        </div>
      ) : (
        <ol className="mt-3 grid gap-2 sm:grid-cols-3">
          {c.phases.map((p) => {
            const current = phase?.code === p.code;
            return (
              <li key={p.code} className={cn("rounded-inner p-3.5", current ? "bg-accent-soft ring-1 ring-accent" : "bg-card-2 ring-1 ring-line")}>
                <p className="font-semibold text-ink">{p.name}</p>
                <p className="tabular mt-0.5 text-xs text-muted">
                  HST {p.startHst}
                  {p.endHst != null ? `–${p.endHst}` : " ke atas"}
                </p>
                <p className="tabular mt-1 text-xs text-ink-2">
                  EC {p.ecTargetMin ?? "—"}–{p.ecTargetMax ?? "—"} · N:P:K {p.ratioN ?? "—"}:{p.ratioP ?? "—"}:{p.ratioK ?? "—"}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

/* ── Tanaman ───────────────────────────────────────────────────────────────── */

function NewPlantForm({ cycleId }: { cycleId: number }) {
  const create = useCreatePlant();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<PlantInput>({ code: "", treatmentCode: "", blockCode: "", rowCode: "", plotCode: "A", stationCode: "", comparisonGroup: "FERTIMATA", taggedLeaves: "1,3,5" });
  const set = (patch: Partial<PlantInput>) => setF((x) => ({ ...x, ...patch }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const body: PlantInput = { ...f, code: f.code.trim(), cycleId };
    for (const k of Object.keys(body) as (keyof PlantInput)[]) if (body[k] === "") delete body[k];
    create.mutate(body, { onSuccess: () => set({ code: "" }) });
  }

  if (!open)
    return (
      <Button icon={Plus} onClick={() => setOpen(true)}>
        Tambah tanaman
      </Button>
    );
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-inner bg-card-2 p-4 sm:grid-cols-3 ring-1 ring-line" noValidate>
      <Field label="Kode tanaman" value={f.code} onChange={(e) => set({ code: e.target.value })} placeholder="B1-N-02" required />
      <Select label="Perlakuan" hideLabel={false} id="np-treatment" value={f.treatmentCode ?? ""} onChange={(e) => set({ treatmentCode: e.target.value })} wrapperClassName="flex-col items-start gap-1.5">
        <option value="">Tanaman biasa</option>
        {treatments.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>
      <Select label="Sensor tanah" hideLabel={false} id="np-plot" value={f.plotCode ?? ""} onChange={(e) => set({ plotCode: e.target.value })} wrapperClassName="flex-col items-start gap-1.5">
        <option value="A">Bedengan A</option>
        <option value="B">Bedengan B</option>
        <option value="">Tidak ada</option>
      </Select>
      <Field label="Blok" value={f.blockCode ?? ""} onChange={(e) => set({ blockCode: e.target.value })} placeholder="B1" />
      <Field label="Baris" value={f.rowCode ?? ""} onChange={(e) => set({ rowCode: e.target.value })} placeholder="R1" />
      <Field label="Stasiun kamera" value={f.stationCode ?? ""} onChange={(e) => set({ stationCode: e.target.value })} placeholder="ST-03" />
      <Select label="Sistem" hideLabel={false} id="np-group" value={f.comparisonGroup ?? ""} onChange={(e) => set({ comparisonGroup: e.target.value })} wrapperClassName="flex-col items-start gap-1.5">
        <option value="FERTIMATA">Sistem FertiMata</option>
        <option value="SIMONKORI">Sistem lama (SimonKori)</option>
        <option value="NONE">Tidak dibandingkan</option>
      </Select>
      <Field label="Daun bertanda" value={f.taggedLeaves ?? ""} onChange={(e) => set({ taggedLeaves: e.target.value })} placeholder="1,3,5" />
      {create.error && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink sm:col-span-3">
          {errorMessage(create.error)}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-3">
        <Button variant="soft" onClick={() => setOpen(false)}>
          Tutup
        </Button>
        <Button type="submit" variant="dark" icon={Save} loading={create.isPending} disabled={!f.code.trim()}>
          Simpan tanaman
        </Button>
      </div>
    </form>
  );
}

function ObservationForm({ plant, onDone }: { plant: Plant; onDone: () => void }) {
  const add = useAddObservation(plant.id);
  const [height, setHeight] = useState("");
  const [leaves, setLeaves] = useState("");
  const [len, setLen] = useState("");
  const [wid, setWid] = useState("");
  const [notes, setNotes] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    add.mutate(
      { heightCm: num(height), leafCount: num(leaves), leaf3LengthCm: num(len), leaf3WidthCm: num(wid), visualNotes: notes.trim() || undefined },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4" noValidate>
      <Field label="Tinggi tanaman" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} suffix="cm" />
      <Field label="Jumlah daun" inputMode="numeric" value={leaves} onChange={(e) => setLeaves(e.target.value)} suffix="helai" />
      <Field label="Panjang daun ke-3" inputMode="decimal" value={len} onChange={(e) => setLen(e.target.value)} suffix="cm" />
      <Field label="Lebar daun ke-3" inputMode="decimal" value={wid} onChange={(e) => setWid(e.target.value)} suffix="cm" />
      <TextAreaField label="Catatan yang terlihat (mis. daun tua mulai kuning dari tepi)" value={notes} onChange={(e) => setNotes(e.target.value)} className="sm:col-span-4" />
      {add.error && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink sm:col-span-4">
          {errorMessage(add.error)}
        </p>
      )}
      <p className="text-xs text-muted sm:col-span-3">Angka sensor tanah bedengan ini ikut tersimpan otomatis bersama catatan.</p>
      <div className="flex justify-end gap-2 sm:col-span-1">
        <Button variant="soft" onClick={onDone} disabled={add.isPending}>
          Batal
        </Button>
        <Button type="submit" variant="accent" icon={Save} loading={add.isPending}>
          Simpan
        </Button>
      </div>
    </form>
  );
}

function ObservationList({ plantId }: { plantId: number }) {
  const q = useObservations(plantId, 0);
  if (q.isPending) return <Skeleton className="h-16 w-full" />;
  if (q.error) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data.content.length) return <p className="text-sm text-muted">Belum ada catatan pengamatan.</p>;
  return (
    <ol className="flex flex-col gap-2">
      {q.data.content.map((o) => {
        const soil = Object.entries(o.soilSnapshot ?? {}) as [string, { value?: unknown; unit?: string | null }][];
        return (
          <li key={o.id} className="rounded-inner bg-card p-3 text-sm ring-1 ring-line">
            <p className="flex flex-wrap items-baseline gap-x-2 text-ink">
              <span className="font-medium">{o.hst != null ? `HST ${o.hst}` : formatDate(o.observedAt)}</span>
              <span className="text-xs text-muted">{formatDateTime(o.observedAt)}{o.observedBy ? ` · ${o.observedBy}` : ""}</span>
            </p>
            <p className="tabular mt-1 text-ink-2">
              {o.heightCm != null && `Tinggi ${formatNumber(o.heightCm, 1)} cm`}
              {o.leafCount != null && ` · ${o.leafCount} daun`}
              {o.leaf3LengthCm != null && ` · daun ke-3 ${formatNumber(o.leaf3LengthCm, 1)}×${o.leaf3WidthCm != null ? formatNumber(o.leaf3WidthCm, 1) : "—"} cm`}
            </p>
            {o.visualNotes && <p className="mt-1 text-ink-2">{o.visualNotes}</p>}
            {soil.length > 0 && (
              <p className="tabular mt-1 text-xs text-muted">
                Tanah saat itu:{" "}
                {soil.map(([k, v]) => `${k.split(".")[1]} ${typeof v.value === "number" ? formatNumber(v.value) : String(v.value ?? "—")}${v.unit ? formatUnit(v.unit) : ""}`).join(" · ")}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function PlantRow({ plant }: { plant: Plant }) {
  const canWrite = useCanWrite();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const last = plant.lastObservation;
  return (
    <Inset className={cn(!plant.active && "opacity-60")}>
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{plant.code}</p>
            <Badge tone={treatmentTone[plant.treatmentCode ?? ""] ?? "neutral"}>{treatmentLabel(plant.treatmentCode)}</Badge>
            {plant.comparisonGroup && plant.comparisonGroup !== "NONE" && <Badge tone="neutral">{comparisonLabel[plant.comparisonGroup] ?? plant.comparisonGroup}</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {[plant.blockCode && `Blok ${plant.blockCode}`, plant.rowCode && `Baris ${plant.rowCode}`, plant.stationCode && `Stasiun ${plant.stationCode}`, plant.plotCode && `Sensor tanah ${plant.plotCode}`]
              .filter(Boolean)
              .join(" · ") || "Posisi belum diisi"}
          </p>
        </div>
        <p className="shrink-0 text-right text-xs text-muted">
          {last ? (
            <>
              <RelativeTime iso={last.observedAt} prefix="dicatat " />
              <br />
              {last.heightCm != null && `${formatNumber(last.heightCm, 1)} cm`}
              {last.leafCount != null && ` · ${last.leafCount} daun`}
            </>
          ) : (
            "belum pernah dicatat"
          )}
        </p>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
          {canWrite &&
            (adding ? (
              <ObservationForm plant={plant} onDone={() => setAdding(false)} />
            ) : (
              <Button variant="accent" icon={ClipboardList} onClick={() => setAdding(true)} className="self-start">
                Catat pengamatan hari ini
              </Button>
            ))}
          <ObservationList plantId={plant.id} />
        </div>
      )}
    </Inset>
  );
}

function PlantsSection({ cycleId, cycleCode }: { cycleId: number; cycleCode: string }) {
  const canWrite = useCanWrite();
  const [treatment, setTreatment] = useState<string>("ALL");
  const q = usePlants({ cycleId, treatmentCode: treatment === "ALL" ? undefined : treatment, active: true });
  const blocks = new Map<string, Plant[]>();
  for (const p of q.data ?? []) {
    const key = p.blockCode ?? "Tanpa blok";
    blocks.set(key, [...(blocks.get(key) ?? []), p]);
  }
  return (
    <Card>
      <CardHeader title="Tanaman" icon={Sprout} action={canWrite && <NewPlantForm cycleId={cycleId} />} />
      <Segmented
        label="Perlakuan"
        size="sm"
        value={treatment}
        onChange={setTreatment}
        className="mb-4"
        options={[{ value: "ALL", label: "Semua" }, ...treatments.map((t) => ({ value: t.value, label: t.label.split(" · ")[0] }))]}
      />
      <ExportButton
        label="Unduh semua pengamatan (CSV)"
        run={(signal) => exportObservations(cycleId, signal)}
        filename={() => csvFilename("pengamatan", cycleCode)}
        className="mb-4"
      />
      {q.isPending ? (
        <Skeleton className="h-40 w-full rounded-inner" />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !blocks.size ? (
        <EmptyState title="Belum ada tanaman yang dicatat" hint={canWrite ? "Tambahkan tanaman perlakuan (K0, N−, P−, K−) per blok agar pengamatan bisa dicatat." : undefined} />
      ) : (
        <div className="flex flex-col gap-4">
          {[...blocks.entries()].map(([block, list]) => (
            <section key={block}>
              <h3 className="mb-2 text-sm font-semibold text-ink-2">
                {block.startsWith("Tanpa") ? block : `Blok ${block}`} <span className="font-normal text-muted">· {list.length} tanaman</span>
              </h3>
              <div className="grid gap-2 lg:grid-cols-2">
                {list.map((p) => (
                  <PlantRow key={p.id} plant={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── Halaman ───────────────────────────────────────────────────────────────── */

export default function CultivationPage() {
  const today = useCycleToday();
  const canWrite = useCanWrite();
  return (
    <>
      <PageHeader title="Tanaman" subtitle="Umur tanaman, fase pertumbuhan, dan catatan pengamatan tanaman perlakuan." />
      {today.isPending ? (
        <Skeleton className="h-60 rounded-card" />
      ) : today.error ? (
        <ErrorState message={errorMessage(today.error)} onRetry={() => today.refetch()} />
      ) : !today.data ? (
        canWrite ? (
          <NewCycleForm />
        ) : (
          <EmptyState title="Belum ada siklus tanam yang aktif" hint="Operator atau admin yang bisa memulai siklus tanam." />
        )
      ) : (
        <div className="flex flex-col gap-4">
          <CycleCard today={today.data} />
          <PlantsSection cycleId={today.data.cycle.id} cycleCode={today.data.cycle.code} />
        </div>
      )}
    </>
  );
}
