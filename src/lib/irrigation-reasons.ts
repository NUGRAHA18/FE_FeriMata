/*
 * Alasan jadwal siram tidak berjalan, dari kode backend (`lastReasonCode` jadwal, `metadata.reasonCode`
 * peringatan IRRIGATION_SKIPPED). Pesan teks backend berbahasa Inggris dan tidak ditampilkan ke petani.
 * Modul tanpa import supaya bisa dipakai lib/format dan lib/irrigation tanpa saling bergantung.
 *
 * Kode interlock sama dengan `details.interlock` penolakan perintah biasa (penjelasan panjangnya di
 * lib/actuator-safety → interlockExplanation).
 */

const reasonText: Record<string, string> = {
  BACKUP_POWER: "listrik PLN padam, memakai baterai",
  FLOAT_LOW: "air drum rendah",
  EXCLUSIVE_OPERATION: "alat lain sedang berjalan",
  BLOCKED_WHILE_ACTIVE: "alat lain sedang bergerak",
  DEVICE_NOT_ONLINE: "panel pompa sedang terputus",
  PUMP_UNAVAILABLE: "pompa siram tidak ditemukan atau dimatikan",
  BACKEND_DOWN: "sistem mati saat jamnya",
  // Keputusan AI (fuzzy) saat jam siram tiba.
  AI_NO_WATER_NEEDED: "AI menilai tanah masih cukup basah",
  AI_CAPPED: "lama dari AI dipotong ke batas pompa",
  AI_NOT_CONFIGURED: "AI belum diatur",
  AI_INPUTS_NOT_READY: "data sensor tanah belum ada atau sudah lama",
  AI_UNAVAILABLE: "layanan AI tidak menjawab",
};

const SAFETY_CODES = new Set(["BACKUP_POWER", "FLOAT_LOW", "EXCLUSIVE_OPERATION", "BLOCKED_WHILE_ACTIVE", "DEVICE_NOT_ONLINE"]);

/** AI memutuskan tidak perlu siram: hasil normal, bukan pembatalan atau kegagalan. */
export const AI_NO_WATER_NEEDED = "AI_NO_WATER_NEEDED";

/** Kode aturan keselamatan (interlock): penyiraman dibatalkan, bukan gagal. */
export const isSafetyCode = (code: string) => SAFETY_CODES.has(code);

/**
 * Alasan singkat (huruf kecil, untuk disambung setelah "Dibatalkan demi keamanan: "). Kode lain yang
 * bukan interlock (INVALID_COMMAND, MESSAGE_PUBLISH_FAILED, …) → "gagal mengirim perintah".
 * `conflictingActuatorCode` (EXCLUSIVE_OPERATION, hanya di metadata peringatan) menyebut alatnya.
 */
export function irrigationReasonText(code: string | null | undefined, conflictingActuatorCode?: string | null): string | null {
  if (!code) return null;
  if (code === "EXCLUSIVE_OPERATION" && conflictingActuatorCode) return `${conflictingActuatorCode} sedang berjalan`;
  return reasonText[code] ?? "gagal mengirim perintah";
}
