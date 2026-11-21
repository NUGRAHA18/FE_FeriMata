"use client";

import { Download, Smartphone } from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getInstallSnapshot, promptInstall, subscribeInstall, type InstallState } from "@/lib/pwa-install";

// Beranda: tombol "Simpan ke layar utama" yang tetap ada selama aplikasi belum dipasang. Tersembunyi bila
// sudah berjalan sebagai aplikasi. Peristiwa pasang ditangkap sejak halaman dibuka (lib/pwa-install).

const howTo: Record<Exclude<InstallState, "installed" | "prompt">, ReactNode> = {
  ios: (
    <>
      Buka di Safari, ketuk tombol <strong>Bagikan</strong> (kotak dengan panah ke atas), pilih <strong>Tambahkan ke Layar Utama</strong>, lalu
      ketuk <strong>Tambah</strong>.
    </>
  ),
  manual: (
    <>
      Ketuk menu <strong>⋮</strong> (tiga titik) di pojok browser, lalu pilih <strong>Pasang aplikasi</strong> atau{" "}
      <strong>Tambahkan ke layar utama</strong>. Di komputer, cari ikon pasang di kanan kolom alamat.
    </>
  ),
  insecure: "Pemasangan butuh alamat https. Buka FertiMata lewat alamat https, atau minta admin memasang domain untuk aplikasi ini.",
};

export function InstallCard({ className }: { className?: string }) {
  // Saat render server = null (kerangka); keadaan hanya bisa dibaca di browser.
  const state = useSyncExternalStore(subscribeInstall, getInstallSnapshot, () => null);
  const [busy, setBusy] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [declined, setDeclined] = useState(false);

  if (state === null || state === "installed") return null;

  async function install() {
    setBusy(true);
    setDeclined(false);
    try {
      if ((await promptInstall()) === "dismissed") setDeclined(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={className} aria-label="Simpan aplikasi">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent-ink">
          <Smartphone className="size-6" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <h2 className="text-base font-semibold text-ink">Simpan FertiMata di layar utama</h2>
          <p className="text-sm text-ink-2">Buka langsung dari ikon seperti aplikasi biasa, tanpa mengetik alamat.</p>
        </div>
        {state === "prompt" ? (
          <Button variant="accent" icon={Download} loading={busy} onClick={install}>
            Simpan ke layar utama
          </Button>
        ) : (
          state !== "insecure" && (
            <Button variant="soft" aria-expanded={showHow} onClick={() => setShowHow((v) => !v)}>
              {showHow ? "Tutup petunjuk" : "Lihat caranya"}
            </Button>
          )
        )}
      </div>
      {declined && <p className="mt-3 text-sm text-muted">Tidak jadi disimpan. Ketuk tombolnya lagi kapan saja bila berubah pikiran.</p>}
      {state !== "prompt" && (state === "insecure" || showHow) && (
        <p className="mt-3 rounded-inner bg-card-2 px-3.5 py-3 text-sm text-ink-2 ring-1 ring-line">{howTo[state]}</p>
      )}
    </Card>
  );
}
