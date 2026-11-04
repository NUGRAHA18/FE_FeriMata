/* Kode alasan pemupukan dari backend (`reasonCode` run, `metadata.reasonCode` FERTILIZATION_*). Sengaja tanpa
 * import agar lib/format & lib/fertilization tak saling bergantung. */

/** Huruf kecil, disambung setelah "Belum dipupuk: ". */
const reasonText: Record<string, string> = {
  AI_UNAVAILABLE: "layanan AI tidak menjawab",
  AI_NOT_CONFIGURED: "AI belum diatur",
  AI_INPUTS_NOT_READY: "data sensor tanah belum ada atau sudah lama",
  // AI butuh foto daun ≤ 72 jam; tanpa itu BE tidak memanggil AI.
  AI_NO_PHOTO: "belum ada foto daun dari kamera 3 hari terakhir",
  PUMP_UNAVAILABLE: "pompa pupuk atau pengaduk tidak ditemukan atau dimatikan",
  AI_NO_DOSE_NEEDED: "AI menilai tanah tidak perlu pupuk",
  AI_CAPPED: "takaran dari AI dipotong ke batas pompa",
  // Takaran isian petani (BE ≥ 4 Nov 2026).
  TANK_DATA_NOT_READY: "data EC/pH drum belum ada atau sudah lama",
  PUMP_NOT_CALIBRATED: "pompa pupuk belum ditakar debitnya",
  DOSE_CAPPED: "takaran Anda dipotong ke batas pompa",
  BACKEND_DOWN: "sistem mati saat jadwalnya",
  NO_ACK: "perangkat tidak menjawab perintah",
  NO_RESPONSE: "perangkat tidak menjawab perintah",
  PREVIOUS_PUMP_STILL_ON: "pompa sebelumnya belum mati",
  COMMAND_NOT_FOUND: "catatan perintah ke pompa hilang",
  DEVICE_REFUSED: "perangkat menolak perintah",
  DEVICE_NOT_ONLINE: "panel pompa sedang terputus",
  // Aturan keselamatan backend & kode gagal dari perangkat.
  BACKUP_POWER: "listrik PLN padam, memakai baterai",
  INTERLOCK_POWER: "listrik PLN padam atau belum terbaca",
  FLOAT_LOW: "air drum pupuk rendah",
  INTERLOCK_FLOAT: "air drum pupuk rendah",
  EXCLUSIVE_OPERATION: "perangkat lain sedang berjalan",
  INTERLOCK_EXCLUSIVE: "perangkat lain sedang berjalan",
  BUSY: "perangkat sedang menjalankan tugas lain",
  OUTPUT_FAULT: "saklar pompa bermasalah",
  RELAY_MISMATCH: "saklar pompa tidak berpindah",
  DEVICE_OFFLINE: "modul saklar tidak menjawab",
  BLOCKED_WHILE_ACTIVE: "perangkat lain sedang berjalan",
  // ErrorCode BE: MESSAGING_ERROR = gagal ke broker, pompa pasti tidak menyala.
  MESSAGING_ERROR: "perintah tidak sampai ke pompa pupuk",
  INVALID_COMMAND: "perintah ditolak sistem",
  NOT_READY: "perangkat belum siap",
  EXPIRED: "perintah terlambat sampai ke perangkat",
};

export function fertilizationReasonText(code: string | null | undefined): string | null {
  if (!code) return null;
  return reasonText[code] ?? "alasan lain (lihat Detail sistem)";
}
