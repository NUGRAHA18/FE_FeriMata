import { getSensorHistory } from "@/lib/api/endpoints";
import type { SensorReading } from "@/lib/api/types";

/*
 * Riwayat sensor untuk grafik. Backend: size maks 1000, urutan terbaru dulu, default 24 jam.
 * Strategi dibatasi agar tidak pernah menembak ribuan request:
 *  - Bila total ≤ FULL_LIMIT titik → ambil semua halaman (≤ 5 request), lalu downsample.
 *  - Bila lebih → bagi rentang menjadi WINDOWS jendela waktu dan ambil sampel terbaru tiap
 *    jendela (size kecil), lalu rata-rata per jendela. Maks WINDOWS request, paralel terbatas.
 */

export const RANGES = {
  "1h": { label: "1 j", ms: 3_600_000 },
  "6h": { label: "6 j", ms: 6 * 3_600_000 },
  "24h": { label: "24 j", ms: 24 * 3_600_000 },
  "7d": { label: "7 h", ms: 7 * 24 * 3_600_000 },
} as const;
export type RangeKey = keyof typeof RANGES;

const PAGE_SIZE = 1000;
const FULL_LIMIT = 5000;
const WINDOWS = 48;
const WINDOW_SAMPLE = 20;
const CONCURRENCY = 6;
export const MAX_POINTS = 360;

export type Point = { t: number; v: number };
export type HistoryResult = { points: Point[]; total: number; sampled: boolean; requests: number };

function toPoints(readings: SensorReading[]): Point[] {
  const out: Point[] = [];
  for (const r of readings) {
    if (r.value == null) continue;
    const t = Date.parse(r.recordedAt);
    if (!Number.isNaN(t)) out.push({ t, v: r.value });
  }
  return out.sort((a, b) => a.t - b.t); // backend: terbaru dulu → balik untuk digambar
}

/** Rata-rata per ember waktu sehingga jumlah titik ≤ maxPoints. Input harus terurut naik. */
export function downsample(points: Point[], maxPoints = MAX_POINTS): Point[] {
  if (points.length <= maxPoints) return points;
  const t0 = points[0].t;
  const span = points[points.length - 1].t - t0 || 1;
  const buckets = new Map<number, { t: number; v: number; n: number }>();
  for (const p of points) {
    const i = Math.min(maxPoints - 1, Math.floor(((p.t - t0) / span) * maxPoints));
    const b = buckets.get(i);
    if (b) {
      b.t += p.t;
      b.v += p.v;
      b.n++;
    } else buckets.set(i, { t: p.t, v: p.v, n: 1 });
  }
  return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => ({ t: Math.round(b.t / b.n), v: b.v / b.n }));
}

async function pool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, async () => {
      while (next < tasks.length) {
        const i = next++;
        results[i] = await tasks[i]();
      }
    }),
  );
  return results;
}

export async function fetchHistory(sensorId: number, range: RangeKey, signal?: AbortSignal, now = Date.now()): Promise<HistoryResult> {
  const to = new Date(now);
  const from = new Date(now - RANGES[range].ms);
  const first = await getSensorHistory(sensorId, { from: from.toISOString(), to: to.toISOString(), page: 0, size: PAGE_SIZE }, signal);
  let requests = 1;

  if (first.last || first.totalElements <= PAGE_SIZE) {
    return { points: downsample(toPoints(first.content)), total: first.totalElements, sampled: false, requests };
  }

  if (first.totalElements <= FULL_LIMIT) {
    const rest = await pool(
      Array.from({ length: first.totalPages - 1 }, (_, i) => () => getSensorHistory(sensorId, { from: from.toISOString(), to: to.toISOString(), page: i + 1, size: PAGE_SIZE }, signal)),
      CONCURRENCY,
    );
    requests += rest.length;
    const all = [first, ...rest].flatMap((p) => p.content);
    return { points: downsample(toPoints(all)), total: first.totalElements, sampled: false, requests };
  }

  // Terlalu banyak titik: sampel per jendela waktu, rata-rata tiap jendela.
  const step = (to.getTime() - from.getTime()) / WINDOWS;
  const windows = await pool(
    Array.from({ length: WINDOWS }, (_, i) => () => {
      const wFrom = new Date(from.getTime() + i * step);
      const wTo = new Date(from.getTime() + (i + 1) * step);
      return getSensorHistory(sensorId, { from: wFrom.toISOString(), to: wTo.toISOString(), page: 0, size: WINDOW_SAMPLE }, signal);
    }),
    CONCURRENCY,
  );
  requests += windows.length;
  const points: Point[] = [];
  for (const w of windows) {
    const pts = toPoints(w.content);
    if (!pts.length) continue;
    points.push({ t: Math.round(pts.reduce((s, p) => s + p.t, 0) / pts.length), v: pts.reduce((s, p) => s + p.v, 0) / pts.length });
  }
  return { points, total: first.totalElements, sampled: true, requests };
}
