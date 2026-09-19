"use client";

import { useParams } from "next/navigation";
import { History, Save, Settings2, SlidersHorizontal } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ActuatorControls, ReportedState } from "@/components/actuators/actuator-card";
import { CommandHistory } from "@/components/actuators/command-history";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Switch } from "@/components/ui/input";
import { KeyValue, MetadataTable } from "@/components/ui/key-value";
import { ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/status";
import { ApiRequestError, errorMessage } from "@/lib/api/client";
import { useActuator, usePatchActuator } from "@/lib/api/queries";
import type { Actuator } from "@/lib/api/types";
import { formatDateTime, formatDuration } from "@/lib/format";

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
      <div className="flex items-center justify-between gap-4 rounded-inner bg-card-2 px-3.5 py-3">
        <div>
          <p className="text-sm font-medium text-ink">Aktuator aktif</p>
          <p className="text-xs text-muted">Bila nonaktif, perintah ON ditolak. STOP tetap tersedia.</p>
        </div>
        <Switch checked={a.enabled} label="Aktuator aktif" onChange={(v) => setConfirmEnabled(v)} disabled={patch.isPending} />
      </div>
      <form onSubmit={saveMax} className="mt-3 flex flex-col gap-3 rounded-inner bg-card-2 p-3.5" noValidate>
        <Field
          label="Batas waktu jalan (maxRunSeconds)"
          inputMode="numeric"
          value={maxRun}
          onChange={(e) => {
            setMaxRun(e.target.value);
            setSaved(false);
          }}
          suffix="dtk"
          error={maxError}
          hint={a.maxRunSeconds == null ? "Saat ini tanpa batas. Isi 0 untuk menghapus batas." : `Saat ini ${formatDuration(a.maxRunSeconds)}. Isi 0 untuk menghapus batas.`}
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
        title={confirmEnabled ? `Aktifkan ${a.name}?` : `Nonaktifkan ${a.name}?`}
        confirmLabel={confirmEnabled ? "Aktifkan" : "Nonaktifkan"}
      >
        {confirmEnabled
          ? "Aktuator akan kembali bisa menerima perintah ON."
          : "Perintah ON akan ditolak backend selama aktuator nonaktif. Menonaktifkan tidak mematikan aktuator yang sedang menyala — gunakan STOP untuk itu."}
      </ConfirmDialog>
    </Card>
  );
}

export default function ActuatorDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const q = useActuator(id);
  const a = q.data;

  return (
    <>
      <PageHeader backHref="/actuators" title={a?.name ?? "Aktuator"} subtitle={a ? `#${a.code} • ${a.deviceCode}` : undefined} />
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
              <CardHeader title="Status & kontrol" icon={SlidersHorizontal} action={!a.enabled && <Badge tone="warn">Nonaktif</Badge>} />
              <ReportedState actuator={a} large />
              <ActuatorControls actuator={a} className="mt-5" />
              <h3 className="mt-6 mb-2 text-sm font-medium text-ink-2">Informasi</h3>
              <KeyValue
                rows={[
                  ["Kode", <span key="c" className="font-mono">{a.code}</span>],
                  ["Tipe", a.type ?? "—"],
                  ["Perangkat", a.deviceCode],
                  ["Status mentah", <span key="s" className="font-mono">{a.currentState ?? "null"}</span>],
                  ["Status diperbarui", formatDateTime(a.stateUpdatedAt)],
                  ["Deskripsi", a.description ?? "—"],
                ]}
              />
              <h3 className="mt-5 mb-2 text-sm font-medium text-ink-2">Metadata perangkat keras</h3>
              <MetadataTable metadata={a.metadata} />
            </Card>
            <Settings key={a.id} actuator={a} />
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
