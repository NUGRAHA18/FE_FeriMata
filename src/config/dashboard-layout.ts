import { Atom, Droplets, FlaskConical, Leaf, Sprout, Thermometer, Zap, type LucideIcon } from "lucide-react";

/*
 * SATU-SATUNYA tempat pemetaan metric key → kartu dashboard.
 * Metric key adalah data katalog backend yang bisa berubah tanpa
 * perubahan backend. Kartu yang metric key-nya tidak ada di data tampil "—", bukan error.
 * Satuan TIDAK didefinisikan di sini — selalu diambil dari field `unit` pembacaan.
 * Label ditulis untuk petani: istilah teknis (EC, pH) tetap ada di dalam kurung karena itu yang
 * tertulis di alat ukur, tetapi kata utamanya bahasa sehari-hari.
 */

/**
 * Awalan metric key sensor tanah. FERTIMATA Rev A hanya punya satu sensor tanah 7-in-1 (alamat 1);
 * key `soil_a.*` dipertahankan backend supaya riwayat lama tetap nyambung.
 */
export const soilPrefix = "soil_a";

export type MetricCardDef = { suffix: string; label: string; icon: LucideIcon };

/** Kartu metrik tanah; key = `${soilPrefix}.${suffix}`. */
export const soilMetricCards: MetricCardDef[] = [
  { suffix: "moisture", label: "Kelembapan tanah", icon: Droplets },
  { suffix: "temperature", label: "Suhu tanah", icon: Thermometer },
  { suffix: "ph", label: "Keasaman tanah (pH)", icon: FlaskConical },
  { suffix: "ec", label: "Kepekatan pupuk tanah (EC)", icon: Zap },
  { suffix: "nitrogen", label: "Nitrogen (N)", icon: Leaf },
  { suffix: "phosphorus", label: "Fosfor (P)", icon: Sprout },
  { suffix: "potassium", label: "Kalium (K)", icon: Atom },
];

export function soilMetricKey(suffix: string) {
  return `${soilPrefix}.${suffix}`;
}

/** Kartu "Kondisi Greenhouse" (pengganti cuaca luar di referensi). */
export const conditionKeys = {
  airTemperature: "air.temperature",
  airHumidity: "air.humidity",
  illuminance: "light.illuminance",
};

/** Kartu tangki pupuk (probe EC & pH di rakit drum, suhu larutan, float LOW). */
export const tankKeys = {
  ec: "tank.ec",
  ph: "tank.ph",
  waterTemperature: "tank.water_temperature",
  /** 1 = air cukup; 0 = air rendah ATAU kabel putus → pompa air utama, pompa pupuk & aduk diblokir. */
  floatLowOk: "tank.float_low_ok",
};

/** Kereta kamera: rel selatan (HOME) → utara (END), 0 = HOME, 1–10 = ST-01…ST-10 tiap 60 cm. */
export const trolleyLayout = {
  stationKey: "trolley.station",
  homeLimitKey: "trolley.home_limit",
  endLimitKey: "trolley.end_limit",
  stationCount: 10,
  stationSpacingCm: 60,
};

/** Kode aktuator kereta kamera (ditampilkan sebagai aktuator biasa; tidak ada d-pad). */
export const trolleyActuatorCodes = ["TROLLEY-RUN", "TROLLEY-DIR"];
