import { tankKeys } from "@/config/dashboard-layout";
import { formatReading } from "@/lib/format";

/* Cara menampilkan bacaan sensor ke petani. Angka mentah tidak selalu bermakna:
 * - Pelampung air drum mengirim 1/0 → "Air cukup" / "Air rendah".
 * - EC larutan 0 (tegangan kanal nol) bukan hasil ukur; probe belum tersambung atau belum diperiksa.
 *   Ditampilkan apa adanya sebagai "Belum terbaca" supaya jadi pengingat, bukan angka yang tampak sungguhan. */

export type ReadingLike = { value: number | null; textValue: string | null };

export type ReadingDisplay =
  /** Angka biasa; `text` sudah diformat, satuan ditampilkan terpisah. */
  | { kind: "value"; text: string | null }
  /** Kata pengganti angka (mis. "Air cukup"); tanpa satuan. */
  | { kind: "text"; text: string; tone: "ok" | "danger" }
  /** Sensor menjawab tetapi angkanya tidak bermakna; `hint` = apa yang perlu diperiksa. */
  | { kind: "unread"; text: string; hint: string };

/** EC larutan tidak mungkin tepat 0 (larutan pupuk selalu menghantar); 0 berarti tidak ada sinyal dari probe. */
export function isUnreadEc(r: ReadingLike | null | undefined): boolean {
  return r != null && r.value != null && r.value <= 0;
}

function floatIsOk(r: ReadingLike): boolean {
  const raw = r.value != null ? String(r.value) : (r.textValue ?? "").trim().toUpperCase();
  return raw === "1" || raw === "CLOSED" || raw === "TRUE";
}

export function describeReading(metricKey: string, r: ReadingLike | null | undefined): ReadingDisplay {
  if (r && metricKey === tankKeys.floatLowOk) {
    return floatIsOk(r) ? { kind: "text", text: "Air cukup", tone: "ok" } : { kind: "text", text: "Air rendah", tone: "danger" };
  }
  if (r && metricKey === tankKeys.ec && isUnreadEc(r)) {
    return { kind: "unread", text: "Belum terbaca", hint: "Periksa probe EC dan kabelnya." };
  }
  return { kind: "value", text: formatReading(r) };
}
