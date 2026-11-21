import beranda from "./guide-visual/beranda.generated.json";

/* Panduan bergambar: tangkapan layar tampilan HP dengan nomor di tiap bagian, lalu satu-dua kalimat penjelasan.
 * Gambar dan posisi nomor DIHASILKAN skrip (scripts/panduan, `npm run panduan:shots`) dari aplikasi yang
 * berjalan dengan data contoh; di sini hanya teksnya. `id` harus sama dengan scripts/panduan/pages.mjs.
 * Bahasa untuk petani: pendek, tanpa istilah teknis; angka dan tombol memakai tulisan persis seperti di layar. */

export type VisualSpot = { id: string; n: number; x: number; y: number; w: number; h: number };
export type VisualPart = { image: string; width: number; height: number; spots: VisualSpot[] };
export type VisualItem = { title: string; text: string; link?: { href: string; label: string } };
export type VisualGuide = {
  slug: string;
  /** Nama layar untuk teks alternatif gambar. */
  screen: string;
  parts: VisualPart[];
  items: Record<string, VisualItem>;
};

const berandaItems: Record<string, VisualItem> = {
  status: {
    title: "Status dan peringatan",
    text: "Hijau \"Data langsung\" berarti angka di layar terbaru. Angka di sebelahnya adalah jumlah peringatan; ketuk untuk membacanya.",
    link: { href: "/alerts", label: "Buka Peringatan" },
  },
  kondisi: {
    title: "Kondisi greenhouse",
    text: "Suhu, kelembapan udara, dan cahaya di dalam greenhouse. \"Posisi kamera\" menunjukkan di stasiun mana kereta kamera berhenti.",
  },
  siram: {
    title: "Siram otomatis",
    text: "Pompa siram menyala sendiri pada jam yang Anda isi. Geser saklarnya untuk menghidupkan atau mematikan.",
    link: { href: "/jadwal-siram", label: "Atur jam siram" },
  },
  pupuk: {
    title: "Pupuk otomatis",
    text: "Pada hari pupuk, pupuk N, P, K dituang ke drum sebelum jam siram pertama. Takarannya dari AI atau Anda atur sendiri.",
  },
  manual: {
    title: "Aksi manual",
    text: "Nyalakan atau matikan pompa sekarang tanpa menunggu jadwal. Aturan keselamatan tetap berlaku, jadi kadang tombol ditolak, misalnya saat air drum rendah.",
    link: { href: "/actuators", label: "Buka Kontrol" },
  },
  tanaman: {
    title: "Umur tanaman",
    text: "Hari sejak semai dan fase tumbuh sekarang. Target kepekatan pupuk mengikuti fase ini.",
    link: { href: "/cultivation", label: "Buka Tanaman" },
  },
  "angka-sensor": {
    title: "Angka sensor",
    text: "Kartu pertama: berapa perangkat yang terhubung. Kartu lainnya: angka dari tanah (kelembapan, suhu, keasaman, kepekatan, N, P, K). Tanda \"—\" berarti sensornya belum mengirim angka.",
    link: { href: "/sensors", label: "Buka Sensor" },
  },
  drum: {
    title: "Drum pupuk",
    text: "Kepekatan (EC) dibanding target fase tanam, keasaman (pH), dan suhu larutan. \"Air drum cukup\" berarti pompa boleh menyala; kalau \"rendah\", isi air dulu.",
  },
  perangkat: {
    title: "Perangkat",
    text: "Alat-alat yang terhubung ke sistem. \"Terhubung\" berarti normal; kalau tidak, periksa daya dan kabelnya.",
    link: { href: "/devices", label: "Buka Perangkat" },
  },
  kamera: {
    title: "Foto tanaman terbaru",
    text: "Foto terakhir dari kamera dan hasil pemeriksaan daun oleh AI. \"Patroli sekarang\" menyuruh kamera berkeliling memotret.",
    link: { href: "/ai", label: "Buka Kamera" },
  },
  aktivitas: {
    title: "Baru saja terjadi",
    text: "Catatan singkat: pompa dinyalakan atau dimatikan, dan peringatan terbaru. Ketuk satu baris untuk rinciannya.",
  },
  menu: {
    title: "Menu bawah",
    text: "Untuk pindah halaman: Beranda, Sensor, Siram, Kontrol, dan Lainnya (Kamera, Peringatan, Tanaman, Pengaturan, Panduan).",
  },
};

const visualGuides: Record<string, VisualGuide> = {
  beranda: { slug: "beranda", screen: "Beranda", parts: beranda.parts, items: berandaItems },
};

/** Panduan bergambar untuk bagian Panduan dengan id ini, atau undefined bila belum dibuat. */
export function visualGuideFor(sectionId: string): VisualGuide | undefined {
  return visualGuides[sectionId];
}

export const allVisualGuides: readonly VisualGuide[] = Object.values(visualGuides);
