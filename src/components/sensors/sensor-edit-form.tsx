"use client";

import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Switch, TextAreaField } from "@/components/ui/input";
import { ApiRequestError, errorMessage } from "@/lib/api/client";
import type { SensorPatch } from "@/lib/api/endpoints";
import { usePatchSensor } from "@/lib/api/queries";
import type { Sensor } from "@/lib/api/types";

/** Edit nama/satuan/deskripsi/enabled lewat PATCH. Error VALIDATION_ERROR dipetakan per field. */
export function SensorEditForm({ sensor: s }: { sensor: Sensor }) {
  const patch = usePatchSensor(s.id);
  const [name, setName] = useState(s.name);
  const [unit, setUnit] = useState(s.unit ?? "");
  const [description, setDescription] = useState(s.description ?? "");
  const [enabled, setEnabled] = useState(s.enabled);
  const [saved, setSaved] = useState(false);

  const fieldErrors = patch.error instanceof ApiRequestError ? patch.error.fieldErrors() : {};
  const generalError = patch.error && !Object.keys(fieldErrors).length ? errorMessage(patch.error) : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    const body: SensorPatch = {};
    if (name !== s.name) body.name = name;
    if (unit !== (s.unit ?? "")) body.unit = unit;
    if (description !== (s.description ?? "")) body.description = description;
    if (enabled !== s.enabled) body.enabled = enabled;
    if (!Object.keys(body).length) {
      setSaved(true);
      return;
    }
    setSaved(false);
    patch.mutate(body, { onSuccess: () => setSaved(true) });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama" value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} error={fieldErrors.name} required />
        <Field
          label="Satuan"
          value={unit}
          onChange={(e) => (setUnit(e.target.value), setSaved(false))}
          error={fieldErrors.unit}
          hint="Kode satuan mentah, mis. C, %, uS/cm."
        />
      </div>
      <TextAreaField label="Deskripsi" value={description} onChange={(e) => (setDescription(e.target.value), setSaved(false))} error={fieldErrors.description} />
      <div className="flex items-center justify-between gap-4 rounded-inner bg-card-2 px-3.5 py-3">
        <div>
          <p className="text-sm font-medium text-ink">Sensor aktif</p>
          <p className="text-xs text-muted">Sensor nonaktif tetap tampil dengan badge.</p>
        </div>
        <Switch checked={enabled} onChange={(v) => (setEnabled(v), setSaved(false))} label="Sensor aktif" />
      </div>
      {generalError && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
          {generalError}
        </p>
      )}
      <div className="flex items-center justify-end gap-3">
        {saved && !patch.isPending && <span className="text-xs text-accent">Tersimpan</span>}
        <Button type="submit" variant="dark" icon={Save} loading={patch.isPending}>
          Simpan
        </Button>
      </div>
    </form>
  );
}
