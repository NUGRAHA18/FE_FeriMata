import { siteConfig } from "@/config/site";

/*
 * Formatter tampilan: angka, satuan, waktu (WIB) — semua dalam Bahasa Indonesia.
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

/** Label sumber daya. Keputusan "daya cadangan" tetap memakai onBackupPower dari backend. */
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

export const livenessLabel: Record<string, string> = {
  ONLINE: "Online",
  OFFLINE: "Offline",
  UNKNOWN: "Belum melapor",
};

export const commandStatusLabel: Record<string, string> = {
  PENDING: "Menunggu",
  SENT: "Terkirim — menunggu konfirmasi perangkat",
  EXECUTED: "Dijalankan",
  FAILED: "Gagal",
  CANCELLED: "Dibatalkan",
};

export const severityLabel: Record<string, string> = {
  INFO: "Info",
  WARNING: "Peringatan",
  CRITICAL: "Kritis",
};

const alertTypeLabels: Record<string, string> = {
  DEVICE_OFFLINE: "Perangkat offline",
  DEVICE_RECOVERED: "Perangkat kembali online",
  ACTUATOR_COMMAND_FAILED: "Perintah aktuator gagal",
  TELEMETRY_REJECTED: "Telemetri ditolak",
  POWER_BACKUP: "Beralih ke daya cadangan",
  POWER_RESTORED: "Daya PLN pulih",
  DEVICE_REPORTED: "Laporan perangkat",
  SSR_SHORT: "SSR terhubung singkat",
  PUMP_DRY_RUN: "Pompa berjalan kering",
  DOSING_NOT_CONVERGING: "Dosing tidak konvergen",
  TROLLEY_LIMIT_HIT: "Trolley menyentuh limit",
  MODBUS_TIMEOUT: "Timeout Modbus",
};

/** Label Indonesia untuk tipe alert yang dikenal; tipe lain ditampilkan mentah. */
export function alertTypeLabel(type: string): string {
  return alertTypeLabels[type] ?? type;
}

export const sourceLabel: Record<string, string> = {
  OPERATOR: "Operator",
  AUTOMATION: "Otomasi",
  SYSTEM: "Sistem",
  DEVICE: "Perangkat",
};

/** Kode stasiun trolley: 0 → HOME, 1–12 → ST-01…ST-12. */
export function stationCode(n: number): string {
  return n <= 0 ? "HOME" : `ST-${String(n).padStart(2, "0")}`;
}
