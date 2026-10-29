import { interlockExplanation } from "@/lib/actuator-safety";
import { ApiRequestError, errorMessage } from "@/lib/api/client";
import type { Tone } from "@/components/ui/status";
import { csvTime } from "@/lib/csv";
import { formatDate, formatDuration } from "@/lib/format";
import { irrigationReasonText } from "@/lib/irrigation-reasons";

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

/**
 * Hasil terakhir dari kode (bukan dari `lastMessage` yang berbahasa Inggris):
 * STARTED → "Disiram", SKIPPED → "Dibatalkan demi keamanan: <alasan>", MISSED → "Terlewat (sistem mati)",
 * FAILED → "Gagal: <alasan>". `detail` = penjelasan panjang aturan keselamatan bila alasannya interlock.
 */
export function lastRunView(result: string | null, reasonCode: string | null | undefined): LastRunView | null {
  const reason = irrigationReasonText(reasonCode);
  const detail = interlockExplanation(reasonCode);
  switch (result) {
    case null:
      return null;
    case "STARTED":
      return { tone: "ok", text: "Disiram", detail: null };
    case "SKIPPED":
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
