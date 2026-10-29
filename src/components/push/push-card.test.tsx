import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { json, renderWithProviders, signIn } from "@/test/utils";
import * as push from "@/lib/push";
import { PushCard } from "./push-card";

vi.mock("@/lib/push", () => ({
  pushSupport: vi.fn(() => "ok"),
  currentSubscription: vi.fn(async () => null),
  enablePush: vi.fn(async () => "on"),
  disablePush: vi.fn(async () => undefined),
  sameServerKey: vi.fn(() => true),
}));

const config = (enabled: boolean, subscriptions = 0) => ({ enabled, publicKey: enabled ? "AQID" : null, minSeverity: "CRITICAL", subscriptions });

function stubApi(cfg: ReturnType<typeof config>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => (url.includes("/push/test") ? json(200, { delivered: 1, removed: 0, failed: 0 }) : json(200, cfg))),
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("Notification", { permission: "default" });
  vi.mocked(push.pushSupport).mockReturnValue("ok");
  vi.mocked(push.enablePush).mockResolvedValue("on");
});
afterEach(() => vi.unstubAllGlobals());

describe("Kartu notifikasi di HP ini", () => {
  it("server belum punya kunci VAPID → tanpa saklar (juga untuk Pelihat)", async () => {
    signIn("VIEWER", "pelihat");
    stubApi(config(false));
    renderWithProviders(<PushCard />);
    expect(await screen.findByText("Notifikasi belum diaktifkan di server.")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("dibuka lewat http://IP → minta alamat https", async () => {
    signIn();
    stubApi(config(true));
    vi.mocked(push.pushSupport).mockReturnValue("insecure");
    renderWithProviders(<PushCard />);
    expect(await screen.findByText(/butuh alamat https/)).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("menyalakan dari klik, lalu kirim notifikasi uji", async () => {
    signIn("VIEWER", "pelihat");
    stubApi(config(true, 0));
    const { user } = renderWithProviders(<PushCard />);
    const toggle = await screen.findByRole("switch", { name: "Kirim notifikasi ke HP ini" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(push.enablePush).not.toHaveBeenCalled(); // izin tidak diminta tanpa klik
    await user.click(toggle);
    expect(push.enablePush).toHaveBeenCalledWith("AQID");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("button", { name: "Kirim notifikasi uji" }));
    expect(await screen.findByText(/Terkirim ke 1 perangkat/)).toBeInTheDocument();
  });

  it("izin ditolak → penjelasan cara membuka izin di browser", async () => {
    signIn();
    stubApi(config(true));
    vi.mocked(push.enablePush).mockResolvedValue("blocked");
    const { user } = renderWithProviders(<PushCard />);
    await user.click(await screen.findByRole("switch", { name: "Kirim notifikasi ke HP ini" }));
    expect(await screen.findByText(/diblokir/)).toBeInTheDocument();
  });
});
