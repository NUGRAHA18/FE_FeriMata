"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Info, Palette, Sprout, Users } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/lib/auth/use-session";
import { GuideDialog } from "@/components/onboarding/guide";
import { DevTools } from "@/components/settings/dev-tools";
import { DisabledItemsCard } from "@/components/settings/disabled-items";
import { PageHeader } from "@/components/shell/page-header";
import { ThemeSwitcher } from "@/components/shell/theme-toggle";
import { Card, CardHeader } from "@/components/ui/card";
import { KeyValue } from "@/components/ui/key-value";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/input";
import { TechInfo, useSimpleMode } from "@/components/ui/tech-info";
import { productName, siteConfig } from "@/config/site";
import { useOverview } from "@/lib/api/queries";
import { formatDateTime } from "@/lib/format";
import { useConnectionState } from "@/lib/realtime/stomp";

const themeSamples = [
  { theme: "light", label: "Terang", note: "Putih dan hijau mint, cocok di siang hari." },
  { theme: "dark", label: "Gelap", note: "Nyaman di malam hari." },
];

export default function SettingsPage() {
  const system = useOverview((o) => o.system).data;
  const connection = useConnectionState();
  const role = useSession()?.user.role;
  const isAdmin = role === "ADMIN";
  const canWrite = isAdmin || role === "OPERATOR";
  const [simpleMode, setSimpleMode] = useSimpleMode();
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <PageHeader title="Pengaturan" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader title="Tanaman" icon={Sprout} />
          <p className="text-sm text-ink-2">
            {canWrite ? "Lihat umur dan fase tanaman, tambah atau hapus tanaman, dan ubah tanggal tanam." : "Lihat umur tanaman, fase pertumbuhan, dan daftar tanaman."}
          </p>
          <Link href="/cultivation" className="mt-3 inline-flex h-11 items-center gap-2 rounded-control bg-active px-4 text-sm font-medium text-active-fg hover:opacity-90">
            Buka halaman Tanaman <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        </Card>
        {canWrite && <DisabledItemsCard />}
        {isAdmin && (
          <Card className="lg:col-span-2">
            <CardHeader title="Pengguna" icon={Users} />
            <p className="text-sm text-ink-2">Tambah akun untuk petani atau operator lain, atur perannya, dan atur ulang kata sandi.</p>
            <Link href="/users" className="mt-3 inline-flex h-11 items-center gap-2 rounded-control bg-active px-4 text-sm font-medium text-active-fg hover:opacity-90">
              Kelola pengguna <ArrowUpRight aria-hidden className="size-4" />
            </Link>
          </Card>
        )}
        <Card>
          <CardHeader title="Tampilan" icon={Palette} />
          <ThemeSwitcher />
          <div className="mt-4 grid grid-cols-2 gap-2">
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
          <CardHeader title="Petunjuk & tampilan sederhana" icon={BookOpen} />
          <p className="text-sm text-ink-2">Arti tiap kartu di Beranda, dijelaskan langkah demi langkah.</p>
          <Button variant="soft" icon={BookOpen} className="mt-3" onClick={() => setGuideOpen(true)}>
            Buka petunjuk
          </Button>
          <div className="mt-5 flex items-start justify-between gap-4 border-t border-line pt-4">
            <div className="min-w-0">
              <p id="simple-mode-label" className="text-sm font-medium text-ink">
                Mode sederhana
              </p>
              <p className="mt-0.5 text-xs text-muted">Sembunyikan panel &quot;Info teknis&quot; (kode alat, metric key, alamat Modbus) di semua halaman.</p>
            </div>
            <Switch checked={simpleMode} onChange={setSimpleMode} label="Mode sederhana" />
          </div>
          <GuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
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
          <TechInfo className="mt-3">
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
          </TechInfo>
        </Card>
        {canWrite && system?.mode === "DEVELOPMENT" && (
          <div className="lg:col-span-2">
            <DevTools />
          </div>
        )}
      </div>
    </>
  );
}
