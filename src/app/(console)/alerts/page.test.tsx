import { screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { alert, json, overview, page, renderWithProviders, signIn } from "@/test/utils";
import AlertsPage from "./page";

vi.mock("next/link", () => ({ default: ({ href, ...p }: ComponentProps<"a"> & { href: string }) => <a href={href} {...p} /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }), usePathname: () => "/alerts" }));

/** Backend tiruan: /alerts menghormati filter acknowledged & severity; PATCH acknowledge. */
function backend() {
  const all = [alert(1, "CRITICAL"), alert(2, "WARNING"), alert(3, "INFO", true)];
  const calls: string[] = [];
  const fetchMock = vi.fn((input: string, init?: RequestInit) => {
    const url = new URL(input, "http://localhost");
    calls.push(`${init?.method ?? "GET"} ${url.pathname}${url.search}`);
    if (url.pathname === "/api/dashboard/overview") return json(200, overview());
    const ack = url.pathname.match(/^\/api\/alerts\/(\d+)\/acknowledge$/);
    if (ack) {
      const a = all.find((x) => x.id === Number(ack[1]))!;
      Object.assign(a, { acknowledged: true, acknowledgedBy: "operator", acknowledgedAt: new Date().toISOString() });
      return json(200, a);
    }
    if (url.pathname === "/api/alerts") {
      const acked = url.searchParams.get("acknowledged");
      const sev = url.searchParams.get("severity");
      return json(200, page(all.filter((a) => (acked == null || String(a.acknowledged) === acked) && (!sev || a.severity === sev))));
    }
    return json(404, { status: 404, error: "RESOURCE_NOT_FOUND", message: "tidak ada" });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("Halaman Peringatan", () => {
  it("awalnya menampilkan yang belum ditangani, dan ringkasan dari overview", async () => {
    backend();
    signIn();
    renderWithProviders(<AlertsPage />);
    expect(await screen.findByText("Peringatan 1")).toBeInTheDocument();
    expect(screen.getByText("Peringatan 2")).toBeInTheDocument();
    expect(screen.queryByText("Peringatan 3")).not.toBeInTheDocument();
    expect(await screen.findByText(/2 belum ditangani · 1 darurat · 1 perlu perhatian/)).toBeInTheDocument();
  });

  it("filter tingkat dan status dikirim ke backend", async () => {
    const calls = backend();
    signIn();
    const { user } = renderWithProviders(<AlertsPage />);
    await screen.findByText("Peringatan 1");
    await user.click(screen.getByRole("radio", { name: "Darurat" }));
    await waitFor(() => expect(screen.queryByText("Peringatan 2")).not.toBeInTheDocument());
    expect(calls.some((c) => c.includes("severity=CRITICAL") && c.includes("acknowledged=false"))).toBe(true);

    await user.click(screen.getByRole("radio", { name: "Semua tingkat" }));
    await user.click(screen.getByRole("radio", { name: "Sudah ditangani" }));
    expect(await screen.findByText("Peringatan 3")).toBeInTheDocument();
    expect(screen.queryByText("Peringatan 1")).not.toBeInTheDocument();
  });

  it("operator bisa menandai peringatan sudah ditangani", async () => {
    const calls = backend();
    signIn();
    const { user } = renderWithProviders(<AlertsPage />);
    await screen.findByText("Peringatan 2");
    // Urutan tampil = urutan dari backend: tombol kedua milik peringatan 2.
    await user.click(screen.getAllByRole("button", { name: /tandai sudah ditangani/i })[1]);
    await waitFor(() => expect(calls).toContain("PATCH /api/alerts/2/acknowledge"));
  });

  it("pelihat (VIEWER) tidak mendapat tombol tandai", async () => {
    backend();
    signIn("VIEWER", "pelihat");
    renderWithProviders(<AlertsPage />);
    await screen.findByText("Peringatan 1");
    expect(screen.queryByRole("button", { name: /tandai sudah ditangani/i })).not.toBeInTheDocument();
  });
});
