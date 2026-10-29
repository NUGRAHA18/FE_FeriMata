import { screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { json, overview, renderWithProviders, signIn } from "@/test/utils";
import GuidePage from "./page";

vi.mock("next/link", () => ({ default: ({ href, ...p }: ComponentProps<"a"> & { href: string }) => <a href={href} {...p} /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }), usePathname: () => "/panduan" }));

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/panduan");
  vi.stubGlobal("fetch", vi.fn(() => json(200, overview())));
});
afterEach(() => vi.unstubAllGlobals());

const kontrolButton = () => screen.getByRole("button", { name: /^Kontrol$/ });

describe("Halaman Panduan", () => {
  it("dibuka dari #anchor: bagian itu langsung terbuka, hanya satu sekaligus", async () => {
    signIn();
    window.history.replaceState(null, "", "/panduan#kontrol");
    const { user } = renderWithProviders(<GuidePage />);
    expect(kontrolButton()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Terkirim, menunggu jawaban alat")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Sensor$/ }));
    expect(screen.getByRole("button", { name: /^Sensor$/ })).toHaveAttribute("aria-expanded", "true");
    expect(kontrolButton()).toHaveAttribute("aria-expanded", "false");
    expect(window.location.hash).toBe("#sensor");
  });

  it("Operator tidak melihat catatan khusus Pelihat", () => {
    signIn("OPERATOR");
    window.history.replaceState(null, "", "/panduan#kontrol");
    renderWithProviders(<GuidePage />);
    expect(screen.queryByText(/Hanya operator atau admin yang bisa menyalakan alat/)).not.toBeInTheDocument();
  });

  it("Pelihat tetap mendapat penjelasan Kontrol, dengan catatan hanya operator yang bisa menyalakan", () => {
    signIn("VIEWER", "pelihat");
    window.history.replaceState(null, "", "/panduan#kontrol");
    renderWithProviders(<GuidePage />);
    expect(screen.getByText(/Hanya operator atau admin yang bisa menyalakan alat/)).toBeInTheDocument();
    expect(screen.getByText("Tunggu sampai tulisannya berubah dari \"Terkirim, menunggu jawaban alat\" menjadi \"Dijalankan\".")).toBeInTheDocument();
  });

  it("pencarian menyaring bagian dan membuka semua yang cocok", async () => {
    signIn();
    const { user } = renderWithProviders(<GuidePage />);
    expect(screen.getByRole("navigation", { name: "Daftar isi panduan" })).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Cari di panduan" }), "iphone");
    expect(screen.queryByRole("navigation", { name: "Daftar isi panduan" })).not.toBeInTheDocument();
    const akun = screen.getByRole("button", { name: /Akun & notifikasi/ });
    expect(akun).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("button", { name: /^Kontrol$/ })).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "Cari di panduan" }));
    await user.type(screen.getByRole("searchbox", { name: "Cari di panduan" }), "zzzz");
    expect(screen.getByText("Tidak ditemukan")).toBeInTheDocument();
  }, 15_000); // mengetik per huruf dengan user-event lambat saat semua berkas test berjalan bersamaan

  it("tombol Ulangi petunjuk singkat membuka petunjuk Beranda", async () => {
    signIn();
    const { user } = renderWithProviders(<GuidePage />);
    await user.click(screen.getByRole("button", { name: "Ulangi petunjuk singkat Beranda" }));
    const dialog = screen.getByRole("dialog", { name: /selamat datang/i });
    expect(within(dialog).getByText(/Petunjuk 1 dari/)).toBeInTheDocument();
  });
});
