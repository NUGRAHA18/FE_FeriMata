"use client";

import { Play, Power, ShieldAlert, Square } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { trolleyLayout } from "@/config/dashboard-layout";
import { commandSpec, dosingPhaseFor, dosingPhases, suggestedTargetEc, validateStation, validateTargetEc } from "@/lib/actuator-commands";
import { buildCommand, describeCommandError, validateDuration, type CommandErrorView } from "@/lib/actuator-safety";
import type { CommandRequest } from "@/lib/api/endpoints";
import { useCycleToday, useSendCommand } from "@/lib/api/queries";
import type { Actuator, GrowthPhase } from "@/lib/api/types";
import { formatDuration, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CommandTracker, type TrackedCommand } from "./command-tracker";

type CommandDialogProps = {
  actuator: Pick<Actuator, "id" | "code" | "name" | "deviceCode" | "maxRunSeconds"> & Partial<Pick<Actuator, "type" | "supportedCommands">>;
  /** ON/OFF untuk relay; START, GOTO_STATION, DOSE_TO_TARGET, STOP, … untuk aktuator berurutan. */
  command: string;
  open: boolean;
  onClose: () => void;
  /** Dipanggil setelah 202 agar pemanggil ikut melacak perintah. */
  onSent?: (t: TrackedCommand) => void;
};

/** Mulai melacak perintah yang baru diterima backend (waktu lokal untuk peringatan "belum menjawab"). */
function trackCommand(uid: string): TrackedCommand {
  return { uid, sentAtLocal: Date.now() };
}

type FieldErrors =Partial<Record<"duration" | "station" | "targetEc" | "phase", string>>;

/**
 * Dialog konfirmasi perintah. Nyalakan selalu menampilkan isian durasi (wajib bila ada maxRunSeconds);
 * pindah kereta meminta nomor stasiun; campur pupuk meminta target EC + fase (diisi dari fase tanam
 * berjalan). Perintah berhenti cukup konfirmasi ringan. Tombol kirim nonaktif selama request berjalan.
 */
export function CommandDialog({ actuator, command, open, onClose, onSent }: CommandDialogProps) {
  const send = useSendCommand(actuator.id);
  const spec = commandSpec(actuator, command);
  const [duration, setDuration] = useState("");
  const [station, setStation] = useState("");
  const [dosing, setDosing] = useState<{ targetEc: string; phase: string } | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<CommandErrorView | null>(null);
  const [tracked, setTracked] = useState<TrackedCommand | null>(null);

  const max = actuator.maxRunSeconds;
  // Campur pupuk: selama pengguna belum mengubah isian, nilainya mengikuti fase tanam berjalan.
  const phase = useCycleToday(spec.params === "dosing").data?.currentPhase ?? null;
  const suggestedEc = suggestedTargetEc(phase);
  const dosingValue = dosing ?? { targetEc: suggestedEc == null ? "" : (formatNumber(suggestedEc, 2) ?? ""), phase: dosingPhaseFor(phase) ?? "" };

  function close() {
    if (send.isPending) return;
    setDuration("");
    setStation("");
    setDosing(null);
    setErrors({});
    setFailure(null);
    setTracked(null);
    send.reset();
    onClose();
  }

  /** Isian → body request, atau pesan per isian yang salah. */
  function buildRequest(): { req: CommandRequest } | { errors: FieldErrors } {
    switch (spec.params) {
      case "duration": {
        const v = validateDuration(duration, max);
        return v.ok ? { req: buildCommand("ON", v.value) } : { errors: { duration: v.error } };
      }
      case "station": {
        const v = validateStation(station);
        return v.ok ? { req: { command: spec.command, parameters: { station: v.value } } } : { errors: { station: v.error } };
      }
      case "dosing": {
        const ec = validateTargetEc(dosingValue.targetEc);
        const p = dosingValue.phase;
        if (ec.ok && p) return { req: { command: spec.command, parameters: { targetEc: ec.value, phase: p } } };
        return { errors: { targetEc: ec.ok ? undefined : ec.error, phase: p ? undefined : "Pilih fase tanam." } };
      }
      default:
        return { req: { command: spec.command } };
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (send.isPending) return;
    setFailure(null);
    const built = buildRequest();
    if ("errors" in built) {
      setErrors(built.errors);
      return;
    }
    const { req } = built;
    setErrors({});
    try {
      const cmd = await send.mutateAsync(req);
      const t = trackCommand(cmd.commandUid);
      setTracked(t);
      onSent?.(t);
    } catch (err) {
      setFailure(describeCommandError(err));
    }
  }

  const title = tracked ? "Perintah terkirim" : spec.title(actuator.name);
  const SubmitIcon = spec.stop ? Square : spec.command === "ON" ? Power : Play;

  return (
    <Dialog open={open} onClose={close} dismissible={!send.isPending} title={title}>
      {tracked ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-2">Perintah sudah dikirim ke alat. Tunggu sampai alat menjawab; status di bawah berubah sendiri.</p>
          <CommandTracker tracked={tracked} />
          <Button variant="soft" onClick={close} className="self-end">
            Tutup
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {spec.note && <p className="text-sm text-ink-2">{spec.note}</p>}

          {spec.params === "duration" && (
            <Field
              label={`Durasi menyala (detik)${max != null ? " — wajib" : ""}`}
              inputMode="numeric"
              pattern="[0-9]*"
              min={1}
              max={max ?? undefined}
              autoFocus
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              suffix="detik"
              error={errors.duration}
              hint={
                max != null
                  ? `Isi 1 sampai ${max} detik (paling lama ${formatDuration(max)}). Alat mati sendiri setelah waktunya habis.`
                  : "Alat akan mati sendiri setelah waktunya habis. Boleh dikosongkan bila alat ini tidak mewajibkan durasi."
              }
            />
          )}

          {spec.params === "station" && <StationPicker value={station} onChange={setStation} error={errors.station} />}

          {spec.params === "dosing" && <DosingFields value={dosingValue} phase={phase} onChange={setDosing} errors={errors} />}

          {failure && (
            <div role="alert" className="rounded-inner bg-danger-soft p-3.5 text-danger-ink">
              <p className="flex items-center gap-2 font-medium">
                <ShieldAlert aria-hidden className="size-4" strokeWidth={1.9} />
                {failure.title}
              </p>
              <p className="mt-1 text-sm">{failure.message}</p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="soft" size="lg" onClick={close} disabled={send.isPending}>
              Batal
            </Button>
            <Button type="submit" size="lg" variant={spec.stop ? "danger" : "accent"} icon={SubmitIcon} loading={send.isPending}>
              {spec.submitLabel}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/** Tombol besar 1…N (lebih mudah ditekan di ponsel daripada dropdown). */
function StationPicker({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-ink-2">Stasiun tujuan</legend>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: trolleyLayout.stationCount }, (_, i) => String(i + 1)).map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            aria-label={`Stasiun ${n}`}
            onClick={() => onChange(n)}
            className={cn(
              "tabular h-11 rounded-control text-base font-semibold ring-1 ring-line transition focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
              value === n ? "bg-accent text-white ring-accent" : "bg-card-2 text-ink hover:bg-card",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-xs text-danger-ink">{error}</p>
      ) : (
        <p className="text-xs text-muted">Stasiun 1 paling dekat dengan posisi awal (ujung selatan rel).</p>
      )}
    </fieldset>
  );
}

/** Target EC + fase; usulan awal dari fase tanam berjalan (tengah rentang EC target). */
function DosingFields({
  value: current,
  phase,
  onChange,
  errors,
}: {
  value: { targetEc: string; phase: string };
  phase: GrowthPhase | null;
  onChange: (v: { targetEc: string; phase: string }) => void;
  errors: FieldErrors;
}) {
  const range =
    phase && phase.ecTargetMin != null && phase.ecTargetMax != null
      ? `Target fase ${phase.name.toLowerCase()}: ${formatNumber(phase.ecTargetMin, 2)}–${formatNumber(phase.ecTargetMax, 2)} mS/cm.`
      : "Belum ada target dari fase tanam; isi sesuai anjuran.";

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Target kepekatan pupuk (EC)"
        inputMode="decimal"
        value={current.targetEc}
        onChange={(e) => onChange({ ...current, targetEc: e.target.value })}
        suffix="mS/cm"
        error={errors.targetEc}
        hint={range}
      />
      <div className="flex flex-col gap-1.5">
        <Select
          label="Fase tanam (menentukan perbandingan N:P:K)"
          hideLabel={false}
          id="dosing-phase"
          value={current.phase}
          onChange={(e) => onChange({ ...current, phase: e.target.value })}
          wrapperClassName="flex-col items-start gap-1.5"
          className="w-full"
          aria-invalid={errors.phase ? true : undefined}
        >
          <option value="">Pilih fase…</option>
          {dosingPhases.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        {errors.phase && <p className="text-xs text-danger-ink">{errors.phase}</p>}
      </div>
    </div>
  );
}
