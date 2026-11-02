import type { Tone } from "@/components/ui/status";
import { deviceFailureExplanation, interlockExplanation } from "@/lib/actuator-safety";
import { ApiRequestError, errorMessage } from "@/lib/api/client";
import type { FertilizationRun, FertilizationSchedule } from "@/lib/api/types";
import { csvTime } from "@/lib/csv";
import { formatDate, formatDuration } from "@/lib/format";
import { fertilizationReasonText } from "@/lib/fertilization-reasons";

export { fertilizationReasonText };

/* Pemupukan otomatis: pada hari jatuh tempo, sebelum sesi siram PERTAMA, backend menyalakan pengaduk lalu
 * pompa N → P → K bergantian, mengaduk, baru menyiram. Jarak hari & takaran dari AI. Hasil dibaca dari kode
 * (`status` + `reasonCode`); `message` berbahasa Inggris, hanya untuk Info teknis. */

export const INTERVAL_MIN = 1;
export const INTERVAL_MAX = 60;

/** Penjelasan panjang (apa yang harus diperiksa), atau null. */
export function fertilizationReasonDetail(code: string | null | undefined): string | null {
  if (code === "AI_NO_PHOTO") return "AI butuh foto daun terbaru. Pastikan kereta kamera berpatroli dan mengirim foto.";
  return interlockExplanation(code) ?? deviceFailureExplanation(code);
}

// ── Langkah selama berjalan ─────────────────────────────────────────────────

export type StageKey = "NITROGEN" | "PHOSPHORUS" | "POTASSIUM" | "MIXING" | "IRRIGATE";
export const stages: { key: StageKey; label: string }[] = [
  { key: "NITROGEN", label: "Pupuk N" },
  { key: "PHOSPHORUS", label: "Pupuk P" },
  { key: "POTASSIUM", label: "Pupuk K" },
  { key: "MIXING", label: "Mengaduk" },
  { key: "IRRIGATE", label: "Menyiram" },
];

const stageSentence: Record<StageKey, string> = {
  NITROGEN: "pengaduk menyala, pompa Nitrogen (N) menuang",
  PHOSPHORUS: "pompa Fosfor (P) menuang",
  POTASSIUM: "pompa Kalium (K) menuang",
  MIXING: "pupuk sedang diaduk dengan air",
  IRRIGATE: "pupuk selesai, penyiraman dimulai",
};

/** `step` = langkah yang sedang/berikutnya dikerjakan; null selama IN_PROGRESS = langkah pertama (N). */
export function activeStageIndex(step: string | null | undefined): number {
  if (!step) return 0;
  const i = stages.findIndex((s) => s.key === step);
  return i < 0 ? 0 : i;
}

export function stageSentenceFor(step: string | null | undefined): string {
  return stageSentence[stages[activeStageIndex(step)].key];
}

// ── Hasil satu kali pemupukan ───────────────────────────────────────────────

export type RunView = { tone: Tone; text: string; detail: string | null };

const RETRY = "Dicoba lagi pada jam siram berikutnya.";

export function runView(run: Pick<FertilizationRun, "status" | "step" | "reasonCode">): RunView {
  const reason = fertilizationReasonText(run.reasonCode);
  const why = fertilizationReasonDetail(run.reasonCode);
  switch (run.status) {
    case "IN_PROGRESS":
      return { tone: "info", text: "Sedang memupuk", detail: `Sekarang: ${stageSentenceFor(run.step)}. Siram menunggu sampai selesai.` };
    case "DONE":
      if (run.reasonCode === "AI_NO_DOSE_NEEDED") {
        return { tone: "ok", text: "Tidak perlu pupuk", detail: "AI menilai unsur hara tanah masih cukup. Ini normal, bukan masalah." };
      }
      return {
        tone: "ok",
        text: "Sudah dipupuk",
        detail: run.reasonCode === "AI_CAPPED" ? "Takaran dari AI melebihi batas lama pompa, jadi dipotong ke batasnya." : null,
      };
    case "PARTIAL":
      return {
        tone: "warn",
        text: `Dipupuk sebagian${reason ? `: ${reason}` : ""}`,
        detail: [why, "Sebagian pompa sudah menuang lalu berhenti. Tidak diulang supaya pupuk tidak berlebihan; jadwal berikutnya tetap berjalan."]
          .filter(Boolean)
          .join(" "),
      };
    case "SKIPPED":
      return { tone: "warn", text: `Belum dipupuk${reason ? `: ${reason}` : ""}`, detail: [why, RETRY].filter(Boolean).join(" ") };
    case "FAILED":
      return { tone: "danger", text: `Gagal memupuk${reason ? `: ${reason}` : ""}`, detail: [why, RETRY].filter(Boolean).join(" ") };
    default:
      return { tone: "neutral", text: run.status, detail: null };
  }
}

/** Status ringkas untuk lencana di riwayat. */
export const runStatusLabel: Record<string, string> = {
  IN_PROGRESS: "Berjalan",
  DONE: "Selesai",
  PARTIAL: "Sebagian",
  SKIPPED: "Belum dipupuk",
  FAILED: "Gagal",
};

/** Takaran per unsur: yang dikirim ke pompa; null bila pompa itu belum/tidak dijalankan. */
export function doses(run: FertilizationRun): { key: "N" | "P" | "K"; label: string; seconds: number | null; aiSeconds: number | null }[] {
  return [
    { key: "N", label: "Nitrogen (N)", seconds: run.nitrogenSeconds, aiSeconds: run.aiNitrogenSeconds },
    { key: "P", label: "Fosfor (P)", seconds: run.phosphorusSeconds, aiSeconds: run.aiPhosphorusSeconds },
    { key: "K", label: "Kalium (K)", seconds: run.potassiumSeconds, aiSeconds: run.aiPotassiumSeconds },
  ];
}

/** "N 12 dtk · P 8 dtk · K 20 dtk"; null bila tidak ada pompa yang diberi takaran. */
export function doseSummary(run: FertilizationRun): string | null {
  const parts = doses(run)
    .filter((d) => d.seconds != null)
    .map((d) => `${d.key} ${formatDuration(d.seconds)}`);
  return parts.length ? parts.join(" · ") : null;
}

// ── Tanggal ─────────────────────────────────────────────────────────────────

const wibDate = (v: string | number) => csvTime(v).slice(0, 10);
const dayNumber = (ymd: string) => Math.round(Date.parse(`${ymd}T00:00:00Z`) / 86_400_000);

/** "2026-11-02" → "2 Nov 2026" tanpa bergeser zona waktu. */
export function formatFarmDate(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  return formatDate(`${ymd}T12:00:00+07:00`);
}

/** Selisih hari kebun (WIB) dari hari ini ke `ymd`; negatif = sudah lewat. */
export function daysFromToday(ymd: string, now = Date.now()): number {
  return dayNumber(ymd) - dayNumber(wibDate(now));
}

/** "hari ini", "besok", "dalam 3 hari (5 Nov 2026)". Tanggal yang sudah lewat = jatuh tempo hari ini. */
export function dueLabel(ymd: string | null | undefined, now = Date.now()): string | null {
  if (!ymd) return null;
  const d = daysFromToday(ymd, now);
  if (d <= 0) return "hari ini";
  if (d === 1) return "besok";
  return `dalam ${d} hari (${formatFarmDate(ymd)})`;
}

/** "hari ini", "kemarin", "3 hari lalu (30 Okt 2026)". */
export function agoLabel(ymd: string | null | undefined, now = Date.now()): string | null {
  if (!ymd) return null;
  const d = -daysFromToday(ymd, now);
  if (d <= 0) return "hari ini";
  if (d === 1) return "kemarin";
  return `${d} hari lalu (${formatFarmDate(ymd)})`;
}

// ── Keadaan kartu ───────────────────────────────────────────────────────────

export type ScheduleState =
  | { kind: "disabled" }
  | { kind: "ai-not-configured" }
  | { kind: "ai-unreachable" }
  | { kind: "no-schedule" }
  | { kind: "active"; intervalDays: number };

/** Urutan penting: dimatikan di server > AI belum diatur > AI tak terjangkau > belum ada jadwal > aktif. */
export function scheduleState(s: FertilizationSchedule): ScheduleState {
  if (!s.enabled) return { kind: "disabled" };
  if (!s.aiConfigured) return { kind: "ai-not-configured" };
  if (!s.aiReachable) return { kind: "ai-unreachable" };
  if (s.intervalDays == null) return { kind: "no-schedule" };
  return { kind: "active", intervalDays: s.intervalDays };
}

/** Isian "setiap N hari" → angka 1–60, atau pesan salah. */
export function parseInterval(text: string): { ok: true; value: number } | { ok: false; error: string } {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return { ok: false, error: "Isi angka hari, contoh 7." };
  const n = Number(t);
  if (n < INTERVAL_MIN || n > INTERVAL_MAX) return { ok: false, error: `Antara ${INTERVAL_MIN} sampai ${INTERVAL_MAX} hari.` };
  return { ok: true, value: n };
}

export function fertilizationErrorMessage(e: unknown): string {
  if (e instanceof ApiRequestError) {
    if (e.code === "VALIDATION_ERROR") return `Jarak pemupukan harus ${INTERVAL_MIN} sampai ${INTERVAL_MAX} hari.`;
    if (e.code === "AI_SERVICE_ERROR" || e.status === 502) return "Layanan AI tidak menjawab, jadi jadwal pupuk belum bisa diubah. Coba lagi beberapa saat lagi.";
  }
  return errorMessage(e);
}

// ── Riwayat layanan AI (baris mentah snake_case) ────────────────────────────

/** `run_at` AI = waktu WIB tanpa zona ("2026-11-02T06:00:00.123") → ISO dengan +07:00. */
export function aiTimestamp(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  if (/(Z|[+-]\d\d:?\d\d)$/.test(v)) return v;
  return `${v}+07:00`;
}

export const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
