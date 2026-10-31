import { screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { json, renderWithProviders, signIn, t } from "@/test/utils";
import CultivationPage from "./page";

vi.mock("next/link", () => ({ default: ({ href, ...p }: ComponentProps<"a"> & { href: string }) => <a href={href} {...p} /> }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/cultivation",
  useSearchParams: () => new URLSearchParams(),
}));

const phase = (code: string, name: string, startHst: number, endHst: number | null) => ({
  code, name, startHst, endHst, ecTargetMin: 1.2, ecTargetMax: 2.5, ratioN: null, ratioP: null, ratioK: null, notes: null,
});
const cycle = {
  // Nama lama `transplantDate` (backend sebelum 31 Okt 2026): tetap terbaca sebagai tanggal semai.
  id: 2, code: "MT-1", name: "Musim tanam", variety: null, transplantDate: "2026-09-21", expectedHarvestDate: null, endedAt: null, status: "ACTIVE",
  notes: null,
  phases: [
    phase("SEMAI", "Semai", 0, 7),
    phase("VEGETATIF", "Vegetatif", 8, 24),
    phase("PEMBUNGAAN", "Pembungaan", 25, 34),
    phase("PEMBUAHAN", "Pembuahan", 35, 60),
    phase("PEMATANGAN", "Pematangan", 61, 74),
    phase("PANEN", "Panen", 75, null),
  ],
  createdAt: t(0), updatedAt: t(0),
};
const today = { cycle, today: "2026-10-29", hst: 47, currentPhase: cycle.phases[3], nextPhase: cycle.phases[4], daysUntilNextPhase: 14, plantCount: 1, treatmentPlantCount: 0 };
const plant = {
  id: 5, code: "Melon-pojok-03", name: "Melon pojok 03", description: "dekat pintu", cycleId: 2, cycleCode: "MT-1", treatmentCode: null, blockCode: null, rowCode: null, plotCode: null,
  stationCode: null, positionInRow: null, comparisonGroup: null, taggedLeaves: null, active: true, metadata: null, lastObservation: null, createdAt: t(0), updatedAt: t(0),
};

let fetchMock: ReturnType<typeof vi.fn>;
let hasDate = true;
beforeEach(() => {
  localStorage.clear();
  hasDate = true;
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === "DELETE") return Promise.resolve(new Response(null, { status: 204 }));
    if (init?.method === "PUT") {
      hasDate = true;
      // Backend baru: hanya `sowingDate`.
      return json(200, { ...today, cycle: { ...cycle, transplantDate: undefined, sowingDate: JSON.parse(String(init.body)).sowingDate } });
    }
    if (init?.method === "POST") return json(201, { ...plant, id: 6, name: JSON.parse(String(init.body)).name });
    if (url.includes("/cultivation/active")) return hasDate ? json(200, today) : json(404, { status: 404, error: "RESOURCE_NOT_FOUND", message: "No active cycle" });
    return json(200, [plant]);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("Halaman Tanaman", () => {
  it("tanggal semai sudah ada: form hanya menampilkannya, tanaman dikirim dengan nama saja", async () => {
    signIn();
    const { user } = renderWithProviders(<CultivationPage />);
    await user.click(await screen.findByRole("button", { name: "Tambah tanaman" }));
    expect(screen.getByText(/Disemai bersamaan pada/)).toHaveTextContent("hari ke-47");
    expect(screen.queryByLabelText("Tanggal semai")).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Nama tanaman" }), "  Melon 06 ");
    await user.click(screen.getByRole("button", { name: "Simpan tanaman" }));
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({ name: "Melon 06" });
    });
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
  });

  it("operator menghapus tanaman lewat dialog konfirmasi", async () => {
    signIn();
    const { user } = renderWithProviders(<CultivationPage />);
    await user.click(await screen.findByRole("button", { name: "Hapus tanaman Melon pojok 03" }));
    const dialog = screen.getByRole("dialog", { name: "Hapus tanaman Melon pojok 03?" });
    expect(dialog).toHaveTextContent("Tidak bisa dibatalkan.");
    // Daftar berisi satu tanaman → peringatan bahwa tanggal semai ikut dikosongkan.
    expect(dialog).toHaveTextContent("Ini tanaman terakhir; tanggal semai juga akan dikosongkan.");
    await user.click(screen.getByRole("button", { name: "Hapus" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/plants/5"), expect.objectContaining({ method: "DELETE" })));
    // Umur tanaman diambil ulang (bisa jadi kosong lagi setelah tanaman terakhir dihapus).
    await waitFor(() => expect(fetchMock.mock.calls.filter(([u]) => String(u).includes("/cultivation/active")).length).toBeGreaterThan(1));
  });

  it("daftar tanaman diambil tanpa cycleId (semua tanaman aktif)", async () => {
    signIn();
    renderWithProviders(<CultivationPage />);
    await screen.findByText("Melon pojok 03");
    const plantsUrl = fetchMock.mock.calls.map(([u]) => String(u)).find((u) => u.includes("/api/plants"));
    expect(plantsUrl).toContain("active=true");
    expect(plantsUrl).not.toContain("cycleId");
  });

  it("tanaman pertama: tanggal semai wajib, disimpan dulu (PUT) lalu tanaman (POST)", async () => {
    hasDate = false;
    signIn();
    const { user } = renderWithProviders(<CultivationPage />);
    expect(await screen.findByText("Tanggal semai belum diisi")).toBeInTheDocument();
    expect(screen.getByText("Tambahkan tanaman pertama untuk mulai menghitung hari tanam.")).toBeInTheDocument();
    expect(await screen.findByText("Melon pojok 03")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tambah tanaman pertama" }));
    const date = screen.getByLabelText("Tanggal semai");
    expect(date).toHaveAttribute("type", "date");
    await user.clear(date);
    await user.type(date, "2026-09-12");
    await user.type(screen.getByRole("textbox", { name: "Nama tanaman" }), "Melon 01");
    await user.click(screen.getByRole("button", { name: "Simpan tanaman" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    const writes = fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT" || init?.method === "POST");
    expect(writes.map(([u, init]) => `${init?.method} ${new URL(String(u)).pathname}`)).toEqual(["PUT /api/cultivation/sowing-date", "POST /api/plants"]);
    expect(JSON.parse(String(writes[0][1]?.body))).toEqual({ sowingDate: "2026-09-12" });
    expect(screen.queryByText(/siklus|Pengaturan/i)).not.toBeInTheDocument();
  });

  it("operator bisa mengoreksi tanggal semai dari kartu Umur tanaman", async () => {
    signIn();
    const { user } = renderWithProviders(<CultivationPage />);
    await user.click(await screen.findByRole("button", { name: "Ubah tanggal semai" }));
    const date = screen.getByLabelText("Tanggal semai");
    await user.clear(date);
    await user.type(date, "2026-09-15");
    await user.click(screen.getByRole("button", { name: "Simpan tanggal" }));
    await waitFor(() => {
      const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
      expect(JSON.parse(String(put?.[1]?.body))).toEqual({ sowingDate: "2026-09-15" });
    });
  });

  it("Pelihat tidak melihat tombol tambah dan hapus", async () => {
    signIn("VIEWER", "pelihat");
    renderWithProviders(<CultivationPage />);
    expect(await screen.findByText("Melon pojok 03")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tambah tanaman|Hapus tanaman|Ubah tanggal semai/ })).not.toBeInTheDocument();
  });
});
