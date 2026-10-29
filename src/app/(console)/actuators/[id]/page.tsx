"use client";

import { useParams } from "next/navigation";
import { History, Save, Settings2, SlidersHorizontal } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ActuatorControls, ReportedState } from "@/components/actuators/actuator-card";
import { CommandHistory } from "@/components/actuators/command-history";
import { isDosingPump, PumpCalibrationCard } from "@/components/actuators/pump-calibration";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Switch } from "@/components/ui/input";
import { KeyValue, MetadataTable } from "@/components/ui/key-value";
import { TechInfo } from "@/components/ui/tech-info";
import { ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/status";
import { ApiRequestError, errorMessage } from "@/lib/api/client";
import { useActuator, usePatchActuator } from "@/lib/api/queries";
import type { Actuator } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { actuatorTypeLabel, formatDateTime, formatDuration } from "@/lib/format";

function Settings({ actuator: a }: { actuator: Actuator }) {
  const patch = usePatchActuator(a.id);
  const [confirmEnabled, setConfirmEnabled] = useState<boolean | null>(null);
  const [maxRun, setMaxRun] = useState(a.maxRunSeconds == null ? "" : String(a.maxRunSeconds));
  const [maxError, setMaxError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function saveMax(e: FormEvent) {
    e.preventDefault();
    const t = maxRun.trim();
    if (!/^\d+$/.test(t)) {
      setMaxError("Isi bilangan bulat ≥ 0. Isi 0 untuk menghapus batas.");
      return;
    }
    setMaxError(null);
    setSaved(false);
    patch.mutate(
      { maxRunSeconds: Number(t) },
      {
        onSuccess: (x) => {
          setMaxRun(x.maxRunSeconds == null ? "" : String(x.maxRunSeconds));
          setSaved(true);
        },
        onError: (err) => setMaxError(err instanceof ApiRequestError ? (err.fieldErrors().maxRunSeconds ?? err.message) : errorMessage(err)),
      },
    );
  }

  return (
    <Card>
      <CardHeader title="Pengaturan" icon={Settings2} />
      <div className="flex items-center justify-between gap-4 rounded-inner bg-card-2 px-3.5 py-3 ring-1 ring-line">
        <div>
          <p className="text-sm font-medium text-ink">Boleh dinyalakan</p>
          <p className="text-xs text-muted">Bila dimatikan, alat ini tidak bisa dinyalakan dari aplikasi. Tombol Matikan tetap bisa dipakai.</p>
        </div>
        <Switch checked={a.enabled} label="Boleh dinyalakan" onChange={(v) => setConfirmEnabled(v)} disabled={patch.isPending} />
      </div>
      <form onSubmit={saveMax} className="mt-3 flex flex-col gap-3 rounded-inner bg-card-2 p-3.5 ring-1 ring-line" noValidate>
        <Field
          label="Paling lama menyala (detik)"
          inputMode="numeric"
          value={maxRun}
          onChange={(e) => {
            setMaxRun(e.target.value);
            setSaved(false);
          }}
          suffix="dtk"
          error={maxError}
          hint={a.maxRunSeconds == null ? "Saat ini tanpa batas. Isi 0 untuk tanpa batas." : `Saat ini ${formatDuration(a.maxRunSeconds)}. Isi 0 untuk tanpa batas.`}
        />
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-xs text-accent">Tersimpan</span>}
          <Button type="submit" variant="dark" size="sm" icon={Save} loading={patch.isPending && confirmEnabled === null}>
            Simpan batas
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirmEnabled !== null}
        onClose={() => setConfirmEnabled(null)}
        onConfirm={() => patch.mutate({ enabled: !!confirmEnabled }, { onSuccess: () => setConfirmEnabled(null) })}
        pending={patch.isPending}
        error={confirmEnabled !== null && patch.error ? errorMessage(patch.error) : null}
        tone={confirmEnabled ? "dark" : "danger"}
        title={confirmEnabled ? `Izinkan ${a.name} dinyalakan?` : `Larang ${a.name} dinyalakan?`}
        confirmLabel={confirmEnabled ? "Izinkan" : "Larang"}
      >
        {confirmEnabled
          ? "Alat ini akan bisa dinyalakan lagi dari aplikasi."
          : "Alat ini tidak akan bisa dinyalakan dari aplikasi dan tidak tampil lagi di daftar Kontrol. Kalau sekarang sedang menyala, matikan dulu dengan tombol Matikan. Aktifkan lagi dari Pengaturan → Sensor & alat yang dimatikan."}
      </ConfirmDialog>
    </Card>
  );
}

export default function ActuatorDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const q = useActuator(id);
  const a = q.data;
  const canWrite = useCanWrite();

  return (
    <>
      <PageHeader backHref="/actuators" title={a?.name ?? "Kontrol"} subtitle={a ? (actuatorTypeLabel(a.type) ?? a.code) : undefined} />
      {q.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        a && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader title="Status & kendali" icon={SlidersHorizontal} action={!a.enabled && <Badge tone="warn">Dinonaktifkan</Badge>} />
              <ReportedState actuator={a} large />
              <ActuatorControls actuator={a} className="mt-5" />
              {a.description && <p className="mt-5 text-sm text-ink-2">{a.description}</p>}
              <TechInfo className="mt-5">
                <KeyValue
                  className="mt-2"
                  rows={[
                    ["Kode", <span key="c" className="font-mono">{a.code}</span>],
                    ["Tipe", a.type ?? "—"],
                    ["Alat", a.deviceCode],
                    ["Status mentah", <span key="s" className="font-mono">{a.currentState ?? "null"}</span>],
                    ["Status diperbarui", formatDateTime(a.stateUpdatedAt)],
                  ]}
                />
                <h3 className="mt-3 mb-2 text-sm font-semibold text-ink-2">Pemasangan (Modbus / kanal)</h3>
                <MetadataTable metadata={a.metadata} />
              </TechInfo>
            </Card>
            {canWrite && <Settings key={a.id} actuator={a} />}
            {isDosingPump(a) && <PumpCalibrationCard actuator={a} />}
            <Card className="lg:col-span-2">
              <CardHeader title="Riwayat perintah" icon={History} />
              <CommandHistory actuatorId={a.id} />
            </Card>
          </div>
        )
      )}
    </>
  );
}
