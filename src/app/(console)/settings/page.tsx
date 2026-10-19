"use client";

import { Info, Palette } from "lucide-react";
import { DevTools } from "@/components/settings/dev-tools";
import { PageHeader } from "@/components/shell/page-header";
import { ThemeSwitcher } from "@/components/shell/theme-toggle";
import { Card, CardHeader } from "@/components/ui/card";
import { KeyValue } from "@/components/ui/key-value";
import { productName, siteConfig } from "@/config/site";
import { useOverview } from "@/lib/api/queries";
import { formatDateTime } from "@/lib/format";
import { useConnectionState } from "@/lib/realtime/stomp";

const themeSamples = [
  { theme: "light", label: "Terang", note: "Latar abu-abu muda, cocok di siang hari." },
  { theme: "dark", label: "Gelap", note: "Nyaman di malam hari." },
  { theme: "green", label: "Hijau", note: "Nuansa hijau daun." },
];

export default function SettingsPage() {
  const system = useOverview((o) => o.system).data;
  const connection = useConnectionState();

  return (
    <>
      <PageHeader title="Pengaturan" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tampilan" icon={Palette} />
          <ThemeSwitcher />
          <div className="mt-4 grid grid-cols-3 gap-2">
            {themeSamples.map((t) => (
              <div key={t.theme} data-theme={t.theme} className="rounded-inner bg-bg p-2.5 text-ink ring-1 ring-line">
                <div className="flex gap-1.5">
                  <span className="h-6 flex-1 rounded-md bg-card" />
                  <span className="size-6 rounded-md bg-active" />
                  <span className="size-6 rounded-full bg-accent" />
                </div>
                <p className="mt-2 text-xs font-medium">{t.label}</p>
                <p className="mt-0.5 text-[11px] text-muted">{t.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Pilihan tema disimpan di perangkat ini. &quot;Ikuti sistem&quot; memakai Terang/Gelap sesuai pengaturan HP/komputer.</p>
        </Card>
        <Card>
          <CardHeader title="Tentang" icon={Info} />
          <KeyValue
            rows={[
              ["Aplikasi", productName],
              ["Greenhouse", siteConfig.name !== productName ? siteConfig.name : "—"],
              ["Lokasi", siteConfig.location || "—"],
              ["Data langsung", connection === "connected" ? "Tersambung" : connection === "connecting" ? "Menyambung…" : "Terputus"],
              ["Zona waktu", "WIB (Asia/Jakarta)"],
            ]}
          />
          <details className="mt-3 rounded-inner bg-card-2 px-3.5 py-2 text-sm">
            <summary className="cursor-pointer font-medium text-ink-2">Info teknis</summary>
            <KeyValue
              className="mt-2"
              rows={[
                ["API", <span key="a" className="font-mono text-xs">{siteConfig.apiBaseUrl || "(origin halaman)/api"}</span>],
                ["WebSocket", <span key="w" className="font-mono text-xs">{siteConfig.wsUrl || "(origin halaman)/ws"}</span>],
                ["Mode backend", system?.mode ?? "—"],
                ["Transport pesan", system ? `${system.messagingTransport ?? "—"} (${system.messagingConnected ? "tersambung" : "terputus"})` : "—"],
                ["Overview dibuat", formatDateTime(system?.generatedAt)],
              ]}
            />
          </details>
        </Card>
        {system?.mode === "DEVELOPMENT" && (
          <div className="lg:col-span-2">
            <DevTools />
          </div>
        )}
      </div>
    </>
  );
}
