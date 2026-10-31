import { interlockExplanation } from "@/lib/actuator-safety";
import { ApiRequestError, errorMessage } from "@/lib/api/client";
import type { Tone } from "@/components/ui/status";
import { csvTime } from "@/lib/csv";
import { formatDate, formatDuration } from "@/lib/format";
import { AI_NO_WATER_NEEDED, irrigationReasonText } from "@/lib/irrigation-reasons";

/*
 * Jadwal siram harian. Jam selalu waktu kebun (WIB). Hasil terakhir diterjemahkan dari kode
 * (`lastResult` + `lastReasonCode`); `lastMessage` backend berbahasa Inggris, hanya untuk Info teknis.
 */

/** "YYYY-MM-DD" dan "HH:mm" di WIB. */
const wibDate = (v: string | number) => csvTime(v).slice(0, 10);
const wibTime = (v: string | number) => csvTime(v).slice(11, 16);

/** "hari ini 17:30", "besok 06:00", atau "1 Nov 2026 06:00". */
export function nextRunLabel(nextRunAt: string | null, now = Date.now()): string | null {
  if (!nextRunAt) return null;
  const day = wibDate(nextRunAt);
  if (day === wibDate(now)) return `hari ini ${wibTime(nextRunAt)}`;
  if (day === wibDate(now + 24 * 3_600_000)) return `besok ${wibTime(nextRunAt)}`;
  return `${formatDate(nextRunAt)} ${wibTime(nextRunAt)}`;
}

export type LastRunView = { tone: Tone; text: string; detail: string | null };

type LastDuration = { seconds?: number | null; source?: string | null };

/** "85 detik (ditentukan AI)", "5 mnt (durasi cadangan)", … ; null bila backend belum mengirim lamanya. */
export function lastDurationText({ seconds, source }: LastDuration, reasonCode?: string | null): string | null {
  if (seconds == null) return null;
  const how =
    source === "AI"
      ? reasonCode === "AI_CAPPED"
        ? "ditentukan AI, dipotong ke batas pompa"
        : "ditentukan AI"
      : source === "FALLBACK"
        ? "durasi cadangan"
        : source === "MANUAL"
          ? "diatur manual"
          : null;
  return `${formatDuration(seconds)}${how ? ` (${how})` : ""}`;
}

/**
 * Hasil terakhir dari kode (bukan dari `lastMessage` yang berbahasa Inggris):
 * STARTED → "Disiram <lama> (ditentukan AI / durasi cadangan)", SKIPPED karena AI_NO_WATER_NEEDED →
 * "Tidak perlu siram" (normal, bukan merah/kuning), SKIPPED lain → "Dibatalkan demi keamanan: <alasan>",
 * MISSED → "Terlewat (sistem mati)", FAILED → "Gagal: <alasan>". `detail` = penjelasan panjang aturan
 * keselamatan bila alasannya interlock, atau mengapa durasi cadangan dipakai.
 */
export function lastRunView(result: string | null, reasonCode: string | null | undefined, duration: LastDuration = {}): LastRunView | null {
  const reason = irrigationReasonText(reasonCode);
  const detail = interlockExplanation(reasonCode);
  switch (result) {
    case null:
      return null;
    case "STARTED": {
      const lama = lastDurationText(duration, reasonCode);
      const fallback = duration.source === "FALLBACK" && reasonCode && reasonCode !== "AI_CAPPED";
      return {
        tone: "ok",
        text: lama ? `Disiram ${lama}` : "Disiram",
        detail: fallback ? `AI tidak bisa dipakai: ${reason}.` : null,
      };
    }
    case "SKIPPED":
      if (reasonCode === AI_NO_WATER_NEEDED) {
        return { tone: "ok", text: "Tidak perlu siram", detail: "AI menilai tanah masih cukup basah atau fase tanaman sedang tidak perlu disiram." };
      }
      return { tone: "warn", text: `Dibatalkan demi keamanan${reason ? `: ${reason}` : ""}`, detail };
    case "MISSED":
      return { tone: "neutral", text: "Terlewat (sistem mati)", detail: null };
    case "FAILED":
      return { tone: "danger", text: `Gagal${reason ? `: ${reason}` : ""}`, detail };
    default:
      return { tone: "neutral", text: result, detail: null };
  }
}

/** 409 dari backend (dibaca dari details.reason, bukan teks Inggris) → kalimat petani. */
export function irrigationErrorMessage(e: unknown): string {
  if (e instanceof ApiRequestError && e.details) {
    if (e.details.reason === "DUPLICATE_TIME") return `Jam ${String(e.details.time ?? "itu")} sudah ada di jadwal. Pilih jam lain.`;
    if (e.details.reason === "TOO_LONG") {
      const max = typeof e.details.maxRunSeconds === "number" ? e.details.maxRunSeconds : null;
      return max != null ? `Terlalu lama. Pompa siram paling lama ${formatDuration(max)} sekali jalan.` : "Lama siram melebihi batas pompa.";
    }
  }
  return errorMessage(e);
}
