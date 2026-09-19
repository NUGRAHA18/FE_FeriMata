import { ApiRequestError } from "@/lib/api/client";

/*
 * Aturan keselamatan kontrol aktuator (lihat prompt-frontend.md § Kontrol aktuator).
 * Keputusan akhir selalu milik backend; fungsi di sini hanya menerjemahkan & memvalidasi input.
 */

/** Batas tunggu konfirmasi perangkat sebelum menampilkan peringatan. */
export const ACK_WARNING_MS = 30_000;

const interlockText: Record<string, string> = {
  BACKUP_POWER: "Listrik PLN padam / daya cadangan: dosing, sampling, dan trolley diblokir.",
  EXCLUSIVE_OPERATION: "Tidak bisa berjalan bersamaan: dosing tidak boleh jalan saat trolley bergerak atau LED capture menyala.",
  DEVICE_NOT_ONLINE: "Perangkat sedang offline; perintah ditolak.",
};

export type CommandErrorView = { kind: "interlock"; interlock: string | null; title: string; message: string } | { kind: "error"; title: string; message: string };

/** Terjemahkan error POST /commands menjadi pesan untuk operator. */
export function describeCommandError(err: unknown): CommandErrorView {
  if (err instanceof ApiRequestError) {
    if (err.code === "SAFETY_INTERLOCK") {
      const interlock = typeof err.details?.interlock === "string" ? err.details.interlock : null;
      return {
        kind: "interlock",
        interlock,
        title: "Ditolak oleh interlock keselamatan",
        message: (interlock && interlockText[interlock]) || err.message,
      };
    }
    if (err.code === "INVALID_COMMAND") return { kind: "error", title: "Perintah tidak valid", message: err.message };
    if (err.code === "MESSAGING_ERROR") return { kind: "error", title: "Broker tidak tersedia", message: "Broker tidak tersedia; perintah tercatat sebagai gagal." };
    if (err.code === "VALIDATION_ERROR") {
      const fields = Object.values(err.fieldErrors());
      return { kind: "error", title: "Input tidak valid", message: fields.length ? fields.join("; ") : err.message };
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
    if (maxRunSeconds != null) return { ok: false, error: `Durasi wajib diisi (maks ${maxRunSeconds} detik).` };
    return { ok: true, value: null };
  }
  if (!/^\d+$/.test(text)) return { ok: false, error: "Durasi harus bilangan bulat detik." };
  const n = Number(text);
  if (n <= 0) return { ok: false, error: "Durasi harus lebih dari 0 detik." };
  if (maxRunSeconds != null && n > maxRunSeconds) return { ok: false, error: `Durasi maksimal ${maxRunSeconds} detik.` };
  return { ok: true, value: n };
}

export function buildCommand(command: "ON" | "OFF", durationSeconds: number | null) {
  if (command === "ON" && durationSeconds != null) return { command, parameters: { durationSeconds } };
  return { command };
}

/** Status yang dilaporkan perangkat — bukan yang diminta. */
export function reportedStateLabel(state: string | null | undefined): string {
  if (state == null) return "Belum dilaporkan";
  const s = state.toUpperCase();
  if (s === "ON") return "Menyala";
  if (s === "OFF") return "Mati";
  return state;
}
