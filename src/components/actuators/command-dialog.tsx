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
 * Dialog konfirmasi perintah aktuator. ON selalu menampilkan input durasi (wajib bila ada
 * maxRunSeconds). OFF cukup konfirmasi ringan. Tombol kirim nonaktif selama request berjalan.
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

  const title = tracked ? "Perintah terkirim" : isOn ? `Nyalakan ${actuator.name}?` : `Hentikan ${actuator.name}?`;

  return (
    <Dialog
      open={open}
      onClose={close}
      dismissible={!send.isPending}
      title={title}
      description={
        <span className="font-mono text-xs">
          {actuator.code} · {actuator.deviceCode}
        </span>
      }
    >
      {tracked ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-2">
            Backend menerima perintah (202) dan meneruskannya ke broker. Status di bawah mengikuti konfirmasi dari perangkat secara realtime.
          </p>
          <CommandTracker tracked={tracked} />
          <Button variant="soft" onClick={close} className="self-end">
            Tutup
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <dl className="grid grid-cols-2 gap-3 rounded-inner bg-card-2 p-3.5 text-sm">
            <div>
              <dt className="text-xs text-muted">Aktuator</dt>
              <dd className="font-medium text-ink">{actuator.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Perintah</dt>
              <dd className="font-medium text-ink">{isOn ? "ON (nyalakan)" : "OFF (hentikan)"}</dd>
            </div>
            {isOn && (
              <div className="col-span-2">
                <dt className="text-xs text-muted">Batas waktu jalan</dt>
                <dd className="text-ink-2">{max != null ? `maks ${formatDuration(max)} (${max} dtk)` : "tidak dibatasi di aktuator ini"}</dd>
              </div>
            )}
          </dl>

          {isOn && (
            <Field
              label={`Durasi (detik)${max != null ? " — wajib" : ""}`}
              inputMode="numeric"
              pattern="[0-9]*"
              min={1}
              max={max ?? undefined}
              autoFocus
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              suffix="dtk"
              error={fieldError}
              hint={
                max != null
                  ? `Bilangan bulat 1–${max}.`
                  : "Kosongkan bila tidak perlu. Beberapa tipe (pompa, dosing, trolley, valve) tetap wajib memakai durasi — backend akan menolak bila kosong."
              }
            />
          )}

          {failure && (
            <div role="alert" className="rounded-inner bg-danger-soft p-3.5 text-danger-ink">
              <p className="flex items-center gap-2 font-medium">
                <ShieldAlert aria-hidden className="size-4" strokeWidth={1.9} />
                {failure.title}
                {failure.kind === "interlock" && failure.interlock && <span className="font-mono text-[11px] opacity-75">({failure.interlock})</span>}
              </p>
              <p className="mt-1 text-sm">{failure.message}</p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="soft" onClick={close} disabled={send.isPending}>
              Batal
            </Button>
            <Button type="submit" variant={isOn ? "dark" : "danger"} icon={isOn ? Power : Square} loading={send.isPending}>
              {isOn ? "Kirim ON" : "Kirim STOP"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
