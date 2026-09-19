"use client";

import { useQuery } from "@tanstack/react-query";
import { FlaskConical, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { errorMessage } from "@/lib/api/client";
import { devOutbox, devPost } from "@/lib/api/endpoints";
import { actuatorCommandSchema } from "@/lib/api/types";

const scenarios: { label: string; path: string; body: unknown }[] = [
  { label: "PLN padam (BATTERY)", path: "/devices/JETSON-01/status", body: { powerSource: "BATTERY" } },
  { label: "PLN pulih (MAINS)", path: "/devices/JETSON-01/status", body: { powerSource: "MAINS" } },
  { label: "Trolley jalan", path: "/devices/PANEL-01/status", body: { actuators: { "TROLLEY-RUN": "ON" } } },
  { label: "Trolley berhenti", path: "/devices/PANEL-01/status", body: { actuators: { "TROLLEY-RUN": "OFF" } } },
  { label: "Alert SSR_SHORT", path: "/devices/PANEL-01/alerts", body: { type: "SSR_SHORT", severity: "CRITICAL", actuatorCode: "DIST-PUMP" } },
  {
    label: "Deteksi AI ST-03",
    path: "/devices/JETSON-01/ai-detections",
    body: { detectionType: "NUTRIENT_DEFICIENCY", stationCode: "ST-03", scores: { Leaf_N_stress: 0.71, Leaf_P_stress: 0.12, Leaf_K_stress: 0.64 } },
  },
];

/**
 * Dev Tools — hanya dirender saat system.mode === DEVELOPMENT. Memanggil endpoint /api/dev/*
 * untuk memverifikasi alur realtime (tidak pernah dipakai di produksi).
 */
export function DevTools() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const outbox = useQuery({
    queryKey: ["dev", "outbox"],
    queryFn: async () => {
      const raw = await devOutbox();
      const list = Array.isArray(raw) ? raw : [];
      return list.flatMap((x) => {
        const p = actuatorCommandSchema.safeParse(x);
        return p.success ? [p.data] : [];
      });
    },
  });

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader title="Dev Tools" icon={FlaskConical} action={<span className="rounded-full bg-info-soft px-2 py-0.5 text-[11px] text-info">DEVELOPMENT</span>} />
      <p className="mb-3 text-xs text-muted">Simulasi kejadian lewat endpoint khusus dev. Hasilnya harus muncul realtime di seluruh UI.</p>
      <div className="flex flex-wrap gap-2">
        {scenarios.map((s) => (
          <Button key={s.label} size="sm" loading={busy === s.label} onClick={() => run(s.label, () => devPost(s.path, s.body), `Terkirim: ${s.label}`)}>
            {s.label}
          </Button>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink-2">Outbox perintah (menunggu ack)</h3>
        <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => outbox.refetch()} loading={outbox.isFetching}>
          Muat ulang
        </Button>
      </div>
      <ul className="mt-2 flex flex-col gap-2">
        {(outbox.data ?? []).map((c) => (
          <li key={c.commandUid} className="flex flex-wrap items-center justify-between gap-2 rounded-inner bg-card-2 px-3 py-2 text-xs">
            <span className="font-mono">
              {c.actuatorCode} {c.commandType} · {c.commandUid}
            </span>
            <span className="flex gap-1.5">
              <Button
                size="sm"
                variant="accent"
                loading={busy === `ok-${c.commandUid}`}
                onClick={() =>
                  run(`ok-${c.commandUid}`, () => devPost(`/devices/${c.deviceCode}/command-ack`, { commandUid: c.commandUid, success: true, actuatorState: c.commandType }), "Ack sukses dikirim").then(() =>
                    outbox.refetch(),
                  )
                }
              >
                Ack sukses
              </Button>
              <Button
                size="sm"
                variant="danger"
                loading={busy === `fail-${c.commandUid}`}
                onClick={() =>
                  run(`fail-${c.commandUid}`, () => devPost(`/devices/${c.deviceCode}/command-ack`, { commandUid: c.commandUid, success: false }), "Ack gagal dikirim").then(() => outbox.refetch())
                }
              >
                Ack gagal
              </Button>
            </span>
          </li>
        ))}
        {outbox.data && !outbox.data.length && <li className="text-xs text-muted">Outbox kosong.</li>}
        {outbox.error && <li className="text-xs text-danger-ink">{errorMessage(outbox.error)}</li>}
      </ul>
      {msg && (
        <p role="status" className="mt-3 text-xs text-ink-2">
          {msg}
        </p>
      )}
    </Card>
  );
}
