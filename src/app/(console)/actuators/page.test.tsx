import { screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Actuator, SensorReading } from "@/lib/api/types";
import { json, overview, renderWithProviders, signIn, t } from "@/test/utils";
import ActuatorsPage from "./page";

vi.mock("next/link", () => ({ default: ({ href, ...p }: ComponentProps<"a"> & { href: string }) => <a href={href} {...p} /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }), usePathname: () => "/actuators" }));
// jsdom tidak punya WebGL: kartu kereta memakai denah 2D, sama seperti ponsel tanpa WebGL.
vi.mock("@/components/trolley/trolley-scene", () => ({
  default: ({ onUnavailable }: { onUnavailable: () => void }) => {
    queueMicrotask(onUnavailable);
    return null;
  },
}));

let id = 0;
function act(code: string, name: string, type: string, deviceCode: string, supportedCommands: string[], currentState = "OFF"): Actuator {
  id += 1;
  return {
    id, deviceId: deviceCode === "JETSON-01" ? 2 : 1, deviceCode, code, name, type, enabled: true, currentState, stateUpdatedAt: t(0),
    maxRunSeconds: null, supportedCommands, description: null, metadata: null, createdAt: t(0), updatedAt: t(0),
  };
}

function trolleyReading(metricKey: string, value: number): SensorReading {
  return { id: metricKey.length, sensorId: metricKey.length, sensorCode: metricKey, metricKey, deviceId: 2, deviceCode: "JETSON-01", value, textValue: null, unit: null, recordedAt: t(0), receivedAt: t(0) };
}

const actuators = [
  act("DIST-PUMP", "Pompa air utama", "DISTRIBUTION_PUMP", "PANEL-01", ["ON", "OFF"]),
  act("CAMERA-PAN", "Arah kamera (timur/barat)", "CAMERA_PAN", "PANEL-01", ["ON", "OFF"]),
  act("TROLLEY-RUN", "Kereta kamera (jalan)", "TROLLEY_MOTOR", "PANEL-01", ["ON", "OFF"]),
  act("TROLLEY-DIR", "Kereta kamera (arah)", "TROLLEY_DIRECTION", "PANEL-01", ["ON", "OFF"]),
  act("TROLLEY-PATROL", "Patroli kamera", "TROLLEY_PATROL", "JETSON-01", ["START", "STOP"]),
  act("TROLLEY-GOTO", "Pindahkan kereta kamera", "TROLLEY_POSITION", "JETSON-01", ["HOME", "GOTO_STATION", "STOP"]),
];

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  const o = overview();
  o.sensors.latestReadings = [trolleyReading("trolley.station", 3), trolleyReading("trolley.home_limit", 0), trolleyReading("trolley.end_limit", 0)];
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === "POST") return json(202, { commandUid: "u1", status: "SENT", actuatorId: 0, command: "GOTO_STATION", requestedAt: t(1) });
    if (String(url).includes("/actuators")) return json(200, actuators);
    return json(200, o);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("Halaman Kontrol: kereta kamera", () => {
  it("kartu Kereta kamera menggantikan kartu GOTO/PATROL, relay mentah R2/R3 hanya di Servis yang tertutup", async () => {
    signIn();
    renderWithProviders(<ActuatorsPage />);
    expect(await screen.findByRole("heading", { name: "Kereta kamera" })).toBeInTheDocument();
    expect(screen.getByText("Di stasiun 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /kembali ke awal/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /patroli sekarang/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /hentikan/i })).toBeEnabled();
    // Kartu aktuator biasa untuk GOTO tidak ada lagi (tombol "Pindah ke stasiun" tanpa nomor).
    expect(screen.queryByRole("button", { name: /^pindah ke stasiun$/i })).not.toBeInTheDocument();

    expect(screen.getAllByText("Pompa air utama")[0]).toBeVisible();
    expect(screen.getAllByText("Arah kamera (timur/barat)")[0]).toBeVisible();
    const service = screen.getByText("Servis kereta kamera (untuk teknisi)").closest("details")!;
    expect(service).not.toHaveAttribute("open");
    expect(within(service).getAllByText("Kereta kamera (jalan)").length).toBeGreaterThan(0);
    expect(within(service).getAllByText("Kereta kamera (arah)").length).toBeGreaterThan(0);
  });

  it("memilih stasiun membuka konfirmasi dengan stasiun itu dan mengirim GOTO_STATION", async () => {
    signIn();
    const { user } = renderWithProviders(<ActuatorsPage />);
    const stop5 = await screen.findByRole("button", { name: "Tampilkan foto stasiun ST-05" });
    await user.click(stop5);
    await user.click(screen.getByRole("button", { name: "Pindah ke stasiun 5" }));
    const dialog = await screen.findByRole("dialog", { name: /pindahkan kereta kamera/i });
    expect(within(dialog).getByRole("button", { name: "Stasiun 5" })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(dialog).getByRole("button", { name: "Pindahkan" }));
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(post).toBeDefined();
      expect(String(post![0])).toContain(`/actuators/${actuators[5].id}/commands`);
      expect(JSON.parse(String(post![1]!.body))).toEqual({ command: "GOTO_STATION", parameters: { station: 5 } });
    });
  });

  it("stasiun tempat kereta berada tidak bisa dijadikan tujuan", async () => {
    signIn();
    const { user } = renderWithProviders(<ActuatorsPage />);
    await user.click(await screen.findByRole("button", { name: "Tampilkan foto stasiun ST-03" }));
    expect(screen.getByRole("button", { name: "Pindah ke stasiun 3" })).toBeDisabled();
    expect(screen.getByText(/kereta sudah di sini/)).toBeInTheDocument();
  });

  it("Pemantau melihat status tanpa tombol perintah", async () => {
    signIn("VIEWER", "pemantau");
    renderWithProviders(<ActuatorsPage />);
    expect(await screen.findByRole("heading", { name: "Kereta kamera" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /kembali ke awal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hentikan/i })).not.toBeInTheDocument();
  });
});
