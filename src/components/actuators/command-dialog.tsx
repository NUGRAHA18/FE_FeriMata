"use client";

import { Play, Power, ShieldAlert, Square } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { trolleyLayout } from "@/config/dashboard-layout";
import { commandSpec, validateStation } from "@/lib/actuator-commands";
import { buildCommand, describeCommandError, validateDuration, type CommandErrorView } from "@/lib/actuator-safety";
import type { CommandRequest } from "@/lib/api/endpoints";
import { useSendCommand } from "@/lib/api/queries";
import type { Actuator } from "@/lib/api/types";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CommandTracker, type TrackedCommand } from "./command-tracker";

type CommandDialogProps = {
  actuator: Pick<Actuator, "id" | "code" | "name" | "deviceCode" | "maxRunSeconds"> & Partial<Pick<Actuator, "type" | "supportedCommands">>;
  /** ON/OFF untuk relay; START, GOTO_STATION, STOP, … untuk aktuator berurutan. */
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

type FieldErrors = Partial<Record<"duration" | "station", string>>;

/** Konfirmasi perintah. Nyalakan selalu minta durasi (wajib bila ada maxRunSeconds); pindah kereta
 * minta nomor stasiun; berhenti cukup konfirmasi ringan. */
export function CommandDialog({ actuator, command, open, onClose, onSent }: CommandDialogProps) {
  const send = useSendCommand(actuator.id);
  const spec = commandSpec(actuator, command);
  const [duration, setDuration] = useState("");
  const [station, setStation] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<CommandErrorView | null>(null);
  const [tracked, setTracked] = useState<TrackedCommand | null>(null);

  const max = actuator.maxRunSeconds;

  function close() {
    if (send.isPending) return;
    setDuration("");
    setStation("");
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
              value === n ? "bg-accent text-accent-fg ring-accent" : "bg-card-2 text-ink hover:bg-card",
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
