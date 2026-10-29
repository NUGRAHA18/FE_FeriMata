import { siteConfig } from "@/config/site";
import { irrigationReasonText, isSafetyCode } from "@/lib/irrigation-reasons";

/*
 * Formatter tampilan: angka, satuan, waktu (WIB) — semua dalam Bahasa Indonesia yang sederhana.
 * Pengguna utama adalah petani, jadi label domain menghindari istilah teknis (liveness, acknowledge,
 * broker, interlock) dan memakai kata sehari-hari (alat terhubung, sudah ditangani, listrik padam).
 * Timestamp dari backend selalu ISO-8601 UTC.
 */

const TZ = siteConfig.timeZone;

/** Satuan dari data backend → bentuk tampilan. */
export function formatUnit(unit: string | null | undefined): string {
  if (!unit) return "";
  switch (unit) {
    case "C":
      return "°C";
    case "F":
      return "°F";
    case "uS/cm":
      return "µS/cm";
    case "pH":
      return ""; // "7.1 pH" berlebihan; label kartu sudah menyebut pH.
    default:
      return unit;
  }
}

/**
 * Isian angka dari ponsel: koma desimal diterima ("13,5"). Kosong → undefined; bukan angka → NaN
 * (pemanggil menampilkan pesan per isian).
 */
export function parseDecimal(v: string): number | undefined {
  const t = v.trim().replace(",", ".");
  if (t === "") return undefined;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN;
}

/** Angka berformat id-ID; jumlah desimal menyesuaikan besarnya nilai. */
export function formatNumber(value: number | null | undefined, maxFractionDigits?: number): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const abs = Math.abs(value);
  const digits = maxFractionDigits ?? (abs >= 100 ? 0 : abs >= 10 ? 1 : 2);
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value);
}

/** Nilai pembacaan sensor: angka bila ada, jika tidak textValue, jika tidak null. */
export function formatReading(r: { value: number | null; textValue: string | null } | null | undefined): string | null {
  if (!r) return null;
  if (r.value != null) return formatNumber(r.value);
  return r.textValue ?? null;
}

export function formatPercent(fraction: number | null | undefined): string {
  if (fraction == null || !Number.isFinite(fraction)) return "—";
  return `${Math.round(fraction * 100)}%`;
}

/** Durasi dalam detik → "40 dtk", "2 mnt 5 dtk", "3 jam 10 mnt". */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return "—";
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s} dtk`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? `${m} mnt ${s % 60} dtk` : `${m} mnt`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} jam ${m % 60} mnt` : `${h} jam`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} hari ${h % 24} jam` : `${d} hari`;
}

/** Waktu relatif: "baru saja", "12 dtk lalu", "5 mnt lalu", "3 jam lalu", "2 hari lalu". */
export function formatRelative(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diff = Math.round((now - t) / 1000);
  if (diff < 0) return diff > -60 ? "baru saja" : `dalam ${formatDuration(-diff)}`;
  if (diff < 5) return "baru saja";
  if (diff < 60) return `${diff} dtk lalu`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return formatDate(iso);
}

const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("id-ID", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const longDateFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const timeSecFmt = new Intl.DateTimeFormat("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" });

function toDate(v: string | number | Date): Date | null {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "19 Sep 2026, 13.55.02 WIB" */
export function formatDateTime(v: string | number | Date | null | undefined): string {
  if (v == null) return "—";
  const d = toDate(v);
  return d ? `${dateTimeFmt.format(d)} WIB` : "—";
}

export function formatDate(v: string | number | Date | null | undefined): string {
  if (v == null) return "—";
  const d = toDate(v);
  return d ? dateFmt.format(d) : "—";
}

/** "Sabtu, 19 September 2026" */
export function formatLongDate(v: string | number | Date): string {
  const d = toDate(v);
  return d ? longDateFmt.format(d) : "—";
}

/** "13.55" (atau "13.55.02" dengan detik) — WIB. */
export function formatTime(v: string | number | Date | null | undefined, withSeconds = false): string {
  if (v == null) return "—";
  const d = toDate(v);
  return d ? (withSeconds ? timeSecFmt : timeFmt).format(d) : "—";
}

// ── Label domain ─────────────────────────────────────────────────────────────

/** Label sumber listrik. Keputusan "pakai baterai" tetap memakai onBackupPower dari backend. */
export function powerSourceLabel(source: string | null | undefined): string {
  if (!source) return "Tidak diketahui";
  switch (source.toUpperCase()) {
    case "MAINS":
      return "PLN";
    case "BATTERY":
      return "Baterai";
    case "UNKNOWN":
      return "Tidak diketahui";
    default:
      return source;
  }
}

/** Status koneksi alat, bahasa sehari-hari. */
export const livenessLabel: Record<string, string> = {
  ONLINE: "Terhubung",
  OFFLINE: "Terputus",
  UNKNOWN: "Belum pernah terhubung",
};

export const commandStatusLabel: Record<string, string> = {
  PENDING: "Menunggu",
  SENT: "Terkirim, menunggu jawaban alat",
  EXECUTED: "Dijalankan",
  FAILED: "Gagal",
  CANCELLED: "Dibatalkan",
};

export const severityLabel: Record<string, string> = {
  INFO: "Info",
  WARNING: "Perlu perhatian",
  CRITICAL: "Darurat",
};

const alertTypeLabels: Record<string, string> = {
  DEVICE_OFFLINE: "Alat terputus",
  DEVICE_RECOVERED: "Alat terhubung kembali",
  ACTUATOR_COMMAND_FAILED: "Perintah gagal dijalankan",
  IRRIGATION_SKIPPED: "Penyiraman terjadwal dibatalkan",
  TELEMETRY_REJECTED: "Data sensor ditolak",
  POWER_BACKUP: "Listrik PLN padam, memakai baterai",
  POWER_RESTORED: "Listrik PLN kembali normal",
  DEVICE_REPORTED: "Laporan dari alat",
  SSR_SHORT: "Saklar pompa rusak (korslet)",
  PUMP_DRY_RUN: "Pompa menyala tanpa air",
  DOSING_NOT_CONVERGING: "Campuran pupuk tidak mencapai target",
  TROLLEY_LIMIT_HIT: "Kereta kamera menyentuh ujung rel",
  MODBUS_TIMEOUT: "Alat tidak menjawab",
  // Dari edge agent (kontrak MQTT §4.4).
  RELAY_MISMATCH: "Saklar tidak berpindah sesuai perintah",
  OUTPUT_TIMEOUT: "Alat dimatikan otomatis karena terlalu lama menyala",
  BUS_DOWN: "Semua modul tidak menjawab",
  FLOAT_LOW: "Air di drum pupuk rendah",
  TROLLEY_NO_REED: "Kereta kamera tidak bergerak",
  TROLLEY_LIMIT_WIRE: "Kabel sensor ujung rel bermasalah",
  TROLLEY_TIMEOUT: "Kereta kamera terlalu lama di jalan",
  TROLLEY_ARRIVED: "Kereta kamera sampai tujuan",
  TROLLEY_GOTO_FAILED: "Kereta kamera tidak sampai tujuan",
  CAMERA_FAIL: "Sebagian foto gagal diambil",
  PATROL_DONE: "Patroli kamera selesai",
  PATROL_FAILED: "Patroli kamera gagal",
  DISK_LOW: "Penyimpanan foto hampir penuh",
  DISK_FULL: "Penyimpanan foto penuh",
  SOC_HOT: "Komputer utama terlalu panas",
  EC_PH_INVALID: "Bacaan EC/pH drum tidak masuk akal",
};

/** Label Indonesia untuk tipe peringatan yang dikenal; tipe lain ditampilkan mentah. */
export function alertTypeLabel(type: string): string {
  return alertTypeLabels[type] ?? type;
}

export const sourceLabel: Record<string, string> = {
  OPERATOR: "Operator",
  AUTOMATION: "Otomatis",
  SYSTEM: "Sistem",
  DEVICE: "Alat",
};

const detectionTypeLabels: Record<string, string> = {
  NUTRIENT_DEFICIENCY: "Kekurangan nutrisi",
  DISEASE: "Penyakit",
};

/** Label jenis deteksi kamera; jenis baru dari model ditampilkan apa adanya. */
export function detectionTypeLabel(type: string): string {
  return detectionTypeLabels[type] ?? type;
}

/** Tipe aktuator (dari katalog hardware) → kata sehari-hari. */
const actuatorTypeLabels: Record<string, string> = {
  DISTRIBUTION_PUMP: "Pompa air utama",
  DOSING_PUMP: "Pompa pupuk",
  STIRRER: "Pengaduk pupuk",
  SENSOR_POWER: "Daya sensor EC",
  CAMERA_PAN: "Arah kamera (timur/barat)",
  // Tipe lama (sebelum Rev A); barisnya dinonaktifkan tapi masih muncul di riwayat.
  SAMPLING_PUMP: "Pompa pengambil sampel",
  FILL_VALVE: "Kran pengisian",
  ILLUMINATION: "Lampu kamera",
  TROLLEY_MOTOR: "Kereta kamera (jalan)",
  TROLLEY_DIRECTION: "Kereta kamera (arah)",
  // Aktuator virtual (BE-1): urutan yang dijalankan edge agent.
  TROLLEY_PATROL: "Patroli kamera",
  TROLLEY_POSITION: "Kereta kamera (pindah stasiun)",
};

export function actuatorTypeLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  return actuatorTypeLabels[type] ?? type;
}

/** Tipe perangkat (dari katalog hardware) → kata sehari-hari. */
const deviceTypeLabels: Record<string, string> = {
  EDGE_GATEWAY: "Komputer utama",
  POWER_METER: "Pengukur listrik",
  MODBUS_IO: "Panel saklar",
  MODBUS_SENSOR_GROUP: "Kelompok sensor",
};

export function deviceTypeLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  return deviceTypeLabels[type] ?? type;
}

const roleLabels: Record<string, string> = { ADMIN: "Admin", OPERATOR: "Operator", VIEWER: "Pelihat" };

export function roleLabel(role: string | null | undefined): string {
  if (!role) return "—";
  return roleLabels[role] ?? role;
}

/** Kode stasiun trolley: 0 → HOME, n → ST-0n (Rev A: 1–10). */
export function stationCode(n: number): string {
  return n <= 0 ? "HOME" : `ST-${String(n).padStart(2, "0")}`;
}

const panDirectionLabels: Record<string, string> = { TIMUR: "Timur", BARAT: "Barat" };

/** Arah kamera saat memotret (TIMUR/BARAT); arah lain ditampilkan apa adanya. */
export function panDirectionLabel(dir: string | null | undefined): string | null {
  if (!dir) return null;
  return panDirectionLabels[dir.toUpperCase()] ?? dir;
}

/** Posisi kereta kamera untuk manusia: "di posisi awal", "di stasiun 3", "belum dilaporkan". */
export function stationLabel(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "belum dilaporkan";
  const r = Math.round(n);
  return r <= 0 ? "di posisi awal (HOME)" : `di stasiun ${r}`;
}

/** Detik → kalimat utuh: "2 menit", "90 detik", "1 jam". */
function durationWords(seconds: number): string {
  if (seconds % 3600 === 0) return `${seconds / 3600} jam`;
  if (seconds % 60 === 0) return `${seconds / 60} menit`;
  return `${seconds} detik`;
}

/** Judul peringatan backend (bahasa Inggris) → bahasa sehari-hari. Dipakai bila `type` tidak tersedia. */
const alertTitleLabels: Record<string, string> = {
  "Device offline": "Alat terputus",
  "Device back online": "Alat terhubung kembali",
  "Running on backup power": "Listrik PLN padam, memakai baterai",
  "Normal power restored": "Listrik PLN kembali normal",
  "Actuator command not delivered": "Perintah tidak terkirim ke alat",
  "Actuator command failed on the device": "Perintah gagal dijalankan alat",
  "Scheduled irrigation skipped": "Penyiraman terjadwal dibatalkan",
};

export function alertTitleLabel(title: string): string {
  return alertTitleLabels[title] ?? title;
}

/** `metadata.failureCode` peringatan (backend ≥ 30 Okt 2026), atau null. */
export function alertFailureCode(metadata: Record<string, unknown> | null | undefined): string | null {
  const v = metadata?.failureCode;
  return typeof v === "string" && v ? v : null;
}

/**
 * Judul peringatan: dari kode di data bila ada (NO_RESPONSE → "Alat tidak menjawab perintah"), lalu
 * label tipe, lalu terjemahan judul lama, lalu judul apa adanya. Tidak menebak dari teks pesan.
 */
export function alertHeadline(type: string | null, title: string, failureCode?: string | null): string {
  if (failureCode === "NO_RESPONSE") return "Alat tidak menjawab perintah";
  const byType = type ? alertTypeLabel(type) : null;
  if (byType && byType !== type) return byType;
  return alertTitleLabel(title);
}

type AlertBodyContext = {
  failureCode?: string | null;
  deviceCode?: string | null;
  actuatorCode?: string | null;
  type?: string | null;
  metadata?: Record<string, unknown> | null;
};

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/**
 * Isi peringatan disusun dari kode di data bila ada (NO_RESPONSE, IRRIGATION_SKIPPED + reasonCode),
 * selain itu terjemahan pesan backend.
 */
export function alertBody(message: string, ctx: AlertBodyContext): string {
  if (ctx.type === "IRRIGATION_SKIPPED") {
    const m = ctx.metadata ?? {};
    const reason = irrigationReasonText(str(m.reasonCode) ?? ctx.failureCode, str(m.conflictingActuatorCode));
    const at = str(m.time) ? ` jam ${str(m.time)}` : "";
    // Tanpa metadata (entri overview) hasilnya ditebak dari kode: kode aturan keselamatan = dibatalkan.
    const failed = m.result ? m.result === "FAILED" : !!ctx.failureCode && !isSafetyCode(ctx.failureCode);
    const what = failed ? "gagal" : "dibatalkan demi keamanan";
    return `Penyiraman${at} ${what}${reason ? `: ${reason}` : ""}. Jadwal berikutnya tetap berjalan.`;
  }
  if (ctx.failureCode === "NO_RESPONSE") {
    return `${ctx.deviceCode ?? "Alat"} tidak menjawab perintah${ctx.actuatorCode ? ` untuk ${ctx.actuatorCode}` : ""}. Perintah mungkin tidak dijalankan; periksa keadaan alat.`;
  }
  return alertMessageLabel(message);
}

const commandWords: Record<string, string> = {
  ON: "menyalakan",
  OFF: "mematikan",
  START: "memulai",
  STOP: "menghentikan",
  HOME: "mengembalikan",
  GOTO_STATION: "memindahkan",
};

/** "KODE: teks" dari alat → teks saja (kodenya untuk panel teknis, bukan untuk petani). */
function deviceReason(raw: string): string {
  const m = /^[A-Z][A-Z0-9_]{2,63}:\s*([\s\S]+)$/.exec(raw.trim());
  return m ? m[1] : raw;
}

/*
 * Pesan peringatan backend ditulis untuk developer. Pola yang dikenal diterjemahkan ke kalimat yang
 * langsung menyebut langkah yang perlu dicek; pesan lain (mis. dari alat) ditampilkan apa adanya.
 */
const alertMessageRules: [RegExp, (m: RegExpExecArray) => string][] = [
  [
    /^No message received from (\S+) for more than (\d+) seconds$/,
    (m) => `${m[1]} tidak memberi kabar selama lebih dari ${durationWords(Number(m[2]))}. Periksa listrik dan kabel alat ini.`,
  ],
  [/^Device (\S+) started reporting again$/, (m) => `${m[1]} kembali memberi kabar.`],
  [
    /^Device (\S+) reports power source (\S+)\. Commands .*refused\.$/,
    (m) => `${m[1]} memakai listrik dari ${powerSourceLabel(m[2])}. Pompa dan alat besar dikunci sampai listrik PLN kembali.`,
  ],
  [/^Device (\S+) reports power source (\S+) again$/, (m) => `${m[1]} kembali memakai listrik ${powerSourceLabel(m[2])}.`],
  [
    /^Command (\S+) for actuator (\S+) could not be delivered: .*$/,
    (m) => `Perintah ${commandWords[m[1].toUpperCase()] ?? m[1]} ${m[2]} tidak sampai ke alat. Periksa koneksi alat, lalu coba lagi.`,
  ],
  [
    /^Device (\S+) reported that command (\S+) failed: (.*)$/,
    (m) =>
      `${m[1]} gagal ${commandWords[m[2].toUpperCase()] ?? `menjalankan ${m[2]}`}.` +
      (m[3] === "Device reported failure" ? " Periksa alatnya, lalu coba lagi." : ` Alasan dari alat: ${deviceReason(m[3])}`),
  ],
];

export function alertMessageLabel(message: string): string {
  for (const [re, fmt] of alertMessageRules) {
    const m = re.exec(message.trim());
    if (m) return fmt(m);
  }
  return message;
}

/** Nama perangkat bawaan backend (bahasa Inggris/teknis) → nama yang dikenali petani. */
const deviceNameLabels: Record<string, string> = {
  "development edge device": "Komputer Simulasi (Dev)",
  "greenhouse edge device": "Komputer Utama Greenhouse",
};

export function deviceNameLabel(name: string | null | undefined): string | null {
  if (!name) return null;
  return deviceNameLabels[name.trim().toLowerCase()] ?? name;
}
