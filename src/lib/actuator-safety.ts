import { ApiRequestError } from "@/lib/api/client";

// Keselamatan aktuator: keputusan akhir milik backend; di sini hanya terjemahan & validasi input.
// Pesan untuk petani, tanpa istilah "interlock"/"dosing"/"broker".

/** Batas tunggu jawaban alat sebelum menampilkan peringatan. */
export const ACK_WARNING_MS = 30_000;

const interlockText: Record<string, string> = {
  BACKUP_POWER: "Listrik PLN padam dan sistem memakai baterai. Pompa air utama, pompa pupuk, pengaduk, dan kereta kamera tidak boleh dinyalakan dulu.",
  EXCLUSIVE_OPERATION: "Tidak bisa berjalan bersamaan: pompa pupuk dan pengaduk tidak boleh jalan saat kereta kamera bergerak atau pompa air utama menyala.",
  BLOCKED_WHILE_ACTIVE: "Arah kamera tidak bisa diputar saat kereta kamera sedang bergerak. Tunggu kereta berhenti dulu.",
  FLOAT_LOW: "Air di drum pupuk rendah, atau kabel pelampungnya putus. Pompa air utama, pompa pupuk, dan pengaduk tidak bisa dinyalakan sampai air cukup.",
  DEVICE_NOT_ONLINE: "Alat sedang terputus, perintah tidak bisa dikirim.",
};

/** Penjelasan panjang satu kode interlock (juga dipakai alasan jadwal siram), atau null bila bukan interlock. */
export function interlockExplanation(code: string | null | undefined): string | null {
  return (code && interlockText[code]) || null;
}

export type CommandErrorView = { kind: "interlock"; interlock: string | null; title: string; message: string } | { kind: "error"; title: string; message: string };

export function describeCommandError(err: unknown): CommandErrorView {
  if (err instanceof ApiRequestError) {
    if (err.code === "SAFETY_INTERLOCK") {
      const interlock = typeof err.details?.interlock === "string" ? err.details.interlock : null;
      return {
        kind: "interlock",
        interlock,
        title: "Ditolak demi keamanan",
        message: (interlock && interlockText[interlock]) || err.message,
      };
    }
    if (err.code === "INVALID_COMMAND") return { kind: "error", title: "Perintah tidak bisa dijalankan", message: invalidCommandText(err) };
    if (err.code === "MESSAGING_ERROR") return { kind: "error", title: "Koneksi ke alat terputus", message: "Perintah tidak sampai ke alat dan dicatat sebagai gagal. Coba lagi nanti." };
    if (err.code === "VALIDATION_ERROR") {
      const fields = Object.values(err.fieldErrors());
      return { kind: "error", title: "Isian belum benar", message: fields.length ? fields.join("; ") : err.message };
    }
    return { kind: "error", title: "Perintah gagal dikirim", message: err.message };
  }
  return { kind: "error", title: "Perintah gagal dikirim", message: err instanceof Error ? err.message : "Kesalahan tidak diketahui." };
}

/** Durasi ON wajib (≤ batas) bila maxRunSeconds ada; selain itu kosong → null. Backend tetap bisa
 *  menolak (INVALID_COMMAND). */
export function validateDuration(raw: string, maxRunSeconds: number | null): { ok: true; value: number | null } | { ok: false; error: string } {
  const text = raw.trim();
  if (!text) {
    if (maxRunSeconds != null) return { ok: false, error: `Durasi wajib diisi (paling lama ${maxRunSeconds} detik).` };
    return { ok: true, value: null };
  }
  if (!/^\d+$/.test(text)) return { ok: false, error: "Durasi harus angka bulat dalam detik." };
  const n = Number(text);
  if (n <= 0) return { ok: false, error: "Durasi harus lebih dari 0 detik." };
  if (maxRunSeconds != null && n > maxRunSeconds) return { ok: false, error: `Durasi maksimal ${maxRunSeconds} detik.` };
  return { ok: true, value: n };
}

export function buildCommand(command: "ON" | "OFF", durationSeconds: number | null) {
  if (command === "ON" && durationSeconds != null) return { command, parameters: { durationSeconds } };
  return { command };
}

/** 400 INVALID_COMMAND (BE-1): details berisi `parameter` + batas, atau `supportedCommands` bila nama salah. */
function invalidCommandText(err: ApiRequestError): string {
  const d = err.details ?? {};
  const num = (v: unknown) => String(v).replace(".", ",");
  const range = typeof d.min === "number" && typeof d.max === "number" ? `${num(d.min)} sampai ${num(d.max)}` : null;
  if (d.parameter === "station") return range ? `Nomor stasiun harus ${range}.` : "Nomor stasiun tidak diterima.";
  if (d.parameter === "targetEc") return range ? `Target EC harus ${range} mS/cm.` : "Target EC tidak diterima.";
  if (d.parameter === "phase") return "Fase tanam tidak dikenali alat. Pilih salah satu fase di daftar.";
  if (Array.isArray(d.supportedCommands)) return "Alat ini tidak menerima perintah tersebut. Muat ulang halaman lalu coba lagi.";
  return err.message;
}

// Kode ACK gagal edge agent (BE-7, MQTT §4.3 "KODE: teks"), disimpan di `failureCode`.
// Kode tak dikenal ditampilkan dengan teks dari alat.
const failureCodeText: Record<string, string> = {
  EXPIRED: "Perintah terlambat sampai ke alat dan sudah kedaluwarsa. Coba kirim lagi.",
  UNSUPPORTED: "Alat belum bisa menjalankan perintah ini.",
  INVALID: "Isian perintah tidak diterima alat.",
  NOT_READY: "Alat belum siap. Tunggu sebentar lalu coba lagi.",
  BUSY: "Alat sedang menjalankan tugas lain (patroli, pindah kereta, atau campur pupuk). Tunggu selesai atau hentikan dulu.",
  INTERLOCK_EXCLUSIVE: "Tidak bisa berjalan bersamaan dengan alat lain yang sedang menyala.",
  INTERLOCK_FLOAT: "Air di drum pupuk rendah atau kabel pelampungnya putus. Pompa air utama, pompa pupuk, dan pengaduk dikunci sampai air cukup.",
  INTERLOCK_MOVING: "Kereta kamera sedang bergerak. Tunggu sampai berhenti.",
  INTERLOCK_LIMIT: "Kereta kamera sudah di ujung rel ke arah itu.",
  INTERLOCK_POWER: "Listrik PLN padam atau belum terbaca. Pompa dan alat besar dikunci sampai listrik PLN normal.",
  OUTPUT_FAULT: "Saklar alat ini bermasalah. Periksa panel saklar.",
  DEVICE_OFFLINE: "Modul saklar tidak menjawab. Periksa kabel dan listrik modulnya.",
  RELAY_MISMATCH: "Saklar tidak berpindah seperti yang diperintahkan. Periksa panel saklar.",
  TROLLEY_LOCKED: "Kereta kamera dikunci karena kabel sensor ujung rel bermasalah. Periksa kabelnya.",
  DISK_FULL: "Penyimpanan foto di komputer utama penuh, patroli tidak dijalankan.",
  // Ditetapkan backend (bukan alat): tidak ada ACK dalam 2 menit. Hasilnya tidak diketahui.
  NO_RESPONSE: "Alat tidak menjawab dalam 2 menit. Perintah mungkin tidak dijalankan; periksa keadaan alat.",
};

/** Perintah ditutup backend karena alat tidak menjawab — hasilnya tidak diketahui, bukan ditolak. */
export function isNoResponse(cmd: { status: string; failureCode?: string | null }): boolean {
  return cmd.status === "FAILED" && cmd.failureCode === "NO_RESPONSE";
}

export function commandStatusText(cmd: { status: string; failureCode?: string | null }, labels: Record<string, string>): string {
  return isNoResponse(cmd) ? "Alat tidak menjawab" : (labels[cmd.status] ?? cmd.status);
}

export type CommandFailureView = { code: string | null; message: string; detail: string | null };

/** Pisahkan "KODE: teks" dari pesan alat. */
export function splitFailureMessage(text: string | null | undefined): { code: string | null; text: string | null } {
  if (!text?.trim()) return { code: null, text: null };
  const m = /^([A-Z][A-Z0-9_]{2,63}):\s*([\s\S]*)$/.exec(text.trim());
  return m ? { code: m[1], text: m[2] || null } : { code: null, text: text.trim() };
}

/** `message` = terjemahan kode bila dikenal, selain itu teks alat; `detail` = teks asli alat bila berbeda. */
export function describeCommandFailure(cmd: { failureCode?: string | null; errorMessage: string | null }): CommandFailureView | null {
  const parsed = splitFailureMessage(cmd.errorMessage);
  const code = cmd.failureCode ?? parsed.code;
  if (!code && !parsed.text) return null;
  const known = code ? failureCodeText[code] : undefined;
  const message = known ?? parsed.text ?? "Alat tidak menjelaskan alasannya.";
  return { code, message, detail: known && parsed.text && parsed.text !== known ? parsed.text : null };
}

/** Status yang dilaporkan alat — bukan yang diminta. Aktuator berurutan (patroli, campur pupuk) "berjalan". */
export function reportedStateLabel(state: string | null | undefined, sequence = false): string {
  if (state == null) return "Belum dilaporkan";
  const s = state.toUpperCase();
  if (s === "ON") return sequence ? "Sedang berjalan" : "Menyala";
  if (s === "OFF") return sequence ? "Tidak berjalan" : "Mati";
  return state;
}
