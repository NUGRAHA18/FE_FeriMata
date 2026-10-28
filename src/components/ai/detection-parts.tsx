"use client";

import { Camera } from "lucide-react";
import { useQuery, useQueryClient, type QueryCache } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { apiOrigin } from "@/config/site";
import { fetchProtectedBlob } from "@/lib/api/client";
import type { AiDetection } from "@/lib/api/types";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";

/** URL gambar: absolut dipakai apa adanya, relatif di-resolve ke origin backend. */
export function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  try {
    return new URL(url, apiOrigin() + "/").toString();
  } catch {
    return null;
  }
}

/** Foto patroli di backend sendiri (`/captures/**`) butuh token; URL lain dimuat langsung. */
export function isProtectedCapture(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.origin === new URL(apiOrigin()).origin && u.pathname.startsWith("/captures/");
  } catch {
    return false;
  }
}

const CAPTURE_KEY = "capture-file";
const watchedCaches = new WeakSet<QueryCache>();

/** Object URL foto dilepas saat entri cache-nya dibuang (gcTime), bukan saat komponen hilang. */
function revokeOnRemoval(cache: QueryCache) {
  if (watchedCaches.has(cache)) return;
  watchedCaches.add(cache);
  cache.subscribe((e) => {
    if (e.type === "removed" && e.query.queryKey[0] === CAPTURE_KEY && typeof e.query.state.data === "string") URL.revokeObjectURL(e.query.state.data);
  });
}

/**
 * Sumber `<img>` siap pakai: foto `/captures` diambil sebagai blob (dengan token) lalu dijadikan
 * object URL yang di-cache per URL (berkas foto tidak pernah ditimpa edge), jadi menggeser foto
 * bolak-balik tidak mengunduh ulang.
 */
function useImageSource(src: string | null): { url: string | null; loading: boolean } {
  const qc = useQueryClient();
  revokeOnRemoval(qc.getQueryCache());
  const isProtected = isProtectedCapture(src);
  const q = useQuery({
    queryKey: [CAPTURE_KEY, src],
    queryFn: async ({ signal }) => URL.createObjectURL(await fetchProtectedBlob(src!, signal)),
    enabled: isProtected,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: 1,
  });
  if (!isProtected) return { url: src, loading: false };
  return { url: q.data ?? null, loading: q.isPending };
}

/**
 * Gambar deteksi. Foto patroli diambil dengan token (BE-2); bila gagal dimuat tampil placeholder
 * bergaya: ikon kamera + kode stasiun.
 */
export function DetectionImage({ detection, className, children }: { detection: AiDetection | null; className?: string; children?: ReactNode }) {
  const resolved = resolveImageUrl(detection?.imageUrl ?? null);
  const { url: src, loading } = useImageSource(resolved);
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = src && failed !== src;
  return (
    <div className={cn("relative overflow-hidden rounded-inner bg-sunken", className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- sumber eksternal/relatif, tanpa optimasi.
        <img src={src} alt={`Tangkapan ${detection?.stationCode ?? "kamera"}`} className="size-full object-cover" onError={() => setFailed(src)} loading="lazy" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_30%_20%,var(--accent-soft),transparent_60%)] text-ink-2">
          <Camera aria-hidden className="size-8" strokeWidth={1.3} />
          <p className="font-mono text-sm font-medium">{detection?.stationCode ?? "—"}</p>
          <p className="max-w-[80%] text-center text-[11px] text-muted">
            {!detection ? "Belum ada deteksi" : !resolved ? "Tidak ada gambar" : loading ? "Memuat foto…" : "Gambar tidak dapat dimuat dari server"}
          </p>
        </div>
      )}
      {children}
    </div>
  );
}

const scoreLabels: Record<string, string> = {
  Leaf_N_stress: "Kurang Nitrogen (N)",
  Leaf_P_stress: "Kurang Fosfor (P)",
  Leaf_K_stress: "Kurang Kalium (K)",
};

export function numericScores(scores: Record<string, unknown> | null): [string, number][] {
  if (!scores) return [];
  return Object.entries(scores).filter((e): e is [string, number] => typeof e[1] === "number" && Number.isFinite(e[1]));
}

/**
 * Skor multi-label (sigmoid independen 0–1, tidak berjumlah 1) sebagai bar terpisah.
 * Tanpa ambang / kesimpulan agronomi — hanya angka apa adanya, warna netral.
 */
export function ScoreBars({ detection, className }: { detection: AiDetection; className?: string }) {
  const scores = numericScores(detection.scores);
  if (!scores.length) {
    if (detection.label)
      return (
        <div className={cn("flex items-baseline justify-between gap-2 text-sm", className)}>
          <span className="font-medium text-ink">{detection.label}</span>
          <span className="tabular text-muted">kemungkinan {formatPercent(detection.confidence)}</span>
        </div>
      );
    return <p className={cn("text-sm text-muted", className)}>Belum ada hasil pemeriksaan.</p>;
  }
  return (
    <dl className={cn("flex flex-col gap-2", className)}>
      {scores.map(([k, v]) => (
        <div key={k}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <dt className="text-ink-2" title={k}>
              {scoreLabels[k] ?? k}
            </dt>
            <dd className="tabular font-medium text-ink">{formatPercent(v)}</dd>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
            <div className="h-full rounded-full bg-ink-2" style={{ width: `${Math.max(0, Math.min(1, v)) * 100}%` }} />
          </div>
        </div>
      ))}
    </dl>
  );
}
