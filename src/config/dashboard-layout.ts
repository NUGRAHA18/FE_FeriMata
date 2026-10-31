import { PicEc, PicNitrogen, PicPh, PicPhosphorus, PicPotassium, PicSoilMoisture, PicSoilTemp, type Picto } from "@/components/icons/pictos";

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

/**
 * Kode aktuator kereta kamera (ditampilkan sebagai aktuator biasa; tidak ada d-pad). TROLLEY-GOTO dan
 * TROLLEY-PATROL adalah aktuator virtual JETSON-01 (BE-1).
 */
export const trolleyActuatorCodes = ["TROLLEY-RUN", "TROLLEY-DIR", "TROLLEY-GOTO", "TROLLEY-PATROL"];

/** Aktuator virtual patroli kamera; tombol "Patroli sekarang" di kartu kamera memakainya. */
export const patrolActuatorCode = "TROLLEY-PATROL";

/** Pompa siram yang dinyalakan jadwal siram; batas lama siram = maxRunSeconds-nya. */
export const irrigationPumpCode = "DIST-PUMP";

/**
 * Kartu "Kontrol alat" di Beranda: hanya alat yang paling sering dipakai. Satu kode = satu ubin dengan
 * tombol switch (perintah tetap lewat dialog konfirmasi). Beberapa kode = satu ubin ringkasan yang
 * menautkan ke halaman Kontrol (mis. tiga pompa pupuk). `label` kosong → nama dari katalog backend.
 * Kode yang tidak ada di katalog dilewati.
 */
export type DashboardActuatorDef = { codes: string[]; label?: string };

export const dashboardActuators: DashboardActuatorDef[] = [
  { codes: [irrigationPumpCode], label: "Pompa siram" },
  { codes: ["STIRRER"] },
  { codes: ["DOSING-N", "DOSING-P", "DOSING-K"], label: "Pompa pupuk" },
  { codes: [patrolActuatorCode] },
];
