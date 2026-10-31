"use client";

import { CalendarClock, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Switch } from "@/components/ui/input";
import { DurationInput, durationWords, minutesText, parseMinutes, parseTimeText, TimeInput } from "@/components/ui/time-input";
import { irrigationPumpCode } from "@/config/dashboard-layout";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Badge, StatusDot, type Tone } from "@/components/ui/status";
import { TechInfo } from "@/components/ui/tech-info";
import { errorMessage } from "@/lib/api/client";
import { useActuators, useCreateIrrigation, useDeleteIrrigation, useIrrigationSchedules, usePatchIrrigation } from "@/lib/api/queries";
import type { IrrigationSchedule } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { formatDuration } from "@/lib/format";
import { irrigationErrorMessage, lastRunView, nextRunLabel } from "@/lib/irrigation";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/cn";

const lastTone: Record<Tone, string> = { ok: "text-accent-ink", warn: "text-warn-ink", danger: "text-danger-ink", info: "text-info-ink", neutral: "text-ink-2" };

/* Backend menjalankan jadwal lewat jalur perintah biasa, jadi aturan keselamatan (PLN padam, drum
 * habis, …) tetap berlaku. Operator/admin mengatur; Pelihat hanya melihat. */

/** Lama siram terpanjang: maxRunSeconds pompa siram (null bila belum diketahui → batas dicek backend). */
function usePumpMaxSeconds(): number | null {
  return useActuators((list) => list.find((a) => a.code === irrigationPumpCode)?.maxRunSeconds ?? null).data ?? null;
}

/** Form tambah / ubah satu jadwal: jam diketik (24 jam), lama dalam menit, catatan. */
function ScheduleForm({ initial, onDone }: { initial?: IrrigationSchedule; onDone: () => void }) {
  const create = useCreateIrrigation();
  const patch = usePatchIrrigation();
  const max = usePumpMaxSeconds();
  const [timeText, setTimeText] = useState(initial?.time ?? "06:00");
  const [minutes, setMinutes] = useState(initial ? minutesText(initial.durationSeconds) : "5");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<{ time?: string; duration?: string; form?: string }>({});
  const pending = create.isPending || patch.isPending;
  const time = parseTimeText(timeText);

  function submit(e: FormEvent) {
    e.preventDefault();
    const durationSeconds = parseMinutes(minutes);
    const next: typeof errors = {};
    if (!time) next.time = "Jam tidak valid, contoh 06:00 atau 17:30.";
    if (durationSeconds == null || durationSeconds < 1) next.duration = "Isi lama siram dalam menit, contoh 5.";
    else if (max != null && durationSeconds > max) next.duration = `Terlalu lama. Pompa siram paling lama ${durationWords(max)} sekali jalan.`;
    setErrors(next);
    if (next.time || next.duration || !time || durationSeconds == null) return;
    if (time !== timeText) setTimeText(time);
    const body = { time, durationSeconds, notes: notes.trim() || undefined };
    const onError = (err: unknown) => setErrors({ form: irrigationErrorMessage(err) });
    if (initial) patch.mutate({ id: initial.id, body }, { onSuccess: onDone, onError });
    else create.mutate(body, { onSuccess: onDone, onError });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-inner bg-card p-3.5 ring-1 ring-line sm:p-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <TimeInput value={timeText} onChange={(v) => (setTimeText(v), setErrors((x) => ({ ...x, time: undefined })))} error={errors.time} />
        <DurationInput value={minutes} onChange={(v) => (setMinutes(v), setErrors((x) => ({ ...x, duration: undefined })))} max={max} error={errors.duration} />
      </div>
      <Field label="Catatan (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Siram pagi" maxLength={255} />
      {errors.form && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
          {errors.form}
        </p>
      )}
      <p className="text-sm text-muted">Jam yang sudah lewat hari ini baru berjalan besok. Pompa siram tidak menyala bila listrik PLN padam atau air drum habis.</p>
      {/* HP: tombol penuh selebar layar, Simpan di atas; layar lebar: berdampingan di kanan. */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="soft" size="lg" onClick={onDone} disabled={pending} className="w-full sm:w-auto">
          Batal
        </Button>
        <Button type="submit" variant="accent" size="lg" icon={Save} loading={pending} className="w-full sm:w-auto">
          {initial ? "Simpan perubahan" : time ? `Simpan jadwal ${time}` : "Simpan jadwal"}
        </Button>
      </div>
    </form>
  );
}

function ScheduleRow({ s, onEdit, onDelete }: { s: IrrigationSchedule; onEdit: () => void; onDelete: () => void }) {
  const canWrite = useCanWrite();
  const patch = usePatchIrrigation();
  const now = useNow();
  const next = nextRunLabel(s.nextRunAt, now || undefined);
  const last = lastRunView(s.lastResult, s.lastReasonCode, { seconds: s.lastDurationSeconds, source: s.lastDurationSource });

  return (
    <li className="flex min-w-0 items-start gap-3 rounded-inner bg-card p-3 ring-1 ring-line">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="tabular text-2xl leading-none font-semibold text-ink">{s.time}</span>
          <span className="text-sm text-ink-2">lama ditentukan AI · cadangan {formatDuration(s.durationSeconds)}</span>
          {!s.enabled && <Badge tone="neutral">Mati</Badge>}
        </p>
        {s.notes && <p className="mt-1 truncate text-xs text-ink-2">{s.notes}</p>}
        <p className="mt-1.5 text-xs text-muted">{s.enabled ? (next ? `Berikutnya: ${next}` : "Penjadwalan sedang mati di server") : "Tidak akan berjalan sampai dinyalakan lagi"}</p>
        {last && (
          <p className="mt-1 flex items-start gap-1.5 text-xs">
            <StatusDot tone={last.tone} className="mt-1" />
            <span className="text-muted">
              Terakhir: <span className={cn("font-semibold", lastTone[last.tone])}>{last.text}</span>
              {last.detail && <span className="mt-0.5 block text-ink-2">{last.detail}</span>}
            </span>
          </p>
        )}
        {(s.lastMessage || s.lastReasonCode) && (
          <TechInfo className="mt-2 px-3 py-1.5 text-xs">
            <p className="mt-1.5 font-mono break-words text-ink-2">
              {s.lastReasonCode && <span className="block">{s.lastReasonCode}</span>}
              {s.lastMessage}
            </p>
          </TechInfo>
        )}
        {patch.error && <p className="mt-1 text-xs text-danger-ink">{errorMessage(patch.error)}</p>}
      </div>
      {canWrite && (
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Switch checked={s.enabled} onChange={(v) => patch.mutate({ id: s.id, body: { enabled: v } })} label={`Jadwal ${s.time} aktif`} disabled={patch.isPending} />
          <div className="flex gap-1.5">
            <IconButton icon={Pencil} label={`Ubah jadwal ${s.time}`} size="sm" onClick={onEdit} />
            <IconButton icon={Trash2} label={`Hapus jadwal ${s.time}`} size="sm" onClick={onDelete} />
          </div>
        </div>
      )}
    </li>
  );
}

export function IrrigationScheduleCard() {
  const canWrite = useCanWrite();
  const q = useIrrigationSchedules();
  const del = useDeleteIrrigation();
  const [editing, setEditing] = useState<IrrigationSchedule | "new" | null>(null);
  const [deleting, setDeleting] = useState<IrrigationSchedule | null>(null);

  return (
    <Card>
      <CardHeader
        title="Jam siram"
        icon={CalendarClock}
        action={
          canWrite &&
          editing === null && (
            <Button size="sm" icon={Plus} onClick={() => setEditing("new")}>
              Tambah jam
            </Button>
          )
        }
      />
      <p className="mb-3 text-sm text-ink-2">Setiap hari pada jam berikut, AI menentukan berapa lama pompa siram menyala dari kondisi tanah. Bila AI tidak menjawab, dipakai lama cadangan.</p>
      {editing === "new" && <ScheduleForm onDone={() => setEditing(null)} />}
      {q.isPending ? (
        <Skeleton className="h-24 w-full rounded-inner" />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data.length ? (
        editing === null && <EmptyState title="Belum ada jadwal siram" hint={canWrite ? "Tekan Tambah jam untuk menyiram otomatis setiap hari." : undefined} />
      ) : (
        <ul className={editing === "new" ? "mt-3 flex flex-col gap-2" : "flex flex-col gap-2"}>
          {q.data.map((s) =>
            editing !== "new" && editing?.id === s.id ? (
              <li key={s.id}>
                <ScheduleForm initial={s} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <ScheduleRow key={s.id} s={s} onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} />
            ),
          )}
        </ul>
      )}
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null);
          del.reset();
        }}
        onConfirm={() => deleting && del.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        pending={del.isPending}
        error={deleting && del.error ? errorMessage(del.error) : null}
        tone="danger"
        title={deleting ? `Hapus jadwal siram jam ${deleting.time}?` : "Hapus jadwal siram?"}
        confirmLabel="Hapus"
      >
        Pompa siram tidak akan menyala lagi pada jam ini.
      </ConfirmDialog>
    </Card>
  );
}
