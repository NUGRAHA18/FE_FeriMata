import { describe, expect, it } from "vitest";
import { ApiRequestError } from "@/lib/api/client";
import { irrigationErrorMessage, lastRunView, nextRunLabel } from "./irrigation";

// 29 Okt 2026 10:00 WIB = 03:00 UTC.
const now = Date.parse("2026-10-29T03:00:00Z");
const conflict = (details: Record<string, unknown>) =>
  new ApiRequestError({ status: 409, code: "BUSINESS_RULE_VIOLATION", message: "x", details, path: "/irrigation/schedules" });

describe("nextRunLabel", () => {
  it("hari ini / besok / tanggal, dalam WIB", () => {
    expect(nextRunLabel("2026-10-29T10:30:00Z", now)).toBe("hari ini 17:30");
    expect(nextRunLabel("2026-10-29T23:00:00Z", now)).toBe("besok 06:00"); // 30 Okt 06:00 WIB
    expect(nextRunLabel("2026-10-31T23:00:00Z", now)).toMatch(/1 Nov 2026 06:00$/);
    expect(nextRunLabel(null, now)).toBeNull();
  });
});

describe("lastRunView", () => {
  it("hasil terakhir dari kode, bukan dari pesan bahasa Inggris", () => {
    expect(lastRunView("STARTED", null)).toEqual({ tone: "ok", text: "Disiram", detail: null });
    const skipped = lastRunView("SKIPPED", "BACKUP_POWER")!;
    expect(skipped.text).toBe("Dibatalkan demi keamanan: listrik PLN padam, memakai baterai");
    expect(skipped.detail).toMatch(/^Listrik PLN padam dan sistem memakai baterai/);
    expect(lastRunView("SKIPPED", "FLOAT_LOW")?.text).toBe("Dibatalkan demi keamanan: air drum rendah");
    expect(lastRunView("FAILED", "PUMP_UNAVAILABLE")?.text).toBe("Gagal: pompa siram tidak ditemukan atau dimatikan");
    expect(lastRunView("FAILED", "MESSAGE_PUBLISH_FAILED")?.text).toBe("Gagal: gagal mengirim perintah");
    expect(lastRunView("MISSED", "BACKEND_DOWN")?.text).toBe("Terlewat (sistem mati)");
    expect(lastRunView(null, null)).toBeNull();
  });

  it("lama siram dari AI: lama sebenarnya, asalnya, dan alasan bila durasi cadangan dipakai", () => {
    expect(lastRunView("STARTED", null, { seconds: 85, source: "AI" })).toEqual({ tone: "ok", text: "Disiram 1 mnt 25 dtk (ditentukan AI)", detail: null });
    expect(lastRunView("STARTED", "AI_CAPPED", { seconds: 900, source: "AI" })?.text).toBe("Disiram 15 mnt (ditentukan AI, dipotong ke batas pompa)");
    expect(lastRunView("STARTED", "AI_UNAVAILABLE", { seconds: 300, source: "FALLBACK" })).toEqual({
      tone: "ok",
      text: "Disiram 5 mnt (durasi cadangan)",
      detail: "AI tidak bisa dipakai: layanan AI tidak menjawab.",
    });
    expect(lastRunView("STARTED", "AI_INPUTS_NOT_READY", { seconds: 300, source: "FALLBACK" })?.detail).toBe("AI tidak bisa dipakai: data sensor tanah belum ada atau sudah lama.");
  });

  it("AI menilai tidak perlu siram: hasil normal, bukan pembatalan", () => {
    const v = lastRunView("SKIPPED", "AI_NO_WATER_NEEDED")!;
    expect(v.tone).toBe("ok");
    expect(v.text).toBe("Tidak perlu siram");
  });
});

describe("pesan error", () => {
  it("409 dibaca dari details.reason", () => {
    expect(irrigationErrorMessage(conflict({ reason: "DUPLICATE_TIME", time: "06:00" }))).toBe("Jam 06:00 sudah ada di jadwal. Pilih jam lain.");
    expect(irrigationErrorMessage(conflict({ reason: "TOO_LONG", maxRunSeconds: 900 }))).toBe("Terlalu lama. Pompa siram paling lama 15 mnt sekali jalan.");
  });
});
