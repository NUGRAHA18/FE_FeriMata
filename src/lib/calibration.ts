import { ApiRequestError, errorMessage } from "@/lib/api/client";
import type { SensorCalibration } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";

/*
 * Kalibrasi sensor (Protokol-Data §7) dan pompa (§8). Pesan aturan dari backend berbahasa Inggris;
 * yang sering ditemui petugas diterjemahkan di sini, sisanya ditampilkan apa adanya.
 */

const ruleMessages: [RegExp, string][] = [
  [/has no reading in the .* before that time/i, "Tidak ada angka dari sensor dalam 15 menit sebelum waktu itu. Isi angka sensor secara manual."],
  [/At least (\d+) trials are required/i, "Perlu paling sedikit $1 kali ulangan."],
  [/is not a calibrated pump/i, "Alat ini bukan pompa pupuk yang debitnya bisa dikalibrasi."],
  [/out-of-range coefficient/i, "Hasil hitungan tidak wajar. Periksa lagi sampel lab yang dimasukkan."],
  [/(not enough|at least \d+) samples?/i, "Sampel lab belum cukup untuk menghitung kalibrasi."],
];

export function calibrationErrorMessage(e: unknown): string {
  if (e instanceof ApiRequestError && e.code !== "VALIDATION_ERROR") {
    for (const [re, text] of ruleMessages) {
      const m = re.exec(e.message);
      if (m) return text.replace("$1", m[1] ?? "");
    }
  }
  return errorMessage(e);
}

/** Nilai `<input type="datetime-local">` (jam perangkat) → ISO UTC; kosong → undefined. */
export function localInputToIso(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Sekarang dalam format `datetime-local` pada jam perangkat, mis. "2026-10-29T09:30". */
export function nowLocalInput(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
}

/** "terkoreksi = 3,2 + 0,84 × mentah + 0,01 × soil.a.temperature" */
export function formatEquation(c: Pick<SensorCalibration, "intercept" | "slope" | "covariates">): string {
  const f = (n: number) => formatNumber(n, 4) ?? String(n);
  const terms = [f(c.intercept), `${f(c.slope)} × mentah`];
  for (const [k, v] of Object.entries(c.covariates ?? {})) if (typeof v === "number") terms.push(`${f(v)} × ${k}`);
  return `terkoreksi = ${terms.join(" + ").replace(/\+ -/g, "− ")}`;
}

/** Ulangan uji debit pompa: debit tiap ulangan dan debit gabungan (total volume / total waktu), mL/detik. */
export function pumpFlow(trials: { durationSeconds: number; volumeMl: number }[]) {
  const valid = trials.filter((t) => t.durationSeconds > 0 && t.volumeMl > 0);
  const seconds = valid.reduce((a, t) => a + t.durationSeconds, 0);
  const volume = valid.reduce((a, t) => a + t.volumeMl, 0);
  return { count: valid.length, flowMlPerSecond: seconds > 0 ? volume / seconds : null };
}
