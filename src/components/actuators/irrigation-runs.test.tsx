import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { csvTime } from "@/lib/csv";
import { json, renderWithProviders, signIn } from "@/test/utils";
import { IrrigationRunsCard } from "./irrigation-runs";

const today = csvTime(Date.now()).slice(0, 10);
const yesterday = csvTime(Date.now() - 24 * 3_600_000).slice(0, 10);

const base = {
  irrigationScheduleId: 1, reasonCode: null, message: null, durationSeconds: null, commandUid: null, commandStatus: null,
  commandFailureCode: null, commandError: null, recordedAt: "2026-11-09T10:30:00Z",
};
const runs = [
  { ...base, id: 4, runDate: today, time: "17:30", result: "STARTED", durationSeconds: 300, commandUid: "cmd-4", commandStatus: "FAILED", commandFailureCode: "OUTPUT_FAULT", commandError: "OUTPUT_FAULT: relay stuck" },
  { ...base, id: 3, runDate: today, time: "06:00", result: "STARTED", durationSeconds: 300, commandUid: "cmd-3", commandStatus: "EXECUTED" },
  { ...base, id: 2, runDate: yesterday, time: "17:30", result: "SKIPPED", reasonCode: "FLOAT_LOW", message: "Tank float is low" },
  { ...base, id: 1, runDate: yesterday, time: "06:00", result: "MISSED", reasonCode: "BACKEND_DOWN", irrigationScheduleId: null },
];

const pageOf = (content: unknown[]) => ({ content, page: 0, size: 10, totalElements: content.length, totalPages: 1, last: true });

let fetchMock: ReturnType<typeof vi.fn>;
let response: () => Promise<Response>;
beforeEach(() => {
  response = () => json(200, pageOf(runs));
  fetchMock = vi.fn(() => response());
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("Kartu Riwayat siram", () => {
  it("menampilkan tiap jam siram per hari dalam bahasa petani, dari kode dan status perintah", async () => {
    signIn();
    renderWithProviders(<IrrigationRunsCard />);
    const todayGroup = (await screen.findByRole("heading", { name: /^Hari ini, / })).parentElement!;
    expect(within(todayGroup).getByText("Disiram 5 mnt")).toBeInTheDocument();
    expect(within(todayGroup).getByText("Gagal: perangkat tidak menjalankan perintah siram")).toBeInTheDocument();
    expect(within(todayGroup).getByText(/Saklar perangkat ini bermasalah/)).toBeInTheDocument();

    const yesterdayGroup = screen.getByRole("heading", { name: /^Kemarin, / }).parentElement!;
    expect(within(yesterdayGroup).getByText("Dibatalkan demi keamanan: air drum rendah")).toBeInTheDocument();
    expect(within(yesterdayGroup).getByText("Terlewat (sistem mati)")).toBeInTheDocument();

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/irrigation\/runs\?page=0&size=10/);
    // Teks teknis berbahasa Inggris hanya ada di panel Detail sistem yang terlipat.
    expect(screen.getByText("Tank float is low")).not.toBeVisible();
    expect(screen.getByText("OUTPUT_FAULT: relay stuck")).not.toBeVisible();
  });

  it("belum ada catatan → keadaan kosong", async () => {
    response = () => json(200, pageOf([]));
    signIn("VIEWER", "pemantau");
    renderWithProviders(<IrrigationRunsCard />);
    expect(await screen.findByText("Belum ada riwayat siram")).toBeInTheDocument();
  });

  it("backend lama tanpa rute ini → pesan fitur belum tersedia, bukan data kosong", async () => {
    response = () => json(404, { status: 404, error: "NOT_FOUND", message: "Endpoint not found", path: "/api/irrigation/runs" });
    signIn();
    renderWithProviders(<IrrigationRunsCard />);
    expect(await screen.findByText(/Fitur ini belum tersedia di sistem/)).toBeInTheDocument();
  });
});
