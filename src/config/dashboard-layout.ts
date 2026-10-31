import { PicEc, PicNitrogen, PicPh, PicPhosphorus, PicPotassium, PicSoilMoisture, PicSoilTemp, type Picto } from "@/components/icons/pictos";

// Satu-satunya pemetaan metric key (data katalog, bisa berubah) → kartu; key tak ada tampil "—".
// Satuan selalu dari field `unit` pembacaan, bukan di sini.

/** Rev A hanya punya satu sensor tanah 7-in-1; prefix `soil_a` dipertahankan agar riwayat lama nyambung. */
export const soilPrefix = "soil_a";

export type MetricCardDef = { suffix: string; label: string; icon: Picto };

/** Kartu metrik tanah; key = `${soilPrefix}.${suffix}`. */
export const soilMetricCards: MetricCardDef[] = [
  { suffix: "moisture", label: "Kelembapan tanah", icon: PicSoilMoisture },
  { suffix: "temperature", label: "Suhu tanah", icon: PicSoilTemp },
  { suffix: "ph", label: "Keasaman tanah (pH)", icon: PicPh },
  { suffix: "ec", label: "Kepekatan pupuk tanah (EC)", icon: PicEc },
  { suffix: "nitrogen", label: "Nitrogen (N)", icon: PicNitrogen },
  { suffix: "phosphorus", label: "Fosfor (P)", icon: PicPhosphorus },
  { suffix: "potassium", label: "Kalium (K)", icon: PicPotassium },
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

/** Ditampilkan sebagai aktuator biasa (tanpa d-pad). GOTO & PATROL = aktuator virtual JETSON-01 (BE-1). */
export const trolleyActuatorCodes = ["TROLLEY-RUN", "TROLLEY-DIR", "TROLLEY-GOTO", "TROLLEY-PATROL"];

/** Aktuator virtual patroli kamera; tombol "Patroli sekarang" di kartu kamera memakainya. */
export const patrolActuatorCode = "TROLLEY-PATROL";

/** Pompa siram yang dinyalakan jadwal siram; batas lama siram = maxRunSeconds-nya. */
export const irrigationPumpCode = "DIST-PUMP";

/** Satu kode = ubin switch (tetap lewat dialog konfirmasi); beberapa kode = ubin ringkasan ke halaman
 *  Kontrol. `label` kosong → nama katalog; kode tak ada di katalog dilewati. */
export type DashboardActuatorDef = { codes: string[]; label?: string };

export const dashboardActuators: DashboardActuatorDef[] = [
  { codes: [irrigationPumpCode], label: "Pompa siram" },
  { codes: ["STIRRER"] },
  { codes: ["DOSING-N", "DOSING-P", "DOSING-K"], label: "Pompa pupuk" },
  { codes: [patrolActuatorCode] },
];
