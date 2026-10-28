import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiOrigin } from "@/config/site";
import type { AiDetection } from "@/lib/api/types";
import { DetectionImage, isProtectedCapture, resolveImageUrl } from "./detection-parts";

const detection = (imageUrl: string | null): AiDetection => ({
  id: 1, deviceId: 1, deviceCode: "JETSON-01", plantId: null, plantCode: null, detectionType: "NUTRIENT_DEFICIENCY", label: null, confidence: null,
  scores: null, stationCode: "ST-03", panDirection: "TIMUR", captureId: "c", imageUrl, metadata: null, detectedAt: "2026-10-22T12:05:00Z", createdAt: "2026-10-22T12:05:00Z",
});

afterEach(() => vi.unstubAllGlobals());

describe("foto patroli /captures (BE-2)", () => {
  it("hanya /captures di origin backend yang butuh token", () => {
    expect(isProtectedCapture(resolveImageUrl("/captures/2026-10-22/a.png"))).toBe(true);
    expect(isProtectedCapture("https://cdn.example.com/captures/a.png")).toBe(false);
    expect(isProtectedCapture(resolveImageUrl("/static/a.png"))).toBe(false);
    expect(isProtectedCapture(null)).toBe(false);
  });

  it("diambil dengan fetch + token lalu ditampilkan sebagai object URL", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response("png", { status: 200, headers: { "Content-Type": "image/png" } })));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:foto-1"), revokeObjectURL: vi.fn() }));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <DetectionImage detection={detection("/captures/2026-10-22/a.png")} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("img")).toHaveAttribute("src", "blob:foto-1");
    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${apiOrigin()}/captures/2026-10-22/a.png`);
  });

  it("gagal dimuat → placeholder dengan kode stasiun", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("", { status: 404 }))));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })}>
        <DetectionImage detection={detection("/captures/x.png")} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText(/tidak dapat dimuat/i)).toBeInTheDocument());
    expect(screen.getByText("ST-03")).toBeInTheDocument();
  });
});
