import type { GrowthPhase } from "@/lib/api/types";
import { trolleyLayout } from "@/config/dashboard-layout";
import { formatNumber } from "@/lib/format";

/*
 * Perintah per tipe aktuator. Relay biasa memakai ON/OFF; aktuator virtual (BE-1) menjalankan urutan
 * di edge: patroli kamera, pindah kereta ke stasiun, campur pupuk ke target EC. Kosakata akhirnya milik
 * backend (`supportedCommands`); di sini hanya label, isian, dan urutan tombol untuk petani.
 */

/** Isian tambahan yang dibutuhkan perintah. */
export type CommandParams = "duration" | "station" | "dosing" | null;

export type CommandSpec = {
  command: string;
  /** Teks tombol di kartu. */
  label: string;
  /** Judul dialog konfirmasi. */
  title: (name: string) => string;
  /** Penjelasan singkat di dialog. */
  note: string | null;
  submitLabel: string;
  /** Perintah berhenti: tombol merah, tidak pernah dinonaktifkan (juga saat alat dilarang dinyalakan). */
  stop: boolean;
  params: CommandParams;
};

type SpecInput = Omit<CommandSpec, "stop" | "params"> & Partial<Pick<CommandSpec, "stop" | "params">>;
const spec = (s: SpecInput): CommandSpec => ({ stop: false, params: null, ...s });

const stopSpec = (note: string) =>
  spec({ command: "STOP", label: "Hentikan", title: (n) => `Hentikan ${n}?`, note, submitLabel: "Hentikan sekarang", stop: true });

const relaySpecs: CommandSpec[] = [
  spec({ command: "ON", label: "Nyalakan", title: (n) => `Nyalakan ${n}?`, note: null, submitLabel: "Nyalakan sekarang", params: "duration" }),
  spec({ command: "OFF", label: "Matikan", title: (n) => `Matikan ${n}?`, note: "Alat akan dimatikan sekarang.", submitLabel: "Matikan sekarang", stop: true }),
];

const specsByType: Record<string, CommandSpec[]> = {
  TROLLEY_PATROL: [
    spec({
      command: "START",
      label: "Patroli sekarang",
      title: () => "Mulai patroli kamera sekarang?",
      note: `Kereta kamera berjalan dari posisi awal ke stasiun ${trolleyLayout.stationCount} sambil memotret tanaman, lalu kembali. Selama patroli, pompa pupuk dan pengaduk tidak bisa dinyalakan.`,
      submitLabel: "Mulai patroli",
    }),
    stopSpec("Kereta kamera berhenti di tempat. Foto yang sudah diambil tetap disimpan."),
  ],
  TROLLEY_POSITION: [
    spec({
      command: "GOTO_STATION",
      label: "Pindah ke stasiun",
      title: () => "Pindahkan kereta kamera?",
      note: "Kereta kamera berjalan ke stasiun yang dipilih lalu berhenti di sana.",
      submitLabel: "Pindahkan",
      params: "station",
    }),
    spec({
      command: "HOME",
      label: "Kembali ke awal",
      title: () => "Kembalikan kereta kamera ke posisi awal?",
      note: "Kereta kamera berjalan ke ujung selatan rel (posisi awal) lalu berhenti.",
      submitLabel: "Kembalikan",
    }),
    stopSpec("Kereta kamera berhenti di tempat."),
  ],
  DOSING_LOOP: [
    spec({
      command: "DOSE_TO_TARGET",
      label: "Campur pupuk",
      title: () => "Campur pupuk sampai target?",
      note: "Pompa pupuk N, P, dan K menyala bergantian sedikit demi sedikit, lalu pengaduk berputar, sampai kepekatan pupuk (EC) di drum mencapai target. Alat berhenti sendiri bila target tercapai.",
      submitLabel: "Mulai campur",
      params: "dosing",
    }),
    stopSpec("Semua pompa pupuk dan pengaduk dimatikan sekarang."),
  ],
};

/** Bagian aktuator yang menentukan perintahnya. */
type CommandSource = { type?: string | null; supportedCommands?: string[] | null };

/** Tipe yang menjalankan urutan di edge, bukan menyalakan satu relay. */
export function isSequenceActuator(a: CommandSource): boolean {
  if (a.type && a.type in specsByType) return true;
  const cmds = a.supportedCommands;
  return !!cmds && cmds.some((c) => !["ON", "OFF"].includes(c.toUpperCase()));
}

/**
 * Tombol untuk satu aktuator, urutan tampil = urutan array (berhenti selalu terakhir). Tipe virtual yang
 * belum dikenal frontend mendapat tombol mentah per perintah dari `supportedCommands`.
 */
export function commandSpecsFor(a: CommandSource): CommandSpec[] {
  const supported = a.supportedCommands?.map((c) => c.toUpperCase()) ?? null;
  const known = (a.type && specsByType[a.type]) || (isSequenceActuator(a) ? null : relaySpecs);
  if (known) return supported ? known.filter((s) => supported.includes(s.command)) : known;
  const generic = (supported ?? []).map((c) => {
    const stop = c === "STOP" || c === "OFF";
    return spec({ command: c, label: c, title: (n) => `Kirim ${c} ke ${n}?`, note: null, submitLabel: "Kirim sekarang", stop });
  });
  return [...generic.filter((s) => !s.stop), ...generic.filter((s) => s.stop)];
}

export function commandSpec(a: CommandSource, command: string): CommandSpec {
  const c = command.toUpperCase();
  return commandSpecsFor(a).find((s) => s.command === c) ?? relaySpecs.find((s) => s.command === c) ?? relaySpecs[1];
}

/** Ringkasan perintah untuk riwayat & pelacak: "Pindah ke stasiun 3", "Campur pupuk ke EC 1,8". */
export function commandSummary(commandType: string, parameters: Record<string, unknown> | null | undefined): string {
  const c = commandType.toUpperCase();
  const p = parameters ?? {};
  switch (c) {
    case "ON":
      return "Nyalakan";
    case "OFF":
      return "Matikan";
    case "START":
      return "Mulai patroli";
    case "STOP":
      return "Hentikan";
    case "HOME":
      return "Kembali ke posisi awal";
    case "GOTO_STATION":
      return typeof p.station === "number" ? `Pindah ke stasiun ${p.station}` : "Pindah ke stasiun";
    case "DOSE_TO_TARGET": {
      const ec = typeof p.targetEc === "number" ? ` ke EC ${formatNumber(p.targetEc, 2)}` : "";
      const phase = typeof p.phase === "string" ? dosingPhases.find((x) => x.value === p.phase)?.label : undefined;
      return `Campur pupuk${ec}${phase ? ` (fase ${phase.toLowerCase()})` : ""}`;
    }
    default:
      return commandType;
  }
}

// ── Isian ─────────────────────────────────────────────────────────────────────

/**
 * Nilai `phase` yang diterima backend untuk DOSE_TO_TARGET (= kunci `dosing.ratio` di config edge).
 * Kode fase siklus tanam backend berbeda (VEGETATIVE, …), jadi dipetakan di sini.
 */
export const dosingPhases = [
  { value: "vegetatif", label: "Vegetatif", cycleCodes: ["VEGETATIVE", "VEGETATIF"] },
  { value: "buah_muda", label: "Buah muda", cycleCodes: ["YOUNG_FRUIT", "BUAH_MUDA"] },
  { value: "pembesaran_buah", label: "Pembesaran buah", cycleCodes: ["FRUIT_ENLARGEMENT", "PEMBESARAN_BUAH"] },
] as const;

export const TARGET_EC_MIN = 0.5;
export const TARGET_EC_MAX = 4.0;

/** Fase dosing yang cocok dengan fase tanam berjalan (kode atau nama), atau null. */
export function dosingPhaseFor(phase: Pick<GrowthPhase, "code" | "name"> | null | undefined): string | null {
  if (!phase) return null;
  const code = phase.code.toUpperCase();
  const name = phase.name.trim().toLowerCase().replace(/\s+/g, "_");
  return dosingPhases.find((p) => (p.cycleCodes as readonly string[]).includes(code) || p.value === name)?.value ?? null;
}

/** Usulan target EC: tengah rentang target fase berjalan, dibulatkan 0,1. */
export function suggestedTargetEc(phase: Pick<GrowthPhase, "ecTargetMin" | "ecTargetMax"> | null | undefined): number | null {
  if (!phase) return null;
  const { ecTargetMin: lo, ecTargetMax: hi } = phase;
  const v = lo != null && hi != null ? (lo + hi) / 2 : (lo ?? hi);
  return v == null ? null : Math.round(v * 10) / 10;
}

type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateStation(raw: string, count = trolleyLayout.stationCount): Validated<number> {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return { ok: false, error: "Pilih nomor stasiun." };
  const n = Number(t);
  if (n < 1 || n > count) return { ok: false, error: `Nomor stasiun 1 sampai ${count}.` };
  return { ok: true, value: n };
}

/** Target EC dalam mS/cm; koma atau titik desimal. Rentang = penolak salah ketik di backend. */
export function validateTargetEc(raw: string): Validated<number> {
  const t = raw.trim().replace(",", ".");
  if (!t) return { ok: false, error: "Target EC wajib diisi." };
  if (!/^\d+(\.\d+)?$/.test(t)) return { ok: false, error: "Target EC harus angka, mis. 1,8." };
  const n = Number(t);
  if (n < TARGET_EC_MIN || n > TARGET_EC_MAX)
    return { ok: false, error: `Target EC antara ${formatNumber(TARGET_EC_MIN, 1)} dan ${formatNumber(TARGET_EC_MAX, 1)} mS/cm.` };
  return { ok: true, value: n };
}
