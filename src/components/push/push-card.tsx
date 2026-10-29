"use client";

import { BellRing, Send } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/input";
import { KeyValue } from "@/components/ui/key-value";
import { ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/status";
import { TechInfo } from "@/components/ui/tech-info";
import { ApiRequestError, errorMessage } from "@/lib/api/client";
import { getPushConfig, sendTestPush } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/query-keys";
import { severityLabel } from "@/lib/format";
import { currentSubscription, disablePush, enablePush, pushSupport, sameServerKey, type PushSupport } from "@/lib/push";

/*
 * Kartu "Notifikasi di HP ini" (halaman Akun). Berlaku untuk semua peran, termasuk Pelihat.
 * Status langganan dibaca dari browser; jumlah perangkat akun ini dari backend.
 */

type State = "loading" | "on" | "off" | "blocked";

const noSubscribe = () => () => {};

function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-inner bg-card-2 px-3.5 py-3 text-sm text-ink-2 ring-1 ring-line">{children}</p>;
}

const supportText: Record<Exclude<PushSupport, "ok">, ReactNode> = {
  insecure: "Notifikasi butuh alamat https. Minta admin memasang domain untuk aplikasi ini.",
  "ios-install": (
    <>
      Di iPhone/iPad, notifikasi hanya bisa dipakai bila aplikasi dipasang: buka di Safari, ketuk tombol <strong>Bagikan</strong>, pilih{" "}
      <strong>Tambahkan ke Layar Utama</strong>, lalu buka FertiMata dari ikon di layar utama. Butuh iOS 16.4 atau lebih baru.
    </>
  ),
  unsupported: "Browser ini tidak mendukung notifikasi. Coba buka aplikasi dengan Chrome atau Firefox terbaru.",
};

function pushErrorMessage(e: unknown): string {
  if (e instanceof ApiRequestError) return e.status === 409 ? "Server menolak langganan dari browser ini. Coba lagi nanti atau hubungi admin." : errorMessage(e);
  return "Browser gagal menyalakan notifikasi. Periksa koneksi internet lalu coba lagi.";
}

export function PushCard() {
  const qc = useQueryClient();
  const config = useQuery({ queryKey: qk.pushConfig, queryFn: ({ signal }) => getPushConfig(signal) });
  // Dukungan hanya bisa dibaca di browser; saat render server = null (kerangka).
  const support = useSyncExternalStore(noSubscribe, pushSupport, () => null);
  const [state, setState] = useState<State>("loading");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const test = useMutation({ mutationFn: sendTestPush, onSuccess: () => void qc.invalidateQueries({ queryKey: qk.pushConfig }) });
  const publicKey = config.data?.publicKey ?? null;

  // Status langganan dibaca dari browser (asinkron).
  useEffect(() => {
    let cancelled = false;
    if (support !== "ok") return;
    void currentSubscription().then((sub) => {
      if (cancelled) return;
      setEndpoint(sub?.endpoint ?? null);
      if (Notification.permission === "denied") setState("blocked");
      else setState(sub && (!publicKey || sameServerKey(sub.options.applicationServerKey, publicKey)) ? "on" : "off");
    });
    return () => {
      cancelled = true;
    };
  }, [support, publicKey]);

  async function toggle(on: boolean) {
    setBusy(true);
    setError(null);
    test.reset();
    try {
      if (on && publicKey) {
        const r = await enablePush(publicKey);
        setState(r === "on" ? "on" : r === "blocked" ? "blocked" : "off");
      } else {
        await disablePush();
        setState("off");
      }
      setEndpoint((await currentSubscription())?.endpoint ?? null);
    } catch (e) {
      setError(pushErrorMessage(e));
    } finally {
      setBusy(false);
      void qc.invalidateQueries({ queryKey: qk.pushConfig });
    }
  }

  let content: ReactNode;
  if (config.isPending || support === null) content = <Skeleton className="h-16" />;
  else if (config.error) content = <ErrorState message={errorMessage(config.error)} onRetry={() => config.refetch()} />;
  else if (!config.data.enabled || !publicKey) content = <Note>Notifikasi belum diaktifkan di server.</Note>;
  else if (support !== "ok") content = <Note>{supportText[support]}</Note>;
  else if (state === "blocked")
    content = (
      <Note>
        Notifikasi untuk aplikasi ini <strong>diblokir</strong> di browser. Untuk membukanya: ketuk ikon gembok di samping alamat, pilih{" "}
        <strong>Izin</strong> → <strong>Notifikasi</strong> → <strong>Izinkan</strong>, lalu muat ulang halaman ini.
      </Note>
    );
  else
    content = (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 rounded-inner bg-card-2 px-3.5 py-3 ring-1 ring-line">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              Kirim notifikasi ke HP ini {state === "on" ? <Badge tone="ok">Menyala</Badge> : state === "off" && <Badge tone="neutral">Mati</Badge>}
            </p>
            <p className="text-xs text-muted">Saat ada peringatan darurat, misalnya listrik padam atau pompa kering, walaupun aplikasi sedang ditutup.</p>
          </div>
          <Switch checked={state === "on"} onChange={toggle} label="Kirim notifikasi ke HP ini" disabled={busy || state === "loading"} />
        </div>
        {state === "on" && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Button size="sm" icon={Send} loading={test.isPending} onClick={() => test.mutate()}>
              Kirim notifikasi uji
            </Button>
            {test.data && (
              <p role="status" className={test.data.delivered ? "text-xs text-muted" : "text-xs text-warn-ink"}>
                {test.data.delivered
                  ? `Terkirim ke ${test.data.delivered} perangkat. Notifikasi akan muncul dalam beberapa detik.`
                  : "Tidak ada perangkat yang menerima. Matikan lalu nyalakan lagi notifikasinya."}
              </p>
            )}
            {test.error && <p className="text-xs text-danger-ink">{errorMessage(test.error)}</p>}
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
            {error}
          </p>
        )}
      </div>
    );

  const n = config.data?.subscriptions ?? 0;
  return (
    <Card>
      <CardHeader title="Notifikasi di HP ini" icon={BellRing} />
      {content}
      {config.data?.enabled && (
        <>
          <p className="mt-3 text-xs text-muted">{n ? `Akun ini menerima notifikasi di ${n} perangkat.` : "Akun ini belum menerima notifikasi di perangkat mana pun."}</p>
          <TechInfo className="mt-3">
            <KeyValue
              className="mt-2"
              rows={[
                ["Peringatan yang dikirim", config.data.minSeverity ? `${severityLabel[config.data.minSeverity] ?? config.data.minSeverity} ke atas` : "—"],
                ["Endpoint HP ini", <span key="e" className="font-mono text-xs break-all">{endpoint ?? "—"}</span>],
              ]}
            />
          </TechInfo>
        </>
      )}
    </Card>
  );
}
