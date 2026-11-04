"use client";

import { Check, CircleOff, FlaskConical, Loader2, Pencil, Save } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Badge, StatusDot, type Tone } from "@/components/ui/status";
import { TechInfo } from "@/components/ui/tech-info";
import { BigInput, QuickChoices } from "@/components/ui/time-input";
import { errorMessage } from "@/lib/api/client";
import { useFertilizationRuns, useFertilizationSchedule, useIrrigationSchedules, useSetFertilizationInterval, useStopFertilization } from "@/lib/api/queries";
import type { FertilizationRun, FertilizationSchedule } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { cn } from "@/lib/cn";
import {
  activeStageIndex,
  agoLabel,
  doseSummary,
  dueLabel,
  fertilizationErrorMessage,
  INTERVAL_MAX,
  INTERVAL_MIN,
  parseInterval,
  runView,
  scheduleState,
  stages,
} from "@/lib/fertilization";
import { useNow } from "@/lib/use-now";
import { DoseSection } from "./dose-section";

const toneText: Record<Tone, string> = { ok: "text-accent-ink", warn: "text-warn-ink", danger: "text-danger-ink", info: "text-info-ink", neutral: "text-ink-2" };
const QUICK_DAYS = ["3", "5", "7", "14"];

/** Lima langkah pemupukan; langkah aktif berdenyut, yang lewat dicentang. */
export function StageProgress({ run, className }: { run: FertilizationRun; className?: string }) {
  const active = activeStageIndex(run.step);
  return (
    <ol className={cn("grid grid-cols-5 gap-1.5", className)} aria-label="Langkah pemupukan">
      {stages.map((s, i) => {
        const done = i < active;
        const now = i === active;
        return (
          <li key={s.key} aria-current={now ? "step" : undefined} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full text-xs font-semibold ring-1",
                done && "bg-accent text-accent-fg ring-accent",
                now && "bg-info-soft text-info-ink ring-info",
                !done && !now && "bg-card text-muted ring-line",
              )}
            >
              {done ? <Check aria-hidden className="size-4" strokeWidth={2.5} /> : now ? <Loader2 aria-hidden className="size-4 animate-spin" /> : i + 1}
            </span>
            <span className={cn("text-[11px] leading-tight", now ? "font-semibold text-ink" : "text-muted")}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ActiveRun({ run }: { run: FertilizationRun }) {
  const v = runView(run);
  return (
    <div className="mb-4 rounded-inner bg-info-soft/60 p-3.5 ring-1 ring-info/40" role="status" aria-live="polite">
      <p className="flex items-center gap-2 font-semibold text-info-ink">
        <StatusDot tone="info" pulse />
        {v.text}
      </p>
      <p className="mt-1 text-sm text-ink-2">{v.detail}</p>
      <StageProgress run={run} className="mt-3" />
    </div>
  );
}

/** Form "pupuk setiap N hari". Disimpan di layanan AI, jadi bisa gagal 502 bila AI tak menjawab. */
export function IntervalForm({ initial, onDone }: { initial: number | null; onDone: () => void }) {
  const set = useSetFertilizationInterval();
  const [text, setText] = useState(initial != null ? String(initial) : "7");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const p = parseInterval(text);
    if (!p.ok) return setError(p.error);
    setError(null);
    set.mutate(p.value, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-inner bg-card p-3.5 ring-1 ring-line sm:p-4" noValidate>
      <BigInput
        label="Pupuk setiap"
        inputMode="numeric"
        autoComplete="off"
        placeholder="7"
        maxLength={2}
        value={text}
        onChange={(e) => (setText(e.target.value.replace(/\D/g, "")), setError(null))}
        suffix="hari"
        error={error}
        hint={`Antara ${INTERVAL_MIN} sampai ${INTERVAL_MAX} hari.`}
      >
        <QuickChoices label="Jarak yang sering dipakai" options={QUICK_DAYS.map((d) => ({ value: d, text: `${d} hari` }))} selected={text} onPick={(v) => (setText(v), setError(null))} />
      </BigInput>
      {set.error && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
          {fertilizationErrorMessage(set.error)}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="soft" size="lg" onClick={onDone} disabled={set.isPending} className="w-full sm:w-auto">
          Batal
        </Button>
        <Button type="submit" variant="accent" size="lg" icon={Save} loading={set.isPending} className="w-full sm:w-auto">
          Simpan jadwal pupuk
        </Button>
      </div>
    </form>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm not-last:border-b not-last:border-line">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

function Notice({ tone, children }: { tone: "warn" | "neutral"; children: ReactNode }) {
  return <p className={cn("mb-3 rounded-inner px-3.5 py-2.5 text-sm", tone === "warn" ? "bg-warn-soft text-warn-ink" : "bg-sunken text-ink-2")}>{children}</p>;
}

function ScheduleBody({ s, lastRun }: { s: FertilizationSchedule; lastRun: FertilizationRun | null }) {
  const canWrite = useCanWrite();
  const now = useNow();
  const irrigation = useIrrigationSchedules();
  const stop = useStopFertilization();
  const [editing, setEditing] = useState(false);
  const [stopping, setStopping] = useState(false);
  const state = scheduleState(s);
  const noWateringTime = irrigation.data && !irrigation.data.some((x) => x.enabled);
  const last = lastRun && lastRun.status !== "IN_PROGRESS" ? runView(lastRun) : null;
  const lastDose = lastRun ? doseSummary(lastRun) : null;
  const canEdit = canWrite && (state.kind === "active" || state.kind === "no-schedule");

  return (
    <>
      {state.kind === "disabled" && <Notice tone="neutral">Pupuk otomatis dimatikan di pengaturan sistem. Jam siram tetap berjalan tanpa pupuk.</Notice>}
      {state.kind === "ai-not-configured" && <Notice tone="warn">Layanan AI belum disambungkan ke sistem, jadi jadwal dan takaran pupuk belum bisa dipakai. Hubungi admin.</Notice>}
      {state.kind === "ai-unreachable" && (
        <Notice tone="warn">Layanan AI tidak menjawab, jadi jadwal pupuk tidak bisa dibaca sekarang. Bila sampai hari pupuk AI tetap tidak menjawab, pupuk tidak dituang dan dicoba lagi pada jam siram berikutnya.</Notice>
      )}
      {state.kind === "active" && noWateringTime && (
        <Notice tone="warn">Belum ada jam siram yang aktif. Pupuk hanya dituang sebelum jam siram, jadi tambahkan atau nyalakan jam siram di atas.</Notice>
      )}

      {editing ? (
        <IntervalForm initial={s.intervalDays} onDone={() => setEditing(false)} />
      ) : state.kind === "no-schedule" ? (
        <EmptyState
          icon={<FlaskConical aria-hidden className="size-5" strokeWidth={2} />}
          title="Belum ada jadwal pupuk"
          hint={canWrite ? "Tekan Atur jadwal pupuk dan pilih setiap berapa hari tanaman dipupuk." : "Operator atau admin bisa mengatur jadwal pupuk."}
        />
      ) : (
        <dl>
          {state.kind === "active" && (
            <Row label="Jadwal">
              <span className="tabular text-xl font-semibold">Setiap {state.intervalDays} hari</span>
            </Row>
          )}
          {state.kind === "active" && s.nextDueDate && (
            <Row label="Pupuk berikutnya">{s.activeRun ? "sedang berjalan" : `${dueLabel(s.nextDueDate, now || undefined)}, sebelum jam siram pertama`}</Row>
          )}
          <Row label="Terakhir dipupuk">{agoLabel(s.lastFertilizedDate, now || undefined) ?? "belum pernah"}</Row>
        </dl>
      )}

      {last && !editing && (
        <div className="mt-2 flex items-start gap-1.5 text-xs">
          <StatusDot tone={last.tone} className="mt-1" />
          <p className="text-muted">
            Hasil terakhir: <span className={cn("font-semibold", toneText[last.tone])}>{last.text}</span>
            {lastDose && lastRun?.status !== "SKIPPED" && lastRun?.status !== "FAILED" && <span className="text-ink-2"> · {lastDose}</span>}
            {last.detail && <span className="mt-0.5 block text-ink-2">{last.detail}</span>}
          </p>
        </div>
      )}

      {canEdit && !editing && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {state.kind === "active" && (
            <Button variant="soft" icon={CircleOff} onClick={() => setStopping(true)} className="w-full sm:w-auto">
              Hentikan pupuk otomatis
            </Button>
          )}
          <Button variant={state.kind === "active" ? "soft" : "accent"} icon={Pencil} onClick={() => setEditing(true)} className="w-full sm:w-auto">
            {state.kind === "active" ? "Ubah jarak hari" : "Atur jadwal pupuk"}
          </Button>
        </div>
      )}

      {!editing && state.kind !== "disabled" && <DoseSection />}

      {(s.aiError || s.aiScheduleId != null) && (
        <TechInfo className="mt-3 px-3 py-1.5 text-xs">
          <p className="mt-1.5 font-mono break-words text-ink-2">
            {s.aiScheduleId != null && <span className="block">aiScheduleId: {s.aiScheduleId}</span>}
            {s.aiError && <span className="block">aiError: {s.aiError}</span>}
            {s.nextDueDate && <span className="block">nextDueDate: {s.nextDueDate}</span>}
          </p>
        </TechInfo>
      )}

      <ConfirmDialog
        open={stopping}
        onClose={() => {
          setStopping(false);
          stop.reset();
        }}
        onConfirm={() => stop.mutate(undefined, { onSuccess: () => setStopping(false) })}
        pending={stop.isPending}
        error={stop.error ? fertilizationErrorMessage(stop.error) : null}
        tone="danger"
        title="Hentikan pupuk otomatis?"
        confirmLabel="Hentikan"
      >
        Jam siram tetap berjalan, tetapi tidak didahului pupuk lagi sampai jadwal pupuk diatur ulang.
      </ConfirmDialog>
    </>
  );
}

/** Kartu pupuk otomatis: jadwal (setiap N hari), kapan berikutnya, hasil terakhir, dan langkah saat berjalan. */
export function FertilizationCard() {
  const q = useFertilizationSchedule();
  const runs = useFertilizationRuns(0);
  const lastRun = runs.data?.content[0] ?? null;
  const state = q.data ? scheduleState(q.data) : null;

  return (
    <Card>
      <CardHeader
        title="Pupuk otomatis"
        icon={FlaskConical}
        action={
          state?.kind === "active" ? (
            <Badge tone="ok" dot>
              Aktif
            </Badge>
          ) : state?.kind === "disabled" || state?.kind === "no-schedule" ? (
            <Badge tone="neutral">Mati</Badge>
          ) : state ? (
            <Badge tone="warn" dot>
              {state.kind === "ai-not-configured" ? "AI belum diatur" : "AI tidak menjawab"}
            </Badge>
          ) : null
        }
      />
      <p className="mb-3 text-sm text-ink-2">
        Pada hari pupuk, sebelum jam siram pertama, pupuk N, P, dan K dituang bergantian ke drum, diaduk, lalu ikut disiram. Takarannya dari AI, atau Anda atur sendiri.
      </p>
      {q.data?.activeRun && <ActiveRun run={q.data.activeRun} />}
      {q.isPending ? (
        <Skeleton className="h-24 w-full rounded-inner" />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <ScheduleBody s={q.data} lastRun={lastRun} />
      )}
    </Card>
  );
}
