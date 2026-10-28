import { trolleyLayout } from "@/config/dashboard-layout";

/*
 * Perintah per tipe aktuator. Relay biasa memakai ON/OFF; aktuator virtual (BE-1) menjalankan urutan
 * di edge: patroli kamera, pindah kereta ke stasiun. Kosakata akhirnya milik backend
 * (`supportedCommands`); di sini hanya label, isian, dan urutan tombol untuk petani.
 */

/** Isian tambahan yang dibutuhkan perintah. */
export type CommandParams = "duration" | "station" | null;

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
};

/**
 * Tipe yang sudah dipensiunkan backend (dinonaktifkan migrasi V9) dan tidak ditampilkan lagi. Campur pupuk
 * otomatis dan jadwal siram/pupuk dijalankan layanan terpisah tim AI lewat pompa biasa.
 */
const retiredActuatorTypes = new Set(["DOSING_LOOP"]);

export function isRetiredActuator(a: { type?: string | null }): boolean {
  return !!a.type && retiredActuatorTypes.has(a.type);
}

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

/** Ringkasan perintah untuk riwayat & pelacak: "Pindah ke stasiun 3". */
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
    default:
      return commandType;
  }
}

// ── Isian ─────────────────────────────────────────────────────────────────────

type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateStation(raw: string, count = trolleyLayout.stationCount): Validated<number> {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return { ok: false, error: "Pilih nomor stasiun." };
  const n = Number(t);
  if (n < 1 || n > count) return { ok: false, error: `Nomor stasiun 1 sampai ${count}.` };
  return { ok: true, value: n };
}
