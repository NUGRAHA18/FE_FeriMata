import { getSensorHistory } from "@/lib/api/endpoints";
import type { SensorReading } from "@/lib/api/types";
import { csvTime, toCsv, type CsvColumn } from "@/lib/csv";
import { pool, RANGES, type RangeKey } from "@/lib/history";

/*
 * Data mentah untuk ekspor CSV. Berbeda dengan grafik (lib/history), di sini tidak ada rata-rata:
 * setiap pembacaan menjadi satu baris. Jumlah request dibatasi; bila data melebihi batas, ekspor
 * memuat yang terbaru dan `truncated` bernilai true. Pengamatan, panen, dan sampel lab disusun
 * backend (`serverCsv`).
 */

const HISTORY_PAGE = 1000; // batas backend
export const HISTORY_EXPORT_LIMIT = 25_000; // 7 hari × interval 30 s ≈ 20.160 baris
const CONCURRENCY = 4;

export type ExportResult = { csv: string; rows: number; truncated: boolean };

const readingColumns: CsvColumn<SensorReading>[] = [
  { header: "waktu_wib", value: (r) => csvTime(r.recordedAt) },
  { header: "nilai", value: (r) => r.value ?? r.textValue },
  { header: "nilai_terkoreksi", value: (r) => r.calibratedValue },
  { header: "satuan", value: (r) => r.unit },
  { header: "kode_sensor", value: (r) => r.sensorCode },
  { header: "metric_key", value: (r) => r.metricKey },
  { header: "kode_alat", value: (r) => r.deviceCode },
  { header: "diterima_wib", value: (r) => csvTime(r.receivedAt) },
];

export async function exportSensorHistory(sensorId: number, range: RangeKey, signal?: AbortSignal, now = Date.now()): Promise<ExportResult> {
  const query = { from: new Date(now - RANGES[range].ms).toISOString(), to: new Date(now).toISOString(), size: HISTORY_PAGE };
  const first = await getSensorHistory(sensorId, { ...query, page: 0 }, signal);
  const pages = Math.min(first.totalPages, Math.ceil(HISTORY_EXPORT_LIMIT / HISTORY_PAGE));
  const rest = await pool(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => () => getSensorHistory(sensorId, { ...query, page: i + 1 }, signal)),
    CONCURRENCY,
  );
  // Backend: terbaru dulu. Laporan lebih enak dibaca urut waktu naik.
  const rows = [first, ...rest].flatMap((p) => p.content).sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  return { csv: toCsv(rows, readingColumns), rows: rows.length, truncated: first.totalElements > rows.length };
}

/** Jumlah baris data CSV (tanpa header); baris baru di dalam sel berkutip tidak dihitung. */
export function countCsvRows(text: string): number {
  let rows = 0;
  let quoted = false;
  let content = false;
  for (const ch of text.replace(/^﻿/, "")) {
    if (ch === '"') quoted = !quoted;
    if (ch === "\n" && !quoted) {
      if (content) rows++;
      content = false;
    } else if (ch !== "\r") content = true;
  }
  if (content) rows++;
  return Math.max(0, rows - 1);
}

/** CSV yang sudah disusun backend (mis. sampel lab kalibrasi): diunduh apa adanya, BOM dijamin ada untuk Excel. */
export async function serverCsv(text: Promise<string>): Promise<ExportResult> {
  const csv = await text;
  return { csv: csv.startsWith("﻿") ? csv : `﻿${csv}`, rows: countCsvRows(csv), truncated: false };
}
