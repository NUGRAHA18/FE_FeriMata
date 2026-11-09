import { deviceFailureExplanation, interlockExplanation } from "@/lib/actuator-safety";
import { ApiRequestError, errorMessage } from "@/lib/api/client";
import type { IrrigationRun, IrrigationSchedule } from "@/lib/api/types";
import type { Tone } from "@/components/ui/status";
import { csvTime } from "@/lib/csv";
import { daysFromToday, formatFarmDate } from "@/lib/fertilization";
import { formatDate, formatDuration } from "@/lib/format";
import { AI_NO_WATER_NEEDED, irrigationReasonText } from "@/lib/irrigation-reasons";

/* Jadwal siram harian; jam selalu WIB. Hasil dibaca dari kode (`lastResult` + `lastReasonCode`);
 * `lastMessage` berbahasa Inggris, hanya untuk Detail sistem. */

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

/** Lama siram = isian jadwal (backend, 4 Nov 2026). `lastSeconds` = detik yang benar-benar dikirim ke pompa.
 *  SKIPPED karena AI_NO_WATER_NEEDED hanya ada di data lama; tetap ditampilkan normal (bukan merah/kuning). */
export function lastRunView(result: string | null, reasonCode: string | null | undefined, lastSeconds?: number | null): LastRunView | null {
  const reason = irrigationReasonText(reasonCode);
  const detail = interlockExplanation(reasonCode);
  switch (result) {
    case null:
      return null;
    case "STARTED":
      return { tone: "ok", text: lastSeconds != null ? `Disiram ${formatDuration(lastSeconds)}` : "Disiram", detail: null };
    case "WAITING":
      // Siram didahului pemupukan; pompa siram menyala setelah pupuk selesai diaduk.
      return { tone: "info", text: "Menunggu pemupukan selesai", detail: "Pupuk sedang dituang dan diaduk. Pompa siram menyala sendiri setelahnya." };
    case "SKIPPED":
      if (reasonCode === "FERTILIZATION_IN_PROGRESS") {
        return { tone: "neutral", text: "Dilewati: pemupukan sedang berjalan", detail: "Jam siram ini tiba saat pupuk masih dituang. Penyiraman sesudah pupuk tetap dijalankan." };
      }
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

// ── Riwayat siram (GET /irrigation/runs) ────────────────────────────────────

type RunOutcome = Pick<IrrigationRun, "result" | "reasonCode" | "durationSeconds" | "commandStatus" | "commandFailureCode">;

/** Baris yang masih akan diperbarui backend: menunggu pemupukan, atau perintah belum dijawab perangkat. */
export function isIrrigationRunPending(run: { result: string | null; commandStatus?: string | null }): boolean {
  return run.result === "WAITING" || (run.result === "STARTED" && (run.commandStatus === "PENDING" || run.commandStatus === "SENT"));
}

/** Hasil terakhir satu jadwal dalam bentuk baris riwayat, supaya kartu Jam siram dan Riwayat siram memakai kalimat yang sama. */
export function scheduleLastRun(s: IrrigationSchedule): RunOutcome | null {
  if (s.lastResult == null) return null;
  return {
    result: s.lastResult,
    reasonCode: s.lastReasonCode ?? null,
    durationSeconds: s.lastDurationSeconds ?? null,
    commandStatus: s.lastCommandStatus ?? null,
    commandFailureCode: s.lastCommandFailureCode ?? null,
  };
}

/** Seperti `lastRunView`, ditambah jawaban perangkat: STARTED hanya berarti perintah terkirim; baru benar-benar
 *  disiram bila perangkat menjawab EXECUTED. Tanpa status perintah (data lama) dianggap disiram, sama seperti kartu Jam siram. */
export function irrigationRunView(run: RunOutcome): LastRunView {
  const base = lastRunView(run.result, run.reasonCode, run.durationSeconds) ?? { tone: "neutral", text: run.result, detail: null };
  if (run.result !== "STARTED") return base;
  switch (run.commandStatus) {
    case "PENDING":
    case "SENT":
      return { tone: "info", text: "Perintah siram terkirim, menunggu jawaban perangkat", detail: null };
    case "CANCELLED":
      return { tone: "neutral", text: "Perintah siram dibatalkan", detail: null };
    case "FAILED": {
      const code = run.commandFailureCode;
      const why = deviceFailureExplanation(code);
      // Tidak ada jawaban dalam 2 menit: keadaan pompa tidak diketahui, bukan pasti gagal.
      if (code === "NO_RESPONSE") return { tone: "warn", text: "Perangkat tidak menjawab perintah siram", detail: why };
      // Perangkat sendiri yang menolak karena aturan keselamatannya.
      if (code?.startsWith("INTERLOCK_")) return { tone: "warn", text: `Dibatalkan demi keamanan: ${irrigationReasonText(code)}`, detail: why };
      return { tone: "danger", text: "Gagal: perangkat tidak menjalankan perintah siram", detail: why ?? "Alasannya ada di Detail sistem." };
    }
    default:
      return base;
  }
}

/** "Hari ini, 9 Nov 2026" · "Kemarin, 8 Nov 2026" · "7 Nov 2026". */
export function runDayLabel(ymd: string, now = Date.now()): string {
  const date = formatFarmDate(ymd);
  const ago = -daysFromToday(ymd, now);
  if (ago === 0) return `Hari ini, ${date}`;
  if (ago === 1) return `Kemarin, ${date}`;
  return date;
}

/** Baris berurutan dengan tanggal yang sama dijadikan satu kelompok; urutan dari backend (terbaru dulu) dipertahankan. */
export function groupRunsByDay<T extends { runDate: string }>(runs: T[]): { date: string; runs: T[] }[] {
  const groups: { date: string; runs: T[] }[] = [];
  for (const r of runs) {
    const last = groups.at(-1);
    if (last && last.date === r.runDate) last.runs.push(r);
    else groups.push({ date: r.runDate, runs: [r] });
  }
  return groups;
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
