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
    expect(lastRunView("FAILED", "MESSAGING_ERROR")?.text).toBe("Gagal: perintah tidak sampai ke pompa siram");
    expect(lastRunView("FAILED", "DATABASE_ERROR")?.text).toBe("Gagal: alasan lain (lihat Detail sistem)");
    expect(lastRunView("MISSED", "BACKEND_DOWN")?.text).toBe("Terlewat (sistem mati)");
    expect(lastRunView(null, null)).toBeNull();
  });

  it("lama siram terakhir = detik yang dikirim ke pompa", () => {
    expect(lastRunView("STARTED", null, 85)).toEqual({ tone: "ok", text: "Disiram 1 mnt 25 dtk", detail: null });
    expect(lastRunView("STARTED", null)).toEqual({ tone: "ok", text: "Disiram", detail: null });
  });

  it("data lama: AI menilai tidak perlu siram tetap hasil normal, bukan pembatalan", () => {
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
