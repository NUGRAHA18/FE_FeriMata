"use client";

import { Power, ShieldAlert, Square } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { buildCommand, describeCommandError, validateDuration, type CommandErrorView } from "@/lib/actuator-safety";
import { useSendCommand } from "@/lib/api/queries";
import type { Actuator } from "@/lib/api/types";
import { formatDuration } from "@/lib/format";
import { CommandTracker, type TrackedCommand } from "./command-tracker";

type CommandDialogProps = {
  actuator: Pick<Actuator, "id" | "code" | "name" | "deviceCode" | "maxRunSeconds">;
  command: "ON" | "OFF";
  open: boolean;
  onClose: () => void;
  /** Dipanggil setelah 202 agar pemanggil ikut melacak perintah. */
  onSent?: (t: TrackedCommand) => void;
};

/**
 * Dialog konfirmasi perintah. Nyalakan selalu menampilkan isian durasi (wajib bila ada
 * maxRunSeconds). Matikan cukup konfirmasi ringan. Tombol kirim nonaktif selama request berjalan.
 */
export function CommandDialog({ actuator, command, open, onClose, onSent }: CommandDialogProps) {
  const send = useSendCommand(actuator.id);
  const [duration, setDuration] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [failure, setFailure] = useState<CommandErrorView | null>(null);
  const [tracked, setTracked] = useState<TrackedCommand | null>(null);

  const isOn = command === "ON";
  const max = actuator.maxRunSeconds;

  function close() {
    if (send.isPending) return;
    setDuration("");
    setFieldError(null);
    setFailure(null);
    setTracked(null);
    send.reset();
    onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (send.isPending) return;
    setFailure(null);
    let seconds: number | null = null;
    if (isOn) {
      const v = validateDuration(duration, max);
      if (!v.ok) {
        setFieldError(v.error);
        return;
      }
      seconds = v.value;
    }
    setFieldError(null);
    try {
      const cmd = await send.mutateAsync(buildCommand(command, seconds));
      const t = { uid: cmd.commandUid, sentAtLocal: Date.now() };
      setTracked(t);
      onSent?.(t);
    } catch (err) {
      setFailure(describeCommandError(err));
    }
  }

  const title = tracked ? "Perintah terkirim" : isOn ? `Nyalakan ${actuator.name}?` : `Matikan ${actuator.name}?`;

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
          {isOn ? (
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
              error={fieldError}
              hint={
                max != null
                  ? `Isi 1 sampai ${max} detik (paling lama ${formatDuration(max)}). Alat mati sendiri setelah waktunya habis.`
                  : "Alat akan mati sendiri setelah waktunya habis. Boleh dikosongkan bila alat ini tidak mewajibkan durasi."
              }
            />
          ) : (
            <p className="text-sm text-ink-2">Alat akan dimatikan sekarang.</p>
          )}

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
            <Button type="submit" size="lg" variant={isOn ? "accent" : "danger"} icon={isOn ? Power : Square} loading={send.isPending}>
              {isOn ? "Nyalakan sekarang" : "Matikan sekarang"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
