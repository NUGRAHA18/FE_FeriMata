import type { AiHistoryRow, AiServiceStatus } from "@/lib/api/types";
import { aiTimestamp, num } from "@/lib/fertilization";

/* Layanan AI tim AI (diteruskan backend). Hasil deteksi & riwayat diteruskan apa adanya, jadi dibaca defensif. */

export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/** `short` untuk lencana; `text` + `detail` untuk kartu. Pesan mentah AI (`message`) hanya di Detail sistem. */
export type AiStatusView = { tone: "ok" | "danger" | "neutral"; text: string; short: string; detail: string | null };

export function aiStatusView(s: AiServiceStatus | undefined, failed = false): AiStatusView {
  if (!s) {
    return failed
      ? { tone: "neutral", text: "Status layanan AI tidak diketahui", short: "Status AI tidak diketahui", detail: "Sistem belum bisa dihubungi sekarang." }
      : { tone: "neutral", text: "Memeriksa layanan AI…", short: "Memeriksa AI…", detail: null };
  }
  // Belum diatur = pilihan pemasangan (alamat AI kosong di server), bukan kerusakan → netral.
  if (!s.configured) {
    return { tone: "neutral", text: "Layanan AI belum diatur", short: "AI belum diatur", detail: "Siram memakai durasi cadangan; pupuk otomatis tidak berjalan." };
  }
  if (!s.reachable) {
    return {
      tone: "danger",
      text: "Layanan AI mati",
      short: "AI mati",
      detail: "Siram memakai durasi cadangan, pemupukan otomatis ditunda sampai AI menyala lagi.",
    };
  }
  return { tone: "ok", text: "Layanan AI berjalan", short: "AI berjalan", detail: "Durasi siram dan takaran pupuk dihitung AI." };
}

/** Foto yang akan diunggah → pesan salah pertama, atau null bila boleh dikirim. */
export function validatePhotos(files: { name: string; size: number; type: string }[]): string | null {
  if (files.length > MAX_PHOTOS) return `Paling banyak ${MAX_PHOTOS} foto sekali periksa.`;
  const big = files.find((f) => f.size > MAX_PHOTO_BYTES);
  if (big) return `Foto ${big.name} terlalu besar. Paling besar 10 MB per foto.`;
  const notImage = files.find((f) => f.type && !f.type.startsWith("image/"));
  if (notImage) return `${notImage.name} bukan foto. Pilih berkas JPG atau PNG.`;
  return null;
}

/** Kekurangan nutrisi: { kelas: persen 0–100 } → baris berurutan terbesar dulu. Nilai non-angka dibuang. */
export function deficiencyRows(result: unknown): [string, number][] {
  if (!result || typeof result !== "object" || Array.isArray(result)) return [];
  return Object.entries(result as Record<string, unknown>)
    .filter((e): e is [string, number] => typeof e[1] === "number" && Number.isFinite(e[1]))
    .sort((a, b) => b[1] - a[1]);
}

/** Penyakit: daftar label yang ditemukan (unik). */
export function diseaseLabels(result: unknown): string[] {
  if (!Array.isArray(result)) return [];
  return [...new Set(result.filter((x): x is string => typeof x === "string" && x.trim() !== ""))];
}

export type IrrigationDecision = { at: string | null; seconds: number | null; hst: number | null; input: Record<string, unknown> | null };
export type FertilizationDecision = { at: string | null; n: number | null; p: number | null; k: number | null; input: Record<string, unknown> | null };

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

export function irrigationDecision(row: AiHistoryRow): IrrigationDecision {
  return { at: aiTimestamp(row.run_at), seconds: num(row.watering_duration), hst: num(row.hst), input: obj(row.data_sensor) };
}

/** Nama kolom AI: nitrogen_duration, phosfor_duration, kalium_duration. */
export function fertilizationDecision(row: AiHistoryRow): FertilizationDecision {
  return {
    at: aiTimestamp(row.run_at),
    n: num(row.nitrogen_duration),
    p: num(row.phosfor_duration ?? row.phosphorus_duration),
    k: num(row.kalium_duration ?? row.potassium_duration),
    input: obj(row.data_input),
  };
}

/** Kunci masukan AI (snake_case) → label petani. Kunci tak dikenal ditampilkan apa adanya. */
export const aiInputLabels: Record<string, string> = {
  ec_water: "EC air",
  ph_water: "pH air",
  temp_water: "Suhu air",
  temp_air: "Suhu udara",
  rh: "Kelembapan udara",
  soil_moisture: "Kelembapan tanah",
  temp_soil: "Suhu tanah",
  ph: "pH tanah",
  n: "N tanah",
  p: "P tanah",
  k: "K tanah",
  n_soil: "N tanah",
  p_soil: "P tanah",
  k_soil: "K tanah",
  ec_soil: "EC tanah",
  n_deficiency_estimation: "Dugaan kurang N (foto)",
  p_deficiency_estimation: "Dugaan kurang P (foto)",
  k_deficiency_estimation: "Dugaan kurang K (foto)",
  days_after_planting: "Umur tanaman (HST)",
};
