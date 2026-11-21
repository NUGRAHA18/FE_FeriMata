import { screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { json, overview, renderWithProviders, signIn } from "@/test/utils";
import GuidePage from "./page";

vi.mock("next/link", () => ({ default: ({ href, ...p }: ComponentProps<"a"> & { href: string }) => <a href={href} {...p} /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }), usePathname: () => "/panduan" }));

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(() => json(200, overview())));
});
afterEach(() => vi.unstubAllGlobals());

describe("Panduan: bagian bergambar", () => {
  it("Beranda menampilkan gambar bernomor lebih dulu, dan teks lengkap dilipat", () => {
    signIn();
    window.history.replaceState(null, "", "/panduan#beranda");
    renderWithProviders(<GuidePage />);
    expect(screen.getAllByAltText(/Contoh tampilan Beranda/)).toHaveLength(3);
    const summary = screen.getByText("Baca penjelasan lengkap");
    expect(summary.closest("details")).not.toHaveAttribute("open");
  });

  it("bagian yang belum bergambar tetap menampilkan teksnya langsung", () => {
    signIn();
    window.history.replaceState(null, "", "/panduan#perangkat");
    renderWithProviders(<GuidePage />);
    expect(screen.queryByText("Baca penjelasan lengkap")).not.toBeInTheDocument();
    expect(screen.getByText("Yang tampil di layar")).toBeInTheDocument();
  });
});
