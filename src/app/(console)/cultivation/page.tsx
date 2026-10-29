"use client";

import { useSearchParams } from "next/navigation";
import { CalendarDays, Pencil, Plus, Save, Sprout, Trash2 } from "lucide-react";
import { Suspense, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, TextAreaField } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { useCreatePlant, useCycleToday, useDeletePlant, usePlants, useSetTransplantDate } from "@/lib/api/queries";
import type { CycleToday, Plant } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { csvTime } from "@/lib/csv";
import { formatDate } from "@/lib/format";

/*
 * Halaman Tanaman untuk petani: umur tanaman (hari ke-N) dan fase sekarang, serta menambah/menghapus
 * tanaman. Semua tanaman ditanam bersamaan, jadi ada SATU tanggal tanam untuk seluruh greenhouse:
 * diminta saat menambah tanaman pertama (PUT /cultivation/transplant-date), sesudahnya hanya
 * ditampilkan dan bisa dikoreksi lewat "Ubah tanggal tanam". Target EC per fase tetap disimpan
 * backend dan dipakai kartu tangki pupuk di Beranda.
 */

const DATE_HINT = "Semua tanaman ditanam bersamaan; hari ke-berapa dan fasenya dihitung dari tanggal ini.";

/** "2026-10-29" pada zona waktu situs (WIB). */
const todayLocal = () => csvTime(Date.now()).slice(0, 10);

/* ── Umur & fase ───────────────────────────────────────────────────────────── */

/** Koreksi tanggal tanam yang salah isi (operator/admin). */
function EditDateForm({ current, onDone }: { current: string; onDone: () => void }) {
  const save = useSetTransplantDate();
  const [date, setDate] = useState(current);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!date || date === current) return onDone();
    save.mutate(date, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-3 rounded-inner bg-card-2 p-3.5 ring-1 ring-line" noValidate>
      <Field label="Tanggal tanam" type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} hint={DATE_HINT} />
      {save.error && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
          {errorMessage(save.error)}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="soft" onClick={onDone} disabled={save.isPending} className="w-full sm:w-auto">
          Batal
        </Button>
        <Button type="submit" variant="accent" icon={Save} loading={save.isPending} disabled={!date} className="w-full sm:w-auto">
          Simpan tanggal
        </Button>
      </div>
    </form>
  );
}

/** "Hari ke-47 · Pembuahan" dalam huruf besar, lalu fase berikutnya bila ada. Nama fase dari backend. */
function AgeCard({ today }: { today: CycleToday }) {
  const canWrite = useCanWrite();
  const [editing, setEditing] = useState(false);
  return (
    <Card>
      <CardHeader title="Umur tanaman" icon={CalendarDays} />
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-ink">
        {/* tabular-nums hanya pada angka: pada tanda "-" ia membuat jarak yang janggal ("ke - 38"). */}
        <span className="text-[clamp(2.5rem,12vw,3.5rem)] leading-none font-semibold tracking-tight">
          Hari ke-<span className="tabular">{today.hst}</span>
        </span>
        <span className="text-[clamp(1.375rem,6vw,1.875rem)] font-semibold text-accent-ink">{today.currentPhase?.name ?? "Di luar fase"}</span>
      </p>
      {today.nextPhase && today.daysUntilNextPhase != null && (
        <p className="mt-2 text-base text-ink-2">
          Fase berikutnya: <strong className="font-semibold text-ink">{today.nextPhase.name}</strong> dalam {today.daysUntilNextPhase} hari
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Ditanam {formatDate(today.cycle.transplantDate)}</p>
        {canWrite && !editing && (
          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>
            Ubah tanggal tanam
          </Button>
        )}
      </div>
      {editing && <EditDateForm current={today.cycle.transplantDate} onDone={() => setEditing(false)} />}
    </Card>
  );
}

/** Tanggal tanam belum ada: umur & fase belum bisa dihitung. Operator diarahkan ke Tambah tanaman. */
function NoDateCard({ onAdd }: { onAdd: () => void }) {
  const canWrite = useCanWrite();
  return (
    <Card>
      <CardHeader title="Umur tanaman" icon={CalendarDays} />
      <p className="text-base font-semibold text-ink">Tanggal tanam belum diisi</p>
      <p className="mt-1 text-sm text-ink-2">
        {canWrite ? "Tambahkan tanaman pertama untuk mulai menghitung hari tanam." : "Operator atau admin perlu menambahkan tanaman pertama beserta tanggal tanamnya."}
      </p>
      {canWrite && (
        <Button variant="accent" icon={Plus} className="mt-3" onClick={onAdd}>
          Tambah tanaman pertama
        </Button>
      )}
    </Card>
  );
}

/* ── Tanaman ───────────────────────────────────────────────────────────────── */

/**
 * Tambah tanaman. Bila tanggal tanam belum ada, isian "Tanggal tanam" ikut diminta (wajib) dan
 * disimpan dulu; bila sudah ada, cukup ditampilkan sebagai keterangan.
 */
function NewPlantForm({ today, onDone }: { today: CycleToday | null; onDone: () => void }) {
  const create = useCreatePlant();
  const setDate = useSetTransplantDate();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDateText] = useState(todayLocal);
  const needDate = !today;
  const pending = create.isPending || setDate.isPending;
  const error = setDate.error ?? create.error;

  // Nama bebas (boleh spasi); backend membuat kode unik dari nama ("Melon 06" → "Melon-06").
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || (needDate && !date)) return;
    try {
      if (needDate) await setDate.mutateAsync(date);
      await create.mutateAsync({ name: name.trim(), description: notes.trim() || undefined });
      onDone();
    } catch {
      // Pesan ditampilkan dari error mutasi. Bila tanggal sudah tersimpan, form beralih ke mode keterangan.
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 flex flex-col gap-3 rounded-inner bg-card-2 p-4 ring-1 ring-line" noValidate>
      <Field label="Nama tanaman" value={name} onChange={(e) => setName(e.target.value)} placeholder="Melon pojok timur" required />
      {needDate ? (
        <Field label="Tanggal tanam" type="date" value={date} max={todayLocal()} onChange={(e) => setDateText(e.target.value)} required hint={DATE_HINT} />
      ) : (
        <p className="flex items-start gap-2 rounded-inner bg-card px-3.5 py-3 text-sm text-ink-2 ring-1 ring-line">
          <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-ink" />
          <span>
            Ditanam bersamaan pada <strong className="font-semibold text-ink">{formatDate(today.cycle.transplantDate)}</strong> (hari ke-{today.hst}).
          </span>
        </p>
      )}
      <TextAreaField label="Catatan (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
          {errorMessage(error)}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="soft" onClick={onDone} disabled={pending} className="w-full sm:w-auto">
          Batal
        </Button>
        <Button type="submit" variant="accent" icon={Save} loading={pending} disabled={!name.trim() || (needDate && !date)} className="w-full sm:w-auto">
          Simpan tanaman
        </Button>
      </div>
    </form>
  );
}

function PlantsSection({ today, ready, adding, setAdding }: { today: CycleToday | null; ready: boolean; adding: boolean; setAdding: (v: boolean) => void }) {
  const canWrite = useCanWrite();
  const q = usePlants({ active: true });
  const remove = useDeletePlant();
  const [deleting, setDeleting] = useState<Plant | null>(null);

  return (
    <Card id="tanaman">
      <CardHeader
        title="Tanaman"
        icon={Sprout}
        action={
          canWrite &&
          !adding && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              Tambah tanaman
            </Button>
          )
        }
      />
      {/* Form baru muncul setelah status tanggal tanam diketahui, supaya isian tanggal tidak berkedip. */}
      {canWrite && adding && (ready ? <NewPlantForm today={today} onDone={() => setAdding(false)} /> : <Skeleton className="mb-4 h-48 w-full rounded-inner" />)}
      {q.isPending ? (
        <Skeleton className="h-32 w-full rounded-inner" />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data.length ? (
        !adding && <EmptyState title="Belum ada tanaman" hint={canWrite ? "Tekan Tambah tanaman untuk mencatat tanaman di greenhouse." : undefined} />
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((p) => (
            <li key={p.id} className="flex min-h-14 min-w-0 items-center gap-3 rounded-inner bg-card p-3 ring-1 ring-line">
              <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent-ink">
                <Sprout aria-hidden className="size-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink" title={p.name}>
                  {p.name}
                </p>
                {p.description && <p className="line-clamp-2 text-xs text-ink-2">{p.description}</p>}
              </div>
              {canWrite && <IconButton icon={Trash2} label={`Hapus tanaman ${p.name}`} onClick={() => setDeleting(p)} />}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null);
          remove.reset();
        }}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        pending={remove.isPending}
        error={deleting && remove.error ? errorMessage(remove.error) : null}
        tone="danger"
        title={deleting ? `Hapus tanaman ${deleting.name}?` : "Hapus tanaman?"}
        confirmLabel="Hapus"
      >
        Tidak bisa dibatalkan. Foto dari kamera tetap tersimpan.
        {/* Backend mengosongkan tanggal tanam saat tanaman terakhir dihapus (musim berikutnya mulai lagi). */}
        {q.data?.length === 1 && <strong className="mt-2 block font-semibold text-ink">Ini tanaman terakhir; tanggal tanam juga akan dikosongkan.</strong>}
      </ConfirmDialog>
    </Card>
  );
}

/* ── Halaman ───────────────────────────────────────────────────────────────── */

function CultivationContent() {
  const today = useCycleToday();
  // ?tambah=1 (dari Beranda): langsung buka form Tambah tanaman.
  const [adding, setAdding] = useState(useSearchParams().get("tambah") === "1");
  const open = () => {
    setAdding(true);
    document.getElementById("tanaman")?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  return (
    <div className="flex flex-col gap-4">
      {today.isPending ? (
        <Skeleton className="h-44 rounded-card" />
      ) : today.error ? (
        <ErrorState message={errorMessage(today.error)} onRetry={() => today.refetch()} />
      ) : today.data ? (
        <AgeCard today={today.data} />
      ) : (
        <NoDateCard onAdd={open} />
      )}
      <PlantsSection today={today.data ?? null} ready={!today.isPending} adding={adding} setAdding={setAdding} />
    </div>
  );
}

export default function CultivationPage() {
  return (
    <>
      <PageHeader title="Tanaman" subtitle="Umur, fase, dan daftar tanaman." />
      <Suspense>
        <CultivationContent />
      </Suspense>
    </>
  );
}
