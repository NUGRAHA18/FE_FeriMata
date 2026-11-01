/* Kode alasan siram dari backend (`lastReasonCode`, `metadata.reasonCode` IRRIGATION_SKIPPED; teks Inggris
 * tak ditampilkan). Sengaja tanpa import agar lib/format & lib/irrigation tak saling bergantung. */

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

/** Huruf kecil, disambung setelah "Dibatalkan demi keamanan: "; kode tak dikenal → "gagal mengirim perintah".
 *  `conflictingActuatorCode` hanya ada di metadata peringatan EXCLUSIVE_OPERATION. */
export function irrigationReasonText(code: string | null | undefined, conflictingActuatorCode?: string | null): string | null {
  if (!code) return null;
  if (code === "EXCLUSIVE_OPERATION" && conflictingActuatorCode) return `${conflictingActuatorCode} sedang berjalan`;
  return reasonText[code] ?? "gagal mengirim perintah";
}
