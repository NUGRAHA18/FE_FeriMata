/* Kode alasan pemupukan dari backend (`reasonCode` run, `metadata.reasonCode` FERTILIZATION_*). Sengaja tanpa
 * import agar lib/format & lib/fertilization tak saling bergantung. */

/** Huruf kecil, disambung setelah "Belum dipupuk: ". */
const reasonText: Record<string, string> = {
  AI_UNAVAILABLE: "layanan AI tidak menjawab",
  AI_NOT_CONFIGURED: "AI belum diatur",
  AI_INPUTS_NOT_READY: "data sensor tanah belum ada atau sudah lama",
  PUMP_UNAVAILABLE: "pompa pupuk atau pengaduk tidak ditemukan atau dimatikan",
  AI_NO_DOSE_NEEDED: "AI menilai tanah tidak perlu pupuk",
  AI_CAPPED: "takaran dari AI dipotong ke batas pompa",
  BACKEND_DOWN: "sistem mati saat jadwalnya",
  NO_ACK: "alat tidak menjawab perintah",
  NO_RESPONSE: "alat tidak menjawab perintah",
  PREVIOUS_PUMP_STILL_ON: "pompa sebelumnya belum mati",
  COMMAND_NOT_FOUND: "catatan perintah ke pompa hilang",
  DEVICE_REFUSED: "alat menolak perintah",
  DEVICE_NOT_ONLINE: "panel pompa sedang terputus",
  // Aturan keselamatan backend & kode gagal dari alat.
  BACKUP_POWER: "listrik PLN padam, memakai baterai",
  INTERLOCK_POWER: "listrik PLN padam atau belum terbaca",
  FLOAT_LOW: "air drum pupuk rendah",
  INTERLOCK_FLOAT: "air drum pupuk rendah",
  EXCLUSIVE_OPERATION: "alat lain sedang berjalan",
  INTERLOCK_EXCLUSIVE: "alat lain sedang berjalan",
  BUSY: "alat sedang menjalankan tugas lain",
  OUTPUT_FAULT: "saklar pompa bermasalah",
  RELAY_MISMATCH: "saklar pompa tidak berpindah",
  DEVICE_OFFLINE: "modul saklar tidak menjawab",
};

export function fertilizationReasonText(code: string | null | undefined): string | null {
  if (!code) return null;
  return reasonText[code] ?? "alasan lain (lihat Info teknis)";
}
