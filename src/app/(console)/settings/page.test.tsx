import { screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { json, overview, renderWithProviders, signIn } from "@/test/utils";
import SettingsPage from "./page";

vi.mock("next/link", () => ({ default: ({ href, ...p }: ComponentProps<"a"> & { href: string }) => <a href={href} {...p} /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }), usePathname: () => "/settings" }));

beforeEach(() => {
  localStorage.clear();
  // local-state juga punya cadangan di memori; set eksplisit supaya tiap test mulai bersih.
  localStorage.setItem("fertimata.simple-mode", "off");
  vi.stubGlobal("fetch", vi.fn(() => json(200, overview())));
});
afterEach(() => vi.unstubAllGlobals());

describe("Halaman Pengaturan", () => {
  it("mode sederhana menyembunyikan panel Info teknis dan tersimpan di perangkat", async () => {
    signIn();
    const { user, unmount } = renderWithProviders(<SettingsPage />);
    expect(screen.getByText("Info teknis")).toBeInTheDocument();
    const toggle = screen.getByRole("switch", { name: "Mode sederhana" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText("Info teknis")).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<SettingsPage />);
    expect(screen.queryByText("Info teknis")).not.toBeInTheDocument();
  });

  it("tombol Buka petunjuk membuka petunjuk dari langkah pertama", async () => {
    signIn();
    const { user } = renderWithProviders(<SettingsPage />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /buka petunjuk/i }));
    expect(screen.getByRole("dialog", { name: /selamat datang/i })).toBeInTheDocument();
  });

  it("menu Pengguna hanya untuk ADMIN", () => {
    signIn("OPERATOR");
    const { unmount } = renderWithProviders(<SettingsPage />);
    expect(screen.queryByRole("link", { name: /kelola pengguna/i })).not.toBeInTheDocument();
    unmount();
    signIn("ADMIN", "admin");
    renderWithProviders(<SettingsPage />);
    expect(screen.getByRole("link", { name: /kelola pengguna/i })).toHaveAttribute("href", "/users");
  });
});
