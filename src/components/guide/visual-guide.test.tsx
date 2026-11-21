import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { visualGuideFor } from "@/lib/guide-visual";
import { VisualGuideView } from "./visual-guide";

vi.mock("next/link", () => ({ default: ({ href, ...p }: ComponentProps<"a"> & { href: string }) => <a href={href} {...p} /> }));

const guide = visualGuideFor("beranda")!;

describe("Panduan bergambar", () => {
  it("menampilkan tiap potongan gambar dengan teks alternatif", () => {
    render(<VisualGuideView guide={guide} />);
    expect(screen.getAllByAltText(/Contoh tampilan Beranda, bagian \d dari 3/)).toHaveLength(3);
  });

  it("mengetuk nomor di gambar menyalakan penjelasannya, mengetuk lagi mematikan", async () => {
    const user = userEvent.setup();
    render(<VisualGuideView guide={guide} />);
    const marker = screen.getByRole("button", { name: "Bagian 3: Siram otomatis" });
    expect(marker).toHaveAttribute("aria-pressed", "false");
    await user.click(marker);
    expect(marker).toHaveAttribute("aria-pressed", "true");
    const item = document.getElementById("gv-beranda-siram")!;
    expect(item).toHaveAttribute("data-active", "true");
    await user.click(marker);
    expect(item).not.toHaveAttribute("data-active");
  });

  it("mengetuk judul penjelasan menyalakan bagian yang sama di gambar", async () => {
    const user = userEvent.setup();
    render(<VisualGuideView guide={guide} />);
    const item = document.getElementById("gv-beranda-drum")!;
    await user.click(within(item).getByRole("button", { name: /Drum pupuk/ }));
    expect(screen.getByRole("button", { name: "Bagian 8: Drum pupuk" })).toHaveAttribute("aria-pressed", "true");
  });

  it("hanya satu bagian menyala sekaligus, dan tautan ke halamannya ada", async () => {
    const user = userEvent.setup();
    render(<VisualGuideView guide={guide} />);
    await user.click(screen.getByRole("button", { name: "Bagian 2: Kondisi greenhouse" }));
    await user.click(screen.getByRole("button", { name: "Bagian 6: Umur tanaman" }));
    expect(screen.getByRole("button", { name: "Bagian 2: Kondisi greenhouse" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("link", { name: /Buka Tanaman/ })).toHaveAttribute("href", "/cultivation");
  });
});
