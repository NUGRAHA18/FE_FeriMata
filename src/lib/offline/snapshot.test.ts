import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import { qk } from "@/lib/api/query-keys";
import type { DashboardOverview } from "@/lib/api/types";
import { endSession } from "@/lib/auth/session";
import type { ReadingMap } from "@/lib/realtime/apply";
import { overview, signIn } from "@/test/utils";
import { clearSnapshot, loadSnapshot, saveSnapshot } from "./snapshot";
import { hydrateFromSnapshot } from "./use-offline-snapshot";

beforeEach(() => localStorage.clear());

describe("snapshot overview untuk mode offline", () => {
  it("menyimpan dan memuat kembali milik pengguna yang sama", () => {
    saveSnapshot("operator", overview(), 1234);
    const s = loadSnapshot("operator");
    expect(s?.savedAt).toBe(1234);
    expect(s?.overview.sensors.latestReadings[0].value).toBe(21.5);
  });

  it("tidak memuat snapshot milik pengguna lain", () => {
    saveSnapshot("operator", overview(), 1234);
    expect(loadSnapshot("admin")).toBeNull();
  });

  it("mengabaikan isi yang rusak atau tidak cocok skema", () => {
    localStorage.setItem("fertimata.last-overview", "{bukan json");
    expect(loadSnapshot("operator")).toBeNull();
    localStorage.setItem("fertimata.last-overview", JSON.stringify({ v: 1, user: "operator", savedAt: 1, overview: { system: {} } }));
    expect(loadSnapshot("operator")).toBeNull();
  });

  it("dihapus saat pengguna keluar, tapi tidak saat sesi habis sendiri", () => {
    signIn();
    saveSnapshot("operator", overview(), 1);
    endSession("expired");
    expect(loadSnapshot("operator")).not.toBeNull();
    signIn();
    endSession("logout");
    expect(loadSnapshot("operator")).toBeNull();
    clearSnapshot();
  });
});

describe("hydrateFromSnapshot", () => {
  it("mengisi overview dan peta pembacaan dengan waktu simpan sebagai updatedAt (langsung basi)", () => {
    saveSnapshot("operator", overview(), 5000);
    const qc = new QueryClient();
    expect(hydrateFromSnapshot(qc, "operator")).toBe(true);
    expect(qc.getQueryState(qk.overview)?.dataUpdatedAt).toBe(5000);
    expect(qc.getQueryData<ReadingMap>(qk.readings)?.[1].value).toBe(21.5);
  });

  it("tidak menimpa data yang sudah ada di cache", () => {
    saveSnapshot("operator", overview(), 5000);
    const qc = new QueryClient();
    const fresh = { ...overview(), alerts: { unacknowledged: 9, critical: 0, warning: 9, active: [] } } as DashboardOverview;
    qc.setQueryData(qk.overview, fresh);
    expect(hydrateFromSnapshot(qc, "operator")).toBe(false);
    expect(qc.getQueryData<DashboardOverview>(qk.overview)?.alerts.unacknowledged).toBe(9);
  });
});
