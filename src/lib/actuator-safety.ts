import { ApiRequestError } from "@/lib/api/client";

/*
 * Aturan keselamatan kontrol aktuator (lihat docs/arsip/prompt-frontend-awal.md § Kontrol aktuator).
 * Keputusan akhir selalu milik backend; fungsi di sini hanya menerjemahkan & memvalidasi input.
 * Pesan ditulis untuk petani: tanpa istilah "interlock", "dosing", "broker".
 */

/** Batas tunggu jawaban alat sebelum menampilkan peringatan. */
export const ACK_WARNING_MS = 30_000;

const interlockText: Record<string, string> = {
  BACKUP_POWER: "Listrik PLN padam dan sistem memakai baterai. Pompa air utama, pompa pupuk, pengaduk, dan kereta kamera tidak boleh dinyalakan dulu.",
  EXCLUSIVE_OPERATION: "Tidak bisa berjalan bersamaan: pompa pupuk dan pengaduk tidak boleh jalan saat kereta kamera bergerak atau pompa air utama menyala.",
  BLOCKED_WHILE_ACTIVE: "Arah kamera tidak bisa diputar saat kereta kamera sedang bergerak. Tunggu kereta berhenti dulu.",
  FLOAT_LOW: "Air di drum pupuk rendah, atau kabel pelampungnya putus. Pompa air utama, pompa pupuk, dan pengaduk tidak bisa dinyalakan sampai air cukup.",
  DEVICE_NOT_ONLINE: "Alat sedang terputus, perintah tidak bisa dikirim.",
};

export type CommandErrorView = { kind: "interlock"; interlock: string | null; title: string; message: string } | { kind: "error"; title: string; message: string };

/** Terjemahkan error POST /commands menjadi pesan untuk pengguna. */
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
    if (err.code === "INVALID_COMMAND") return { kind: "error", title: "Perintah tidak bisa dijalankan", message: err.message };
    if (err.code === "MESSAGING_ERROR") return { kind: "error", title: "Koneksi ke alat terputus", message: "Perintah tidak sampai ke alat dan dicatat sebagai gagal. Coba lagi nanti." };
    if (err.code === "VALIDATION_ERROR") {
      const fields = Object.values(err.fieldErrors());
      return { kind: "error", title: "Isian belum benar", message: fields.length ? fields.join("; ") : err.message };
    }
    return { kind: "error", title: "Perintah gagal dikirim", message: err.message };
  }
  return { kind: "error", title: "Perintah gagal dikirim", message: err instanceof Error ? err.message : "Kesalahan tidak diketahui." };
}

/**
 * Validasi input durasi untuk perintah ON. Wajib bila maxRunSeconds tidak null (dan ≤ batas).
 * Bila tidak wajib dan kosong → null (tanpa durasi). Backend tetap bisa menolak (INVALID_COMMAND).
 */
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

/** Status yang dilaporkan alat — bukan yang diminta. */
export function reportedStateLabel(state: string | null | undefined): string {
  if (state == null) return "Belum dilaporkan";
  const s = state.toUpperCase();
  if (s === "ON") return "Menyala";
  if (s === "OFF") return "Mati";
  return state;
}
