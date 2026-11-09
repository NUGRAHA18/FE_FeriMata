/* Kode alasan siram dari backend (`lastReasonCode`, `metadata.reasonCode` IRRIGATION_SKIPPED; teks Inggris
 * tak ditampilkan). Sengaja tanpa import agar lib/format & lib/irrigation tak saling bergantung. */

const reasonText: Record<string, string> = {
  BACKUP_POWER: "listrik PLN padam, memakai baterai",
  FLOAT_LOW: "air drum rendah",
  EXCLUSIVE_OPERATION: "perangkat lain sedang berjalan",
  BLOCKED_WHILE_ACTIVE: "perangkat lain sedang bergerak",
  DEVICE_NOT_ONLINE: "panel pompa sedang terputus",
  PUMP_UNAVAILABLE: "pompa siram tidak ditemukan atau dimatikan",
  BACKEND_DOWN: "sistem mati saat jamnya",
  // FAILED (ErrorCode BE): MESSAGING_ERROR = gagal ke broker, pompa pasti tidak menyala.
  MESSAGING_ERROR: "perintah tidak sampai ke pompa siram",
  INVALID_COMMAND: "perintah ditolak sistem (pompa dimatikan atau lama siram melebihi batas)",
  // Keputusan AI (fuzzy) saat jam siram tiba.
  AI_NO_WATER_NEEDED: "AI menilai tanah masih cukup basah",
  AI_CAPPED: "lama dari AI dipotong ke batas pompa",
  AI_NOT_CONFIGURED: "AI belum diatur",
  AI_INPUTS_NOT_READY: "data sensor tanah belum ada atau sudah lama",
  AI_UNAVAILABLE: "layanan AI tidak menjawab",
  // AI butuh foto patroli ≤ 24 jam; tanpa itu BE tidak memanggil AI (BE ≥ 2 Nov 2026).
  AI_NO_PHOTO: "belum ada foto kamera 24 jam terakhir",
  // Penolakan dari perangkat sendiri (`commandFailureCode` riwayat siram).
  INTERLOCK_POWER: "listrik PLN padam atau belum terbaca",
  INTERLOCK_FLOAT: "air drum rendah",
  INTERLOCK_EXCLUSIVE: "perangkat lain sedang berjalan",
  // Pemupukan otomatis (BE ≥ 2 Nov 2026).
  FERTILIZING: "menunggu pemupukan selesai",
  FERTILIZATION_IN_PROGRESS: "pemupukan sedang berjalan",
};

const SAFETY_CODES = new Set(["BACKUP_POWER", "FLOAT_LOW", "EXCLUSIVE_OPERATION", "BLOCKED_WHILE_ACTIVE", "DEVICE_NOT_ONLINE"]);

/** AI memutuskan tidak perlu siram: hasil normal, bukan pembatalan atau kegagalan. */
export const AI_NO_WATER_NEEDED = "AI_NO_WATER_NEEDED";

/** Kode aturan keselamatan (interlock): penyiraman dibatalkan, bukan gagal. */
export const isSafetyCode = (code: string) => SAFETY_CODES.has(code);

/** Huruf kecil, disambung setelah "Dibatalkan demi keamanan: "; kode tak dikenal → "alasan lain" (kodenya ada di Detail sistem; penyebab tidak ditebak).
 *  `conflictingActuatorCode` hanya ada di metadata peringatan EXCLUSIVE_OPERATION. */
export function irrigationReasonText(code: string | null | undefined, conflictingActuatorCode?: string | null): string | null {
  if (!code) return null;
  if (code === "EXCLUSIVE_OPERATION" && conflictingActuatorCode) return `${conflictingActuatorCode} sedang berjalan`;
  return reasonText[code] ?? "alasan lain (lihat Detail sistem)";
}
