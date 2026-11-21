import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installState, resetInstallStateForTests, startInstallCapture, type InstallEnv } from "@/lib/pwa-install";
import { InstallCard } from "./install-card";

const base: InstallEnv = {
  isSecureContext: true,
  userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/130",
  standalone: false,
  hasPrompt: false,
  justInstalled: false,
};

describe("installState", () => {
  it("sudah berjalan sebagai aplikasi → installed (tombol disembunyikan)", () => {
    expect(installState({ ...base, standalone: true })).toBe("installed");
    expect(installState({ ...base, justInstalled: true, hasPrompt: true })).toBe("installed");
  });

  it("peristiwa pasang tertangkap → prompt", () => {
    expect(installState({ ...base, hasPrompt: true })).toBe("prompt");
  });

  it("http://IP tidak bisa dipasang → insecure", () => {
    expect(installState({ ...base, isSecureContext: false })).toBe("insecure");
  });

  it("iPhone tanpa peristiwa pasang → ios; browser lain → manual", () => {
    expect(installState({ ...base, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari" })).toBe("ios");
    expect(installState(base)).toBe("manual");
  });
});

/** Peristiwa `beforeinstallprompt` palsu dengan prompt() yang bisa diamati. */
function installEvent(outcome: "accepted" | "dismissed") {
  const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
  e.prompt = vi.fn(async () => undefined);
  e.userChoice = Promise.resolve({ outcome });
  return e;
}

let stop: () => void;

beforeEach(() => {
  resetInstallStateForTests();
  stop = startInstallCapture();
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => {
  stop();
  vi.unstubAllGlobals();
});

describe("Kartu simpan ke layar utama", () => {
  it("tanpa peristiwa pasang: tombol ke petunjuk manual, bukan tombol pasang", async () => {
    const user = userEvent.setup();
    render(<InstallCard />);
    expect(screen.queryByRole("button", { name: "Simpan ke layar utama" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lihat caranya" }));
    expect(screen.getByText(/Pasang aplikasi/)).toBeInTheDocument();
  });

  it("dibuka lewat http://IP → penjelasan butuh https, tanpa tombol", () => {
    vi.stubGlobal("isSecureContext", false);
    render(<InstallCard />);
    expect(screen.getByText(/butuh alamat https/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("peristiwa pasang datang setelah kartu tampil → tombol pasang muncul dan memicu dialog browser", async () => {
    const user = userEvent.setup();
    render(<InstallCard />);
    const event = installEvent("accepted");
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true); // bar bawaan browser ditahan
    await user.click(await screen.findByRole("button", { name: "Simpan ke layar utama" }));
    expect(event.prompt).toHaveBeenCalledTimes(1);
  });

  it("peristiwa yang datang SEBELUM kartu dibuka tetap terbaca (ditangkap di layout)", () => {
    act(() => {
      window.dispatchEvent(installEvent("accepted"));
    });
    render(<InstallCard />);
    expect(screen.getByRole("button", { name: "Simpan ke layar utama" })).toBeInTheDocument();
  });

  it("ditolak di dialog → pesan ramah dan tombol bisa dicoba lagi lewat petunjuk", async () => {
    const user = userEvent.setup();
    render(<InstallCard />);
    act(() => {
      window.dispatchEvent(installEvent("dismissed"));
    });
    await user.click(await screen.findByRole("button", { name: "Simpan ke layar utama" }));
    expect(await screen.findByText(/Tidak jadi disimpan/)).toBeInTheDocument();
  });

  it("selesai dipasang (appinstalled) → kartu hilang", async () => {
    render(<InstallCard />);
    act(() => {
      window.dispatchEvent(installEvent("accepted"));
    });
    expect(await screen.findByRole("button", { name: "Simpan ke layar utama" })).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(screen.queryByText("Simpan FertiMata di layar utama")).not.toBeInTheDocument();
  });

  it("sudah dibuka sebagai aplikasi (standalone) → kartu tidak tampil", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("standalone"), media: q, addEventListener() {}, removeEventListener() {} }));
    render(<InstallCard />);
    expect(screen.queryByText("Simpan FertiMata di layar utama")).not.toBeInTheDocument();
  });
});
