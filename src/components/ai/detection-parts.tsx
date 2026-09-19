"use client";

import { Camera } from "lucide-react";
import { useState, type ReactNode } from "react";
import { siteConfig } from "@/config/site";
import type { AiDetection } from "@/lib/api/types";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";

/** URL gambar: absolut dipakai apa adanya, relatif di-resolve ke origin backend. */
export function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  try {
    return new URL(url, siteConfig.apiBaseUrl + "/").toString();
  } catch {
    return null;
  }
}

/**
 * Gambar deteksi. Backend belum menyajikan berkas gambar (lihat docs/backend-gaps.md), jadi
 * bila gagal dimuat tampil placeholder bergaya: ikon kamera + kode stasiun.
 */
export function DetectionImage({ detection, className, children }: { detection: AiDetection | null; className?: string; children?: ReactNode }) {
  const src = resolveImageUrl(detection?.imageUrl ?? null);
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
            {detection ? (src ? "Gambar tidak dapat dimuat dari server" : "Tidak ada gambar") : "Belum ada deteksi"}
          </p>
        </div>
      )}
      {children}
    </div>
  );
}

const scoreLabels: Record<string, string> = {
  Leaf_N_stress: "Stres N",
  Leaf_P_stress: "Stres P",
  Leaf_K_stress: "Stres K",
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
          <span className="tabular text-muted">keyakinan {formatPercent(detection.confidence)}</span>
        </div>
      );
    return <p className={cn("text-sm text-muted", className)}>Tidak ada skor.</p>;
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
