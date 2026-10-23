import { getObservations, getPlants, getSensorHistory } from "@/lib/api/endpoints";
import type { Plant, PlantObservation, SensorReading } from "@/lib/api/types";
import { csvTime, toCsv, type CsvColumn } from "@/lib/csv";
import { pool, RANGES, type RangeKey } from "@/lib/history";

/*
 * Data mentah untuk ekspor CSV. Berbeda dengan grafik (lib/history), di sini tidak ada rata-rata:
 * setiap pembacaan / pengamatan menjadi satu baris. Jumlah request dibatasi; bila data melebihi
 * batas, ekspor memuat yang terbaru dan `truncated` bernilai true.
 */

const HISTORY_PAGE = 1000; // batas backend
export const HISTORY_EXPORT_LIMIT = 25_000; // 7 hari × interval 30 s ≈ 20.160 baris
const OBS_PAGE = 200; // batas backend
const CONCURRENCY = 4;

export type ExportResult = { csv: string; rows: number; truncated: boolean };

const readingColumns: CsvColumn<SensorReading>[] = [
  { header: "waktu_wib", value: (r) => csvTime(r.recordedAt) },
  { header: "nilai", value: (r) => r.value ?? r.textValue },
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

type SoilEntry = { value?: unknown; unit?: string | null };
type ObservationRow = { plant: Plant; obs: PlantObservation };

const soilOf = (o: PlantObservation) => (o.soilSnapshot ?? {}) as Record<string, SoilEntry>;

export function observationColumns(rows: ObservationRow[]): CsvColumn<ObservationRow>[] {
  // Kolom sensor tanah mengikuti kunci yang benar-benar ada di snapshot (mis. soil.a.moisture).
  const soilUnits = new Map<string, string | null>();
  for (const { obs } of rows) for (const [k, v] of Object.entries(soilOf(obs))) if (!soilUnits.get(k)) soilUnits.set(k, v?.unit ?? null);
  const soilCols: CsvColumn<ObservationRow>[] = [...soilUnits.keys()].sort().map((k) => ({
    header: `tanah_${k.replace(/\W+/g, "_")}${soilUnits.get(k) ? ` (${soilUnits.get(k)})` : ""}`,
    value: ({ obs }) => {
      const v = soilOf(obs)[k]?.value;
      return typeof v === "number" || typeof v === "string" ? v : null;
    },
  }));
  return [
    { header: "siklus", value: ({ plant }) => plant.cycleCode },
    { header: "kode_tanaman", value: ({ plant }) => plant.code },
    { header: "perlakuan", value: ({ plant }) => plant.treatmentCode },
    { header: "blok", value: ({ plant }) => plant.blockCode },
    { header: "baris", value: ({ plant }) => plant.rowCode },
    { header: "bedengan_sensor", value: ({ plant }) => plant.plotCode },
    { header: "stasiun", value: ({ plant }) => plant.stationCode },
    { header: "sistem", value: ({ plant }) => plant.comparisonGroup },
    { header: "aktif", value: ({ plant }) => plant.active },
    { header: "waktu_wib", value: ({ obs }) => csvTime(obs.observedAt) },
    { header: "hst", value: ({ obs }) => obs.hst },
    { header: "tinggi_cm", value: ({ obs }) => obs.heightCm },
    { header: "jumlah_daun", value: ({ obs }) => obs.leafCount },
    { header: "panjang_daun3_cm", value: ({ obs }) => obs.leaf3LengthCm },
    { header: "lebar_daun3_cm", value: ({ obs }) => obs.leaf3WidthCm },
    { header: "catatan", value: ({ obs }) => obs.visualNotes },
    { header: "dicatat_oleh", value: ({ obs }) => obs.observedBy },
    ...soilCols,
  ];
}

async function allObservations(plantId: number, signal?: AbortSignal): Promise<PlantObservation[]> {
  const out: PlantObservation[] = [];
  for (let page = 0; ; page++) {
    const p = await getObservations(plantId, page, OBS_PAGE, signal);
    out.push(...p.content);
    if (p.last || !p.content.length) return out;
  }
}

/** Semua pengamatan semua tanaman (termasuk yang sudah nonaktif) dalam satu siklus. */
export async function exportObservations(cycleId: number, signal?: AbortSignal): Promise<ExportResult> {
  const plants = await getPlants({ cycleId }, signal);
  const perPlant = await pool(
    plants.map((plant) => async () => (await allObservations(plant.id, signal)).map((obs) => ({ plant, obs }))),
    CONCURRENCY,
  );
  const rows = perPlant
    .flat()
    .sort((a, b) => a.plant.code.localeCompare(b.plant.code, "id") || Date.parse(a.obs.observedAt) - Date.parse(b.obs.observedAt));
  return { csv: toCsv(rows, observationColumns(rows)), rows: rows.length, truncated: false };
}
