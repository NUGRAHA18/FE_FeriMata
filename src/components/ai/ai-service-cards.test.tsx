import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { json, renderWithProviders, signIn } from "@/test/utils";
import { AiHistoryCard, AiServiceStatusCard, AiStatusChip, DetectNowCard } from "./ai-service-cards";

const status = (o: Record<string, unknown>) => ({ configured: true, reachable: true, message: "Running Melon AI System API", latencyMs: 22, checkedAt: "2026-11-02T16:00:55Z", ...o });

function serve(body: unknown) {
  const fetchMock = vi.fn((url: string) => (String(url).includes("/api/ai/status") ? json(200, body) : json(404, {})));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("status layanan AI", () => {
  it("berjalan: hijau, akibatnya untuk petani; teks mentah AI hanya di Detail sistem", async () => {
    signIn("VIEWER", "viewer");
    const fetchMock = serve(status({}));
    renderWithProviders(<AiServiceStatusCard />);
    expect(await screen.findByText("Layanan AI berjalan")).toBeInTheDocument();
    expect(screen.getByText("Takaran pupuk dihitung AI (kecuali Anda atur sendiri).")).toBeInTheDocument();
    const tech = screen.getByText("Running Melon AI System API");
    expect(tech.closest("details")).not.toBeNull();
    // Selalu lewat backend, tidak pernah ke port AI langsung.
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/ai\/status$/);
  });

  it("mati: siram tetap jalan, pemupukan ditunda", async () => {
    signIn();
    serve(status({ reachable: false, message: "Connection refused", latencyMs: null }));
    renderWithProviders(<AiServiceStatusCard />);
    expect(await screen.findByText("Layanan AI mati")).toBeInTheDocument();
    expect(screen.getByText(/pemupukan otomatis ditunda sampai AI menyala lagi/)).toBeInTheDocument();
  });

  it("lencana: belum diatur (netral)", async () => {
    signIn();
    serve(status({ configured: false, reachable: false }));
    renderWithProviders(<AiStatusChip />);
    expect(await screen.findByText("AI belum diatur")).toBeInTheDocument();
  });

  it("belum diatur: riwayat tidak meminta ke AI dan tombol periksa nonaktif (bukan merah 'tidak menjawab')", async () => {
    signIn();
    const fetchMock = serve(status({ configured: false, reachable: false, message: "AI_SERVICE_URL is empty" }));
    renderWithProviders(
      <>
        <AiHistoryCard />
        <DetectNowCard />
      </>,
    );
    expect(await screen.findByText("Layanan AI belum diatur")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Periksa foto patroli terbaru/ })).toBeDisabled();
    expect(screen.queryByText(/tidak menjawab/)).toBeNull();
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("/ai/history"))).toBe(false);
  });
});
