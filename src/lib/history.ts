import { getSensorHistoryAggregate } from "@/lib/api/endpoints";
import type { SensorHistorySeries } from "@/lib/api/types";

/*
 * Riwayat sensor untuk grafik, dari GET /sensors/{id}/history/aggregate: backend meringkas per
 * interval (min/avg/max) dan memilih sendiri lebarnya (±300 titik) bila `interval` dikosongkan.
 * Interval ≥ 1 jam juga mencakup data di luar masa retensi pembacaan mentah.
 */

const DAY = 24 * 3_600_000;
export const RANGES = {
  "1h": { label: "1 jam", ms: 3_600_000 },
  "6h": { label: "6 jam", ms: 6 * 3_600_000 },
  "24h": { label: "1 hari", ms: DAY },
  "7d": { label: "7 hari", ms: 7 * DAY },
  "30d": { label: "30 hari", ms: 30 * DAY },
  "90d": { label: "90 hari", ms: 90 * DAY },
} as const;
export type RangeKey = keyof typeof RANGES;

/** Satu titik grafik. Titik celah (alat tidak mengirim data) bernilai null agar garisnya putus. */
export type Point = { t: number; avg: number | null; band: [number, number] | null; min: number | null; max: number | null; count: number };
export type HistoryResult = { points: Point[]; total: number; interval: string; intervalSeconds: number };

/**
 * Titik backend → titik grafik, terurut naik. Ember kosong tidak dikirim backend; bila jarak dua
 * titik lebih dari 1,5× interval, disisipkan satu titik null supaya garis tidak menyambung celah.
 */
export function toPoints(series: Pick<SensorHistorySeries, "points" | "intervalSeconds">): Point[] {
  const step = series.intervalSeconds * 1000;
  const sorted = series.points
    .map((p) => ({ ...p, t: Date.parse(p.bucketStart) }))
    .filter((p) => !Number.isNaN(p.t))
    .sort((a, b) => a.t - b.t);
  const out: Point[] = [];
  for (const p of sorted) {
    const prev = out[out.length - 1];
    if (prev && step > 0 && p.t - prev.t > step * 1.5) out.push({ t: prev.t + step, avg: null, band: null, min: null, max: null, count: 0 });
    out.push({ t: p.t, avg: p.avg, band: p.min != null && p.max != null ? [p.min, p.max] : null, min: p.min, max: p.max, count: p.count });
  }
  return out;
}

/** "15m" → "15 menit", "1h" → "1 jam", "7d" → "1 minggu". */
export function intervalLabel(interval: string): string {
  const m = /^(\d+)([mhd])$/.exec(interval);
  if (!m) return interval;
  const n = Number(m[1]);
  if (m[2] === "d" && n % 7 === 0) return `${n / 7} minggu`;
  return `${n} ${{ m: "menit", h: "jam", d: "hari" }[m[2] as "m" | "h" | "d"]}`;
}

export async function fetchHistory(sensorId: number, range: RangeKey, signal?: AbortSignal, now = Date.now()): Promise<HistoryResult> {
  const series = await getSensorHistoryAggregate(sensorId, { from: new Date(now - RANGES[range].ms).toISOString(), to: new Date(now).toISOString() }, signal);
  return {
    points: toPoints(series),
    total: series.points.reduce((n, p) => n + p.count, 0),
    interval: series.interval,
    intervalSeconds: series.intervalSeconds,
  };
}

export async function pool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
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
