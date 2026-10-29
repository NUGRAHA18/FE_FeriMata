import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { json, renderWithProviders, signIn } from "@/test/utils";
import { IrrigationScheduleCard } from "./irrigation-schedule";

const schedule = {
  id: 1, time: "06:00", durationSeconds: 300, enabled: true, notes: "Siram pagi", nextRunAt: "2099-01-01T23:00:00Z", lastRunAt: "2026-10-28T23:00:00Z",
  lastResult: "SKIPPED", lastMessage: "Device PANEL-01 is on backup power", lastReasonCode: "BACKUP_POWER", lastCommandUid: null,
};

const pump = {
  id: 7, deviceId: 2, deviceCode: "PANEL-01", code: "DIST-PUMP", name: "Pompa siram", type: "DISTRIBUTION_PUMP", enabled: true, currentState: "OFF",
  stateUpdatedAt: "2026-10-29T03:00:00Z", maxRunSeconds: 900, supportedCommands: null, description: null, metadata: null,
  createdAt: "2026-10-29T03:00:00Z", updatedAt: "2026-10-29T03:00:00Z",
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      return body.time === "06:00"
        ? json(409, { status: 409, error: "BUSINESS_RULE_VIOLATION", message: "Duplicate", details: { reason: "DUPLICATE_TIME", time: "06:00" } })
        : json(201, { ...schedule, id: 2, ...body });
    }
    if (init?.method === "PATCH") return json(200, { ...schedule, ...JSON.parse(String(init.body)) });
    if (url.includes("/api/actuators")) return json(200, [pump]);
    return json(200, [schedule]);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("Kartu Jadwal siram", () => {
  it("menampilkan jam, lama, dan hasil terakhir dalam bahasa petani", async () => {
    signIn();
    renderWithProviders(<IrrigationScheduleCard />);
    expect(await screen.findByText("06:00")).toBeInTheDocument();
    expect(screen.getByText("siram 5 mnt")).toBeInTheDocument();
    expect(screen.getByText("Dibatalkan demi keamanan: listrik PLN padam, memakai baterai")).toBeInTheDocument();
    expect(screen.queryByText(/backup power/)).not.toBeVisible();
  });

  it("operator mengetik jam & lama; jam yang sudah ada ditolak dengan pesan petani", async () => {
    signIn();
    const { user } = renderWithProviders(<IrrigationScheduleCard />);
    await user.click(await screen.findByRole("button", { name: "Tambah jam" }));
    // Bawaan 06:00 sudah dipakai → 409 DUPLICATE_TIME.
    await user.click(screen.getByRole("button", { name: "Simpan jadwal 06:00" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Jam 06:00 sudah ada di jadwal. Pilih jam lain.");

    const time = screen.getByRole("textbox", { name: /Jam siram/ });
    expect(time).toHaveAttribute("inputmode", "numeric");
    await user.clear(time);
    await user.type(time, "1730");
    expect(time).toHaveValue("17:30");
    const minutes = screen.getByRole("textbox", { name: "Lama siram" });
    await user.clear(minutes);
    await user.type(minutes, "1,5");
    await user.click(screen.getByRole("button", { name: "Simpan jadwal 17:30" }));
    await waitFor(() => {
      const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
      expect(JSON.parse(String(posts.at(-1)?.[1]?.body))).toEqual({ time: "17:30", durationSeconds: 90 });
    });
  });

  it("jam tidak sah dan lama melebihi batas pompa diberi pesan, isian tidak dihapus", async () => {
    signIn();
    const { user } = renderWithProviders(<IrrigationScheduleCard />);
    await user.click(await screen.findByRole("button", { name: "Tambah jam" }));
    expect(await screen.findByText(/Paling lama 15 menit/)).toBeInTheDocument();
    const time = screen.getByRole("textbox", { name: /Jam siram/ });
    await user.clear(time);
    await user.type(time, "2575");
    const minutes = screen.getByRole("textbox", { name: "Lama siram" });
    await user.clear(minutes);
    await user.type(minutes, "20");
    await user.click(screen.getByRole("button", { name: "Simpan jadwal" }));
    expect(await screen.findByText("Jam tidak valid, contoh 06:00 atau 17:30.")).toBeInTheDocument();
    expect(screen.getByText("Terlalu lama. Pompa siram paling lama 15 menit sekali jalan.")).toBeInTheDocument();
    expect(time).toHaveValue("25:75");
    expect(minutes).toHaveValue("20");
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  it("saklar mematikan jadwal lewat PATCH enabled=false", async () => {
    signIn();
    const { user } = renderWithProviders(<IrrigationScheduleCard />);
    await user.click(await screen.findByRole("switch", { name: "Jadwal 06:00 aktif" }));
    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
      expect(String(patch?.[0])).toContain("/api/irrigation/schedules/1");
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ enabled: false });
    });
  });

  it("Pelihat hanya melihat: tanpa tambah, ubah, hapus, dan saklar", async () => {
    signIn("VIEWER", "pelihat");
    renderWithProviders(<IrrigationScheduleCard />);
    expect(await screen.findByText("06:00")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tambah jam|Ubah jadwal|Hapus jadwal/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});
