import { Atom, Droplets, FlaskConical, Leaf, Sprout, Thermometer, Zap, type LucideIcon } from "lucide-react";

/*
 * SATU-SATUNYA tempat pemetaan metric key → kartu dashboard.
 * Metric key adalah data katalog backend (hardware/fertimata-rev-a.yml) yang bisa berubah tanpa
 * perubahan backend. Kartu yang metric key-nya tidak ada di data tampil "—", bukan error.
 * Satuan TIDAK didefinisikan di sini — selalu diambil dari field `unit` pembacaan.
 * Label ditulis untuk petani: istilah teknis (EC, pH) tetap ada di dalam kurung karena itu yang
 * tertulis di alat ukur, tetapi kata utamanya bahasa sehari-hari.
 */

export type PlotId = "a" | "b";

export const plots: { id: PlotId; label: string; prefix: string }[] = [
  { id: "a", label: "Bedengan A", prefix: "soil_a" },
  { id: "b", label: "Bedengan B", prefix: "soil_b" },
];

export type MetricCardDef = { suffix: string; label: string; icon: LucideIcon };

/** Kartu metrik tanah untuk bedengan terpilih; key = `${plot.prefix}.${suffix}`. */
export const soilMetricCards: MetricCardDef[] = [
  { suffix: "moisture", label: "Kelembapan tanah", icon: Droplets },
  { suffix: "temperature", label: "Suhu tanah", icon: Thermometer },
  { suffix: "ph", label: "Keasaman tanah (pH)", icon: FlaskConical },
  { suffix: "ec", label: "Kepekatan pupuk tanah (EC)", icon: Zap },
  { suffix: "nitrogen", label: "Nitrogen (N)", icon: Leaf },
  { suffix: "phosphorus", label: "Fosfor (P)", icon: Sprout },
  { suffix: "potassium", label: "Kalium (K)", icon: Atom },
];

export function plotMetricKey(plot: PlotId, suffix: string) {
  const p = plots.find((x) => x.id === plot) ?? plots[0];
  return `${p.prefix}.${suffix}`;
}

/** Kartu "Kondisi Greenhouse" (pengganti cuaca luar di referensi). */
export const conditionKeys = {
  airTemperature: "air.temperature",
  airHumidity: "air.humidity",
  illuminance: "light.illuminance",
};

/** Kartu tangki pupuk (EC & pH flow cell). */
export const tankKeys = {
  ec: "tank.ec",
  ph: "tank.ph",
  supplyFloat: "tank.supply_float",
  mixingFloat: "tank.mixing_float",
};

/** Kereta kamera: rel utara → selatan, 0 = HOME, 1–12 = ST-01…ST-12. */
export const trolleyLayout = {
  stationKey: "trolley.station",
  homeLimitKey: "trolley.home_limit",
  endLimitKey: "trolley.end_limit",
  stationCount: 12,
  stationSpacingCm: 60,
};

/** Kode aktuator kereta kamera (ditampilkan sebagai aktuator biasa; tidak ada d-pad). */
export const trolleyActuatorCodes = ["TROLLEY-RUN", "TROLLEY-DIR"];
