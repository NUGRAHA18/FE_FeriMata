import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { qk } from "@/lib/api/query-keys";
import type { ActuatorCommand } from "@/lib/api/types";
import { CommandDialog } from "./command-dialog";

const actuator = { id: 5, code: "DOSING-N", name: "Pompa dosing N", deviceCode: "RIO-TANK-01", maxRunSeconds: 30 };

const sent: ActuatorCommand = {
  id: 1, commandUid: "uid-abc", actuatorId: 5, actuatorCode: "DOSING-N", deviceId: 5, deviceCode: "RIO-TANK-01", commandType: "ON",
  parameters: { durationSeconds: 10 }, source: "OPERATOR", requestedBy: "operator", status: "SENT",
  requestedAt: "2026-09-19T07:00:00Z", sentAt: "2026-09-19T07:00:00Z", executedAt: null, errorMessage: null,
};

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

function setup(command: "ON" | "OFF" = "ON") {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onSent = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <CommandDialog actuator={actuator} command={command} open onClose={() => {}} onSent={onSent} />
    </QueryClientProvider>,
  );
  return { qc, onSent, user: userEvent.setup() };
}

afterEach(() => vi.unstubAllGlobals());

describe("CommandDialog", () => {
  it("mewajibkan durasi ≤ maxRunSeconds sebelum mengirim ON", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /kirim on/i }));
    expect(await screen.findByText(/durasi wajib diisi/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/durasi/i), "45");
    await user.click(screen.getByRole("button", { name: /kirim on/i }));
    expect(await screen.findByText(/maksimal 30 detik/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mengirim ON dengan durationSeconds, lalu menampilkan status SENT dan mengikuti event hingga EXECUTED", async () => {
    const fetchMock = vi.fn(() => json(202, sent));
    vi.stubGlobal("fetch", fetchMock);
    const { user, qc, onSent } = setup();
    await user.type(screen.getByLabelText(/durasi/i), "10");
    await user.click(screen.getByRole("button", { name: /kirim on/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/actuators\/5\/commands$/);
    expect(JSON.parse(init.body as string)).toEqual({ command: "ON", parameters: { durationSeconds: 10 } });

    expect(await screen.findByText(/menunggu konfirmasi perangkat/i)).toBeInTheDocument();
    expect(onSent).toHaveBeenCalledWith(expect.objectContaining({ uid: "uid-abc" }));

    qc.setQueryData(qk.command("uid-abc"), { ...sent, status: "EXECUTED", executedAt: "2026-09-19T07:00:03Z" });
    expect(await screen.findByText(/— Dijalankan/)).toBeInTheDocument();
  });

  it("menjelaskan penolakan interlock dalam Bahasa Indonesia", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json(409, { status: 409, error: "SAFETY_INTERLOCK", message: "blocked", details: { interlock: "BACKUP_POWER" } })));
    const { user } = setup();
    await user.type(screen.getByLabelText(/durasi/i), "10");
    await user.click(screen.getByRole("button", { name: /kirim on/i }));
    expect(await screen.findByText(/listrik pln padam/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /kirim on/i })).toBeEnabled();
  });

  it("STOP tidak meminta durasi", async () => {
    const fetchMock = vi.fn(() => json(202, { ...sent, commandType: "OFF", parameters: null }));
    vi.stubGlobal("fetch", fetchMock);
    const { user } = setup("OFF");
    expect(screen.queryByLabelText(/durasi/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /kirim stop/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ command: "OFF" });
  });
});
