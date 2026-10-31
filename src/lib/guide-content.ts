import {
  Bell,
  CalendarClock,
  BookOpen,
  Camera,
  Cpu,
  Droplets,
  FlaskConical,
  Gauge,
  Home,
  Settings,
  Sprout,
  ThermometerSun,
  ToggleRight,
  UserRound,
  type LucideIcon,
} from "lucide-react";

/* Isi Panduan (/panduan) & petunjuk Beranda, satu sumber. Nama komponen SAMA PERSIS dengan label layar;
 * istilah teknis hanya di "Istilah". Jangan janjikan fitur yang tidak ada di backend (jadwal milik tim AI). */

export type GuideTerm = { term: string; meaning: string };
export type GuideTrouble = { sign: string; action: string };

export type GuideSection = {
  /** Anchor di /panduan#id. */
  id: string;
  title: string;
  icon: LucideIcon;
  /** Halaman yang dijelaskan (untuk tombol "Buka halaman"). */
  href?: string;
  /** Halaman ini untuk apa (1–2 kalimat). */
  purpose: string;
  /** Yang tampil di layar: label persis seperti di aplikasi, lalu artinya. */
  onScreen: GuideTerm[];
  /** Yang perlu dilakukan, berurutan. */
  steps: string[];
  /** Kalau ada masalah: tandanya, lalu tindakannya. */
  troubles: GuideTrouble[];
  /** Catatan untuk Pelihat (akun yang hanya bisa melihat). */
  viewerNote?: string;
};

export const guideSections: GuideSection[] = [
  {
    id: "beranda",
    title: "Beranda",
    icon: Home,
    href: "/",
    purpose: "Ringkasan keadaan greenhouse hari ini dalam satu layar. Buka ini dulu setiap pagi.",
    onScreen: [
      { term: "Kondisi greenhouse hari ini", meaning: "Suhu, kelembapan udara, dan cahaya di dalam greenhouse. Bukan cuaca di luar." },
      { term: "Denah", meaning: "Gambar greenhouse dari atas, dengan posisi kereta kamera di rel." },
      { term: "Kelembapan tanah, Suhu tanah, Keasaman tanah (pH)", meaning: "Angka dari sensor yang ditanam di bedengan." },
      { term: "Kepekatan pupuk tanah (EC)", meaning: "Seberapa banyak pupuk yang larut di tanah. Makin tinggi, makin pekat." },
      { term: "Nitrogen (N), Fosfor (P), Kalium (K)", meaning: "Kandungan tiga unsur hara utama di tanah, dari sensor tanah." },
      { term: "Tangki pupuk", meaning: "Kepekatan, keasaman, dan suhu larutan di tangki, dibanding target fase tanam: Sesuai target, Terlalu encer, atau Terlalu pekat." },
      { term: "Air drum cukup / Air drum rendah", meaning: "Isi drum pupuk. Saat rendah, pompa air utama, pompa pupuk, dan pengaduk tidak bisa dinyalakan." },
      { term: "Umur tanaman", meaning: "Hari sejak benih disemai dan fase pertumbuhan sekarang." },
      { term: "Alat", meaning: "Berapa alat yang terhubung, berapa sensor, dan berapa alat yang bisa dikendalikan." },
      { term: "Baru saja terjadi", meaning: "Perintah ke alat dan peringatan terbaru, paling baru di atas." },
      { term: "Foto tanaman terbaru", meaning: "Foto terakhir dari kereta kamera beserta hasil pemeriksaannya." },
      { term: "diperbarui … lalu", meaning: "Kapan sensor terakhir mengirim angka. Tanda \"—\" berarti belum ada angka dari sensor itu." },
    ],
    steps: [
      "Lihat tombol Peringatan di atas. Kalau ada angka merah, buka dan baca dulu.",
      "Periksa kartu Tangki pupuk: apakah tertulis Sesuai target dan Air drum cukup.",
      "Lihat angka tanah. Kalau ada yang aneh, buka menu Sensor untuk melihat riwayatnya.",
      "Lihat kartu Alat: semua alat sebaiknya Terhubung.",
    ],
    troubles: [
      { sign: "Muncul pita merah \"Listrik PLN padam, sistem memakai baterai\".", action: "Periksa listrik PLN. Pompa air utama, pompa pupuk, pengaduk, dan kereta kamera dikunci sampai listrik PLN kembali." },
      { sign: "Muncul pita \"Angka yang tampil adalah data terakhir …\" atau angka terlihat pudar.", action: "HP sedang tidak tersambung. Angka itu adalah angka terakhir beserta jamnya. Periksa sinyal atau Wi-Fi." },
      { sign: "Angka tidak berubah lama sekali.", action: "Lihat tulisan \"diperbarui … lalu\". Kalau sudah lama, buka kartu Alat dan cek alat yang Terputus." },
    ],
  },
  {
    id: "sensor",
    title: "Sensor",
    icon: Gauge,
    href: "/sensors",
    purpose: "Semua angka dari sensor, dan riwayat tiap sensor dalam bentuk grafik.",
    onScreen: [
      { term: "Angka terakhir", meaning: "Angka paling baru dari sensor itu, beserta jam dicatat." },
      { term: "Setelah dikoreksi lab", meaning: "Angka yang sudah disesuaikan dengan hasil uji lab. Angka besar di atasnya adalah angka asli dari sensor, yang tidak pernah diubah." },
      { term: "Riwayat", meaning: "Grafik angka sensor. Garis = rata-rata. Pita tipis = angka terendah sampai tertinggi. Garis yang terputus = saat itu tidak ada data (alat atau jaringan mati)." },
      { term: "Rentang waktu", meaning: "Pilih 1 jam sampai 90 hari ke belakang. Data rinci hanya ada untuk 30 hari terakhir; grafik ringkasan per jam disimpan seterusnya, jadi grafik lama terlihat lebih halus." },
      { term: "Grafik / Tabel", meaning: "Tampilkan riwayat sebagai gambar atau sebagai daftar angka." },
      { term: "Unduh CSV", meaning: "Simpan angka asli sensor ke HP atau laptop, bisa dibuka di Excel." },
      { term: "Kalibrasi", meaning: "Hasil uji lab untuk sensor ini, dan seberapa jauh angka sensor berbeda dari lab." },
      { term: "Belum dikalibrasi / Sudah dikalibrasi", meaning: "Apakah angka sensor ini sudah dikoreksi dengan hasil uji lab." },
      { term: "Peringatan", meaning: "Peringatan yang berhubungan dengan sensor ini saja." },
      { term: "Dimatikan / Baru terdeteksi", meaning: "Sensor sedang tidak dipakai, atau sensor baru yang belum diperiksa operator." },
    ],
    steps: [
      "Ketik nama di kotak cari untuk menemukan sensor.",
      "Ketuk kartu sensor untuk melihat angka terakhir dan riwayatnya.",
      "Pilih rentang waktu di atas grafik. Sentuh grafik untuk melihat angka di jam tertentu.",
      "Untuk kalibrasi: ambil sampel tanah di dekat sensor, catat jamnya, kirim ke lab. Setelah hasilnya keluar, buka tab Kalibrasi lalu tekan Tambah sampel.",
      "Setelah ada beberapa sampel, tekan Hitung dari sampel lab. Periksa hasilnya, lalu tekan Simpan & pakai.",
    ],
    troubles: [
      { sign: "Grafik kosong atau tertulis \"Belum ada data pada rentang waktu ini\".", action: "Pilih rentang yang lebih panjang. Kalau tetap kosong, periksa alat sensor di halaman Alat." },
      { sign: "Grafik terputus di jam tertentu.", action: "Saat itu alat atau jaringan mati. Tidak perlu tindakan kalau sekarang sudah tersambung lagi." },
      { sign: "Angka sensor jauh berbeda dari hasil lab.", action: "Catat Cek di larutan standar setelah ujung sensor dibersihkan. Kalau selisihnya besar, minta operator mengkalibrasi ulang." },
    ],
  },
  {
    id: "jadwal-siram",
    title: "Jadwal siram",
    icon: CalendarClock,
    href: "/jadwal-siram",
    purpose: "Pompa siram menyala sendiri setiap hari pada jam yang dipilih. Berapa lama menyalanya ditentukan AI dari kondisi tanah saat jamnya tiba. Dibuka dari tombol bulat Siram di bawah layar.",
    viewerNote: "Akun Pelihat bisa melihat jadwal; menambah, mengubah, dan menghapus jadwal dilakukan operator atau admin.",
    onScreen: [
      { term: "Jam siram", meaning: "Daftar jam (WIB, 24 jam) pompa siram menyala, misalnya \"06:00 · lama ditentukan AI · cadangan 5 mnt\"." },
      { term: "Lama siram cadangan", meaning: "Dipakai hanya bila AI tidak bisa dipakai (AI tidak menjawab atau data sensor tanah belum ada). Biasanya lama siram ditentukan AI." },
      { term: "Saklar di tiap jam", meaning: "Menyalakan atau mematikan jadwal itu tanpa menghapusnya. Yang mati bertanda Mati." },
      { term: "Berikutnya", meaning: "Kapan penyiraman berikutnya, misalnya \"besok 06:00\". Jam yang sudah lewat hari ini baru berjalan besok." },
      { term: "Terakhir: Disiram …", meaning: "Pompa siram sudah dinyalakan pada jamnya, beserta lamanya: \"(ditentukan AI)\" atau \"(durasi cadangan)\" bila AI tidak bisa dipakai." },
      { term: "Terakhir: Tidak perlu siram", meaning: "AI menilai tanah masih cukup basah atau fase tanaman sedang tidak perlu disiram. Ini normal, bukan masalah." },
      { term: "Terakhir: Dibatalkan demi keamanan", meaning: "Pompa siram tidak boleh menyala saat itu; alasannya tertulis, misalnya listrik PLN padam atau air drum rendah." },
      { term: "Terakhir: Terlewat (sistem mati)", meaning: "Komputer utama mati pada jam siram. Penyiraman tidak diulang." },
      { term: "Terakhir: Gagal", meaning: "Perintah tidak bisa dikirim ke pompa, misalnya pompa siram dimatikan di Pengaturan." },
    ],
    steps: [
      "Tekan Tambah jam.",
      "Ketik jamnya (24 jam), misalnya 0600 atau 17:30 — titik dua muncul sendiri. Bisa juga ketuk jam cepat seperti 06:00.",
      "Ketik lama siram cadangan dalam menit, misalnya 5 (dipakai bila AI tidak menjawab). Pakai koma untuk setengah menit: 1,5 = 1 menit 30 detik. Bisa juga ketuk 3, 5, atau 10 menit.",
      "Tekan Simpan jadwal. Untuk mengubah, tekan tombol pensil; untuk menghapus, tombol tempat sampah.",
    ],
    troubles: [
      { sign: "Tertulis \"Dibatalkan demi keamanan\".", action: "Atasi penyebabnya (listrik PLN, air drum). Jadwal berjalan lagi besok pada jam yang sama. Siram manual di halaman Kontrol bila perlu." },
      { sign: "Tertulis \"Terlewat (sistem mati)\".", action: "Periksa komputer utama dan listriknya. Siram manual di halaman Kontrol bila perlu." },
      { sign: "\"Jam … sudah ada di jadwal\".", action: "Satu jam hanya boleh dipakai sekali. Pilih jam lain atau ubah jadwal yang sudah ada." },
      { sign: "\"Jam tidak valid\".", action: "Jam 00 sampai 23, menit 00 sampai 59. Contoh: 06:00 untuk pagi, 17:30 untuk sore." },
      { sign: "\"Terlalu lama\".", action: "Lama siram cadangan melebihi batas pompa siram. Bagi menjadi dua jadwal bila perlu siram lebih lama." },
      { sign: "Sering tertulis \"(durasi cadangan)\".", action: "AI tidak bisa dipakai; alasannya tertulis di bawahnya. Periksa sensor tanah di halaman Sensor (angkanya harus baru) dan layanan AI." },
    ],
  },
  {
    id: "kontrol",
    title: "Kontrol",
    icon: ToggleRight,
    href: "/actuators",
    purpose: "Menyalakan dan mematikan pompa, pengaduk, dan kereta kamera dari HP.",
    viewerNote: "Hanya operator atau admin yang bisa menyalakan alat. Akun Pelihat bisa membaca bagian ini dan melihat status alat.",
    onScreen: [
      { term: "Menyala / Mati", meaning: "Keadaan alat menurut laporan alat itu sendiri." },
      { term: "Sedang berjalan / Tidak berjalan", meaning: "Untuk patroli dan kereta kamera: apakah tugasnya sedang dikerjakan." },
      { term: "Nyalakan", meaning: "Menyalakan alat. Aplikasi meminta konfirmasi dan lama menyala dalam detik." },
      { term: "Matikan / Hentikan", meaning: "Mematikan alat atau menghentikan tugas. Tombol ini selalu bisa ditekan dan tidak pernah ditolak." },
      { term: "Terkirim, menunggu jawaban alat", meaning: "Aplikasi sudah meneruskan perintah. Alat BELUM tentu menyala." },
      { term: "Dijalankan", meaning: "Alat sudah menjawab bahwa perintah dikerjakan. Baru di tahap ini alat benar-benar menyala atau mati." },
      { term: "Gagal", meaning: "Alat menolak atau tidak bisa mengerjakan. Alasannya tertulis di bawahnya." },
      { term: "Alat tidak menjawab", meaning: "Tidak ada jawaban dari alat dalam 2 menit. Perintah mungkin tidak dijalankan — atau sudah — jadi periksa alatnya langsung." },
      { term: "Ditolak demi keamanan", meaning: "Perintah Nyalakan dihentikan oleh aturan keselamatan. Alasannya tertulis di layar." },
      { term: "Patroli sekarang", meaning: "Kereta kamera berjalan memotret tanaman di setiap stasiun, lalu kembali." },
      { term: "Paling lama menyala (detik)", meaning: "Batas lama nyala. Setelah itu alat mati sendiri." },
      { term: "Takaran pompa", meaning: "Untuk pompa pupuk: berapa mililiter yang keluar per detik, dan berapa pupuk yang sudah keluar." },
      { term: "Riwayat perintah", meaning: "Semua perintah ke alat ini: siapa, kapan, dan hasilnya." },
    ],
    steps: [
      "Pilih alat, lalu tekan Nyalakan.",
      "Isi lama menyala dalam detik, lalu tekan Nyalakan sekarang.",
      "Tunggu sampai tulisannya berubah dari \"Terkirim, menunggu jawaban alat\" menjadi \"Dijalankan\".",
      "Untuk berhenti lebih cepat, tekan Matikan atau Hentikan.",
      "Untuk pompa pupuk: uji takaran pompa sebulan sekali. Nyalakan pompa beberapa detik, tampung di gelas ukur, catat volumenya. Ulangi paling sedikit 3 kali.",
    ],
    troubles: [
      { sign: "Lama tertahan di \"Terkirim, menunggu jawaban alat\".", action: "Alat belum menjawab. Cek halaman Alat: apakah alatnya Terputus. Periksa listrik dan kabel jaringan alat. Jangan menekan Nyalakan berulang-ulang." },
      { sign: "Tertulis \"Alat tidak menjawab\".", action: "Alat tidak memberi jawaban dalam 2 menit, jadi hasilnya tidak diketahui. Lihat sendiri apakah alatnya menyala, lalu cek halaman Alat: apakah Terputus. Kalau alat ternyata menjawab belakangan, statusnya berubah sendiri menjadi Dijalankan." },
      { sign: "\"Listrik PLN padam dan sistem memakai baterai\".", action: "Pompa air utama, pompa pupuk, pengaduk, dan kereta kamera dikunci sampai listrik PLN kembali. Tunggu PLN menyala." },
      { sign: "\"Air di drum pupuk rendah\".", action: "Pompa air utama, pompa pupuk, dan pengaduk dikunci sampai air cukup; kereta kamera tetap bisa jalan. Isi drum pupuk. Kalau drum sudah penuh, periksa kabel pelampungnya." },
      { sign: "\"Tidak bisa berjalan bersamaan\".", action: "Pompa pupuk tidak boleh jalan bersamaan dengan kereta kamera atau pompa air utama. Tunggu yang lain selesai, atau matikan dulu." },
      { sign: "\"Arah kamera tidak bisa diputar\".", action: "Kereta kamera sedang bergerak. Tunggu sampai berhenti." },
      { sign: "Alat mati sendiri sebelum waktunya.", action: "Bisa karena batas Paling lama menyala, atau karena aturan keselamatan di atas. Lihat Riwayat perintah." },
    ],
  },
  {
    id: "kamera",
    title: "Kamera",
    icon: Camera,
    href: "/ai",
    purpose: "Foto tanaman dari kereta kamera, dan hasil pemeriksaan kekurangan nutrisi.",
    onScreen: [
      { term: "Pilih stasiun", meaning: "Tampilkan foto dari satu titik tertentu di sepanjang rel." },
      { term: "Hasil pemeriksaan", meaning: "Dugaan kekurangan Nitrogen, Fosfor, atau Kalium dari foto. Batang makin panjang = makin yakin." },
      { term: "Foto yang lebih baru / Foto yang lebih lama", meaning: "Geser antar foto." },
    ],
    steps: [
      "Pilih stasiun yang ingin dilihat.",
      "Buka foto dan baca hasil pemeriksaannya.",
      "Cocokkan dengan tanaman di lapangan. Hasil pemeriksaan adalah dugaan, bukan kepastian.",
    ],
    troubles: [
      { sign: "Tertulis \"Belum ada foto\".", action: "Jalankan Patroli sekarang dari Beranda atau Kontrol (khusus operator). Foto baru muncul sendiri setelah selesai." },
      { sign: "Foto tidak tampil (kotak abu-abu).", action: "Periksa koneksi HP, lalu muat ulang halaman." },
    ],
  },
  {
    id: "peringatan",
    title: "Peringatan",
    icon: Bell,
    href: "/alerts",
    purpose: "Daftar hal yang perlu diperhatikan, misalnya listrik padam, alat terputus, atau air drum rendah.",
    onScreen: [
      { term: "Info", meaning: "Catatan saja, tidak mendesak." },
      { term: "Perlu perhatian", meaning: "Perlu dicek hari ini." },
      { term: "Darurat", meaning: "Perlu ditangani sekarang. Hanya peringatan Darurat yang dikirim sebagai notifikasi ke HP." },
      { term: "Belum ditangani / Sudah ditangani / Semua", meaning: "Saring daftar menurut status penanganan." },
      { term: "Tandai sudah ditangani", meaning: "Memberi tahu rekan bahwa masalahnya sudah dicek. Ini hanya menghapus dari daftar aktif, TIDAK memperbaiki masalahnya." },
    ],
    steps: [
      "Buka peringatan yang Darurat lebih dulu.",
      "Periksa masalahnya di lapangan.",
      "Setelah dicek, tekan Tandai sudah ditangani.",
    ],
    troubles: [
      { sign: "Peringatan yang sama muncul lagi.", action: "Masalahnya belum selesai. Periksa lagi alat atau sensor yang disebut." },
      { sign: "Notifikasi tidak masuk ke HP.", action: "Buka Akun, lihat kartu Notifikasi di HP ini." },
    ],
  },
  {
    id: "tanaman",
    title: "Tanaman",
    icon: Sprout,
    href: "/cultivation",
    purpose: "Umur tanaman dan fase pertumbuhannya, serta daftar tanaman di greenhouse.",
    onScreen: [
      { term: "Hari ke-…", meaning: "Umur tanaman dalam hari, dihitung dari tanggal semai. Hari ke-0 = hari benih disemai." },
      { term: "Nama fase", meaning: "Fase pertumbuhan sekarang: Semai, Vegetatif, Pembungaan, Pembuahan, Pematangan, atau Panen. Di bawahnya tertulis fase berikutnya dan berapa hari lagi." },
      { term: "Tambah tanaman", meaning: "Mencatat tanaman baru: cukup nama, catatan boleh dikosongkan." },
      { term: "Tombol tempat sampah", meaning: "Menghapus tanaman dari daftar. Tidak bisa dibatalkan; foto dari kamera tetap tersimpan." },
      { term: "Tanggal semai belum diisi", meaning: "Umur tanaman belum bisa dihitung. Tanggal semai diminta saat menambah tanaman pertama." },
      { term: "Tanggal semai (di form Tambah tanaman)", meaning: "Tanggal benih disemai, bukan tanggal pindah tanam. Hari ke-0 = hari itu; hari ke-berapa dan fasenya dihitung dari tanggal ini. Hanya diminta sekali, saat tanaman pertama." },
      { term: "Ubah tanggal semai", meaning: "Untuk memperbaiki tanggal semai yang salah isi." },
      { term: "Hapus tanaman terakhir", meaning: "Tanggal semai ikut dikosongkan. Musim berikutnya dimulai lagi dari Tambah tanaman pertama, yang akan meminta tanggal semai baru." },
    ],
    steps: [
      "Tanaman pertama: tekan Tambah tanaman, isi nama dan tanggal benih disemai, lalu Simpan tanaman. Hari ke-berapa langsung muncul.",
      "Tanaman berikutnya: cukup isi nama bebas (misalnya Melon pojok timur); tanggal semainya sama.",
      "Untuk menghapus, tekan tombol tempat sampah di tanaman itu, lalu Hapus. Bila itu tanaman terakhir, tanggal semai ikut dikosongkan.",
    ],
    troubles: [
      { sign: "Tertulis \"Tanggal semai belum diisi\".", action: "Operator atau admin menekan Tambah tanaman pertama dan mengisi tanggal semainya." },
      { sign: "Umur tanaman terlihat salah.", action: "Umur dihitung dari tanggal semai (hari ke-0 = hari benih disemai). Tekan Ubah tanggal semai di kartu Umur tanaman untuk memperbaikinya." },
    ],
    viewerNote: "Akun Pelihat hanya bisa melihat; menambah dan menghapus tanaman dilakukan operator.",
  },
  {
    id: "alat",
    title: "Alat",
    icon: Cpu,
    href: "/devices",
    purpose: "Alat mana yang terhubung, dan dari mana listriknya. Dibuka dari kartu Alat di Beranda.",
    onScreen: [
      { term: "Terhubung", meaning: "Alat mengirim kabar secara teratur." },
      { term: "Terputus", meaning: "Tidak ada kabar dari alat selama sekitar 2 menit. Bisa karena listrik, jaringan, atau alatnya mati. Angka yang tampil adalah angka terakhir beserta jamnya." },
      { term: "Belum pernah terhubung", meaning: "Alat terdaftar tetapi belum pernah mengirim kabar." },
      { term: "PLN / Baterai", meaning: "Sumber listrik alat saat ini." },
    ],
    steps: ["Periksa alat yang Terputus lebih dulu.", "Cek listrik, kabel, dan lampu di alatnya."],
    troubles: [{ sign: "Banyak alat Terputus bersamaan.", action: "Kemungkinan listrik atau jaringan greenhouse mati. Periksa komputer utama dan router." }],
  },
  {
    id: "akun",
    title: "Akun & notifikasi",
    icon: UserRound,
    href: "/profile",
    purpose: "Data akun Anda, notifikasi ke HP, ganti kata sandi, dan keluar.",
    onScreen: [
      { term: "Peran", meaning: "Admin: mengatur akun dan semua fitur. Operator: menyalakan alat dan mencatat data. Pelihat: hanya melihat." },
      { term: "Notifikasi di HP ini", meaning: "Kirim peringatan Darurat ke HP ini walaupun aplikasi ditutup." },
      { term: "Kirim notifikasi uji", meaning: "Mencoba apakah notifikasi sampai ke HP." },
      { term: "Ganti kata sandi", meaning: "Setelah diganti, perangkat lain harus masuk lagi." },
      { term: "Keluar", meaning: "Mengakhiri sesi di HP ini. Notifikasi ke HP ini juga dihentikan." },
    ],
    steps: [
      "Untuk notifikasi: nyalakan saklar Kirim notifikasi ke HP ini, lalu pilih Izinkan saat HP bertanya.",
      "Tekan Kirim notifikasi uji untuk mencoba.",
      "Kalau HP dipakai bergantian, tekan Keluar setelah selesai.",
    ],
    troubles: [
      { sign: "\"Notifikasi butuh alamat https\".", action: "Aplikasi dibuka lewat alamat angka (http). Minta admin memasang alamat https." },
      { sign: "Di iPhone tidak ada saklar notifikasi.", action: "Buka di Safari, ketuk Bagikan, pilih Tambahkan ke Layar Utama, lalu buka dari ikon di layar utama." },
      { sign: "Tertulis \"diblokir\".", action: "Ketuk ikon gembok di samping alamat, pilih Izin → Notifikasi → Izinkan, lalu muat ulang halaman." },
    ],
  },
  {
    id: "pengaturan",
    title: "Pengaturan",
    icon: Settings,
    href: "/settings",
    purpose: "Tema tampilan, mode sederhana, petunjuk singkat, sensor & alat yang dimatikan, dan (untuk admin) daftar pengguna.",
    onScreen: [
      { term: "Sensor & alat yang dimatikan", meaning: "Sensor dan alat yang sedang tidak dipakai, tidak tampil di halaman lain. Buka salah satu untuk menyalakannya lagi." },
      { term: "Tampilan", meaning: "Pilih tema Terang, Gelap, Hijau, atau Ikuti sistem. Hijau lebih nyaman dibaca di bawah sinar matahari." },
      { term: "Mode sederhana", meaning: "Menyembunyikan semua panel Info teknis supaya layar lebih ringkas." },
      { term: "Buka petunjuk", meaning: "Membuka lagi petunjuk singkat Beranda." },
      { term: "Pengguna", meaning: "Khusus admin: menambah akun, mengganti peran, dan mengatur ulang kata sandi." },
    ],
    steps: [
      "Nyalakan Mode sederhana kalau layar terasa terlalu ramai.",
      "Pakai tema Hijau saat bekerja di luar ruangan.",
    ],
    troubles: [{ sign: "Panel Info teknis tidak ada.", action: "Mode sederhana sedang menyala. Matikan di Pengaturan." }],
  },
];

/** Istilah teknis yang muncul di layar, dijelaskan sekali di sini. */
export const glossary: GuideTerm[] = [
  { term: "EC", meaning: "Kepekatan pupuk dalam air atau tanah. Makin tinggi, makin banyak pupuk yang larut." },
  { term: "pH", meaning: "Keasaman. Di bawah 7 asam, di atas 7 basa." },
  { term: "N, P, K", meaning: "Nitrogen, Fosfor, Kalium: tiga unsur hara utama tanaman." },
  { term: "HST", meaning: "Umur tanaman dalam hari. Di FertiMata dihitung dari tanggal semai: hari ke-0 = hari benih disemai." },
  { term: "PLN / Baterai", meaning: "Listrik dari PLN, atau baterai (aki) cadangan saat PLN padam." },
  { term: "Kalibrasi", meaning: "Menyesuaikan angka sensor dengan hasil uji lab supaya lebih tepat." },
  { term: "Data rinci / ringkasan per jam", meaning: "Data rinci (setiap kiriman sensor) disimpan 30 hari terakhir. Grafik ringkasan per jam disimpan seterusnya." },
  { term: "CSV", meaning: "Berkas tabel yang bisa dibuka di Excel atau Google Sheets." },
];

/* ── Petunjuk singkat Beranda (dialog untuk pengguna baru) ─────────────────── */

export type TourStep = { icon: LucideIcon; title: string; body: string[]; writeOnly?: boolean; link?: { href: string; label: string } };

export const quickTour: TourStep[] = [
  {
    icon: Sprout,
    title: "Selamat datang di FertiMata",
    body: [
      "Aplikasi ini menampilkan keadaan greenhouse melon dari sensor, dan dipakai untuk menyalakan atau mematikan pompa.",
      "Petunjuk singkat ini menjelaskan arti tiap kartu di Beranda. Bisa dibuka lagi kapan saja dari halaman Pengaturan atau Panduan.",
    ],
  },
  {
    icon: ThermometerSun,
    title: "Kondisi di dalam greenhouse",
    body: [
      "Kartu paling atas menunjukkan suhu dan kelembapan udara serta cahaya di dalam greenhouse — bukan cuaca di luar.",
      "Denah di kartu itu menunjukkan posisi kereta kamera di rel.",
    ],
  },
  {
    icon: Droplets,
    title: "Angka dari tanah",
    body: [
      "Kartu-kartu kecil berisi angka dari sensor tanah: kelembapan, suhu, keasaman (pH), kepekatan pupuk (EC), serta Nitrogen, Fosfor, dan Kalium.",
      "Tulisan \"diperbarui … lalu\" menunjukkan kapan sensor terakhir mengirim angka. Tanda \"—\" berarti belum ada data dari sensor itu.",
    ],
  },
  {
    icon: FlaskConical,
    title: "Tangki pupuk",
    body: [
      "Kartu tangki membandingkan kepekatan pupuk (EC) dengan target fase tanam yang sedang berjalan: Sesuai target, Terlalu encer, atau Terlalu pekat.",
      "Bila air drum rendah, pompa air utama, pompa pupuk, dan pengaduk tidak bisa dinyalakan sampai drum diisi.",
    ],
  },
  {
    icon: Cpu,
    title: "Alat",
    body: [
      "Kartu Alat menunjukkan alat mana yang terhubung (titik hijau) dan mana yang perlu dicek (kuning atau merah).",
      "Saat listrik PLN padam dan sistem memakai baterai, pita merah muncul di atas layar.",
    ],
  },
  {
    icon: Bell,
    title: "Peringatan",
    body: [
      "Tombol Peringatan di bagian atas menunjukkan jumlah peringatan yang belum ditangani. Merah berarti darurat, misalnya listrik PLN padam.",
      "Setelah masalahnya diperiksa, tekan \"Tandai sudah ditangani\" supaya rekan lain tahu.",
    ],
  },
  {
    icon: ToggleRight,
    title: "Menyalakan alat",
    writeOnly: true,
    body: [
      "Di menu Kontrol, setiap perintah Nyalakan meminta konfirmasi dan lama menyala dalam detik.",
      "Tunggu sampai tertulis \"Dijalankan\" — itu tanda alat benar-benar menjawab. Tombol Matikan selalu bisa ditekan.",
    ],
  },
  {
    icon: BookOpen,
    title: "Kamera, tanaman, dan panduan",
    body: [
      "Menu Kamera berisi foto tanaman per stasiun beserta hasil pemeriksaan kekurangan N, P, dan K. Menu Tanaman mencatat umur tanaman (HST) dan fase pertumbuhannya.",
      "Penjelasan lengkap setiap halaman ada di Panduan: ketuk tanda tanya (?) di menu kapan saja.",
    ],
    link: { href: "/panduan", label: "Buka panduan lengkap" },
  },
];

/* ── Pencarian & tautan kontekstual ────────────────────────────────────────── */

/** Halaman yang sedang dibuka → anchor bagian Panduan yang menjelaskannya. */
const routeSections: [prefix: string, id: string][] = [
  ["/sensors", "sensor"],
  ["/jadwal-siram", "jadwal-siram"],
  ["/actuators", "kontrol"],
  ["/ai", "kamera"],
  ["/alerts", "peringatan"],
  ["/cultivation", "tanaman"],
  ["/devices", "alat"],
  ["/profile", "akun"],
  ["/settings", "pengaturan"],
  ["/users", "pengaturan"],
];

export function sectionForPath(pathname: string): string | null {
  if (pathname === "/") return "beranda";
  const hit = routeSections.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return hit ? hit[1] : null;
}

/** Tautan ikon bantuan dari halaman yang sedang dibuka. */
export function guideHref(pathname: string): string {
  const id = sectionForPath(pathname);
  return id ? `/panduan#${id}` : "/panduan";
}

/** Huruf kecil tanpa tanda baca/aksen, supaya "Ph" cocok dengan "pH" dan "N−" dengan "n-". */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function sectionText(s: GuideSection): string {
  return normalize(
    [s.title, s.purpose, s.viewerNote ?? "", ...s.onScreen.flatMap((t) => [t.term, t.meaning]), ...s.steps, ...s.troubles.flatMap((t) => [t.sign, t.action])].join(" "),
  );
}

/** Bagian yang memuat SEMUA kata yang dicari (di judul atau isi). Kosong → semua bagian. */
export function filterSections(sections: GuideSection[], query: string): GuideSection[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (!words.length) return sections;
  return sections.filter((s) => {
    const text = sectionText(s);
    return words.every((w) => text.includes(w));
  });
}

export function filterGlossary(terms: GuideTerm[], query: string): GuideTerm[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (!words.length) return terms;
  return terms.filter((t) => words.every((w) => normalize(`${t.term} ${t.meaning}`).includes(w)));
}
