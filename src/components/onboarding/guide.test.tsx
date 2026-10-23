import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderWithProviders, signIn } from "@/test/utils";
import { FirstVisitGuide, guideSteps } from "./guide";

// local-state juga punya cadangan di memori; set eksplisit supaya tiap test mulai sebagai pengguna baru.
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("fertimata.guide", "new");
});

describe("FirstVisitGuide", () => {
  it("terbuka sendiri pada kunjungan pertama, lalu tidak muncul lagi setelah dilewati", async () => {
    signIn();
    const { user, unmount } = renderWithProviders(<FirstVisitGuide />);
    expect(screen.getByRole("dialog", { name: /selamat datang/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lewati" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<FirstVisitGuide />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("bisa maju-mundur dan ditutup dari langkah terakhir", async () => {
    signIn();
    const { user } = renderWithProviders(<FirstVisitGuide />);
    await user.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(screen.getByRole("dialog", { name: /kondisi di dalam greenhouse/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sebelumnya" }));
    expect(screen.getByRole("dialog", { name: /selamat datang/i })).toBeInTheDocument();
    for (let i = 1; i < guideSteps.length; i++) await user.click(screen.getByRole("button", { name: "Lanjut" }));
    await user.click(screen.getByRole("button", { name: "Mulai pakai" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pelihat (VIEWER) tidak mendapat langkah tentang menyalakan alat", async () => {
    signIn("VIEWER");
    const { user } = renderWithProviders(<FirstVisitGuide />);
    const viewerSteps = guideSteps.filter((s) => !s.writeOnly);
    expect(screen.getByText(`Petunjuk 1 dari ${viewerSteps.length}`)).toBeInTheDocument();
    for (let i = 1; i < viewerSteps.length; i++) {
      await user.click(screen.getByRole("button", { name: "Lanjut" }));
      expect(screen.queryByRole("dialog", { name: /menyalakan alat/i })).not.toBeInTheDocument();
    }
  });
});
