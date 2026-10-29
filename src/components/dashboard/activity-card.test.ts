import { describe, expect, it } from "vitest";
import type { ActivityEntry } from "@/lib/api/types";
import { fromOverviewEntry } from "./activity-card";

const entry = (e: Partial<ActivityEntry>): ActivityEntry => ({ kind: "ACTUATOR_COMMAND", at: "2026-10-30T03:00:00Z", summary: "", detail: null, ...e });

describe("fromOverviewEntry", () => {
  it("perintah NO_RESPONSE dari overview: 'Alat tidak menjawab', ikon peringatan, bukan Gagal", () => {
    const f = fromOverviewEntry(entry({ status: "FAILED", commandType: "START", actuatorCode: "TROLLEY-PATROL", actor: "operator", failureCode: "NO_RESPONSE", refId: 9 }), 0);
    expect(f.icon).toBe("WARNING");
    expect(f.detail).toMatch(/^Alat tidak menjawab · oleh operator · Alat tidak menjawab dalam 2 menit/);
  });

  it("peringatan dengan failureCode NO_RESPONSE memakai kode, bukan teks Inggris", () => {
    const f = fromOverviewEntry(
      entry({ kind: "ALERT", summary: "Actuator did not respond", status: "WARNING", detail: "WARNING: Device PANEL-01 did not acknowledge command ON for DIST-PUMP", deviceCode: "PANEL-01", actuatorCode: "DIST-PUMP", failureCode: "NO_RESPONSE" }),
      0,
    );
    expect(f.title).toBe("Alat tidak menjawab perintah");
    expect(f.detail).toBe("Perlu perhatian · PANEL-01 tidak menjawab perintah untuk DIST-PUMP. Perintah mungkin tidak dijalankan; periksa keadaan alat.");
  });

  it("peringatan jadwal siram dari overview memakai alertType + kode alasan", () => {
    const f = fromOverviewEntry(
      entry({ kind: "ALERT", summary: "Scheduled irrigation skipped", status: "WARNING", detail: "WARNING: Irrigation scheduled at 06:00 did not start: on backup power", alertType: "IRRIGATION_SKIPPED", failureCode: "BACKUP_POWER" }),
      0,
    );
    expect(f.title).toBe("Penyiraman terjadwal dibatalkan");
    expect(f.detail).toBe("Perlu perhatian · Penyiraman dibatalkan demi keamanan: listrik PLN padam, memakai baterai. Jadwal berikutnya tetap berjalan.");
  });
});
