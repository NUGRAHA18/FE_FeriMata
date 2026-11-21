// Halaman yang difoto untuk Panduan bergambar dan bagian-bagian yang diberi nomor.
// Teks penjelasan tiap nomor ada di src/lib/guide-visual.ts (id harus sama).
//
// Cara menemukan bagian di layar (dijalankan di browser):
//   { h2: "Judul" }        kartu/seksi yang judulnya <h2> persis ini
//   { text: "Teks" }       kartu (rounded-card) yang memuat teks persis ini; { regex: "peringatan" } untuk pola
//   { selector: "css" }    elemen langsung
//   { union: [ ... ] }     kotak yang melingkupi beberapa bagian sekaligus

export const pages = [
  {
    slug: "beranda",
    path: "/",
    // Satu halaman HP panjang dipotong jadi beberapa layar; tiap potongan berisi bagian dari `from` sampai `to`.
    parts: [
      { from: null, to: "manual" },
      { from: "tanaman", to: "drum" },
      { from: "perangkat", to: null },
    ],
    spots: [
      { id: "status", find: { union: [{ regex: "^Data (langsung|tersimpan|terputus)" }, { regex: "peringatan$" }] } },
      { id: "kondisi", find: { text: "Kelembapan udara" } },
      { id: "siram", find: { text: "Siram otomatis" } },
      { id: "pupuk", find: { text: "Pupuk otomatis" } },
      { id: "manual", find: { union: [{ text: "AKSI MANUAL" }, { text: "Pompa siram" }, { text: "Patroli kamera" }] } },
      { id: "tanaman", find: { h2: "Umur tanaman" } },
      { id: "angka-sensor", find: { union: [{ regex: "^Angka sensor$" }, { text: "Fosfor (P)" }, { text: "Kalium (K)" }] } },
      { id: "drum", find: { selector: 'section[aria-label="Drum pupuk"]' } },
      { id: "perangkat", find: { h2: "Perangkat" } },
      { id: "kamera", find: { h2: "Foto tanaman terbaru" } },
      { id: "aktivitas", find: { h2: "Baru saja terjadi" } },
      { id: "menu", find: { selector: "nav" } },
    ],
  },
];
