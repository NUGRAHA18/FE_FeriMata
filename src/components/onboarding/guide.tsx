"use client";

import { Bell, Camera, Cpu, Droplets, FlaskConical, Sprout, ThermometerSun, ToggleRight, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useCanWrite } from "@/lib/auth/use-session";
import { cn } from "@/lib/cn";
import { useLocalChoice } from "@/lib/local-state";

const GUIDE_KEY = "fertimata.guide";

type Step = { icon: LucideIcon; title: string; body: string[]; writeOnly?: boolean };

/** Isi petunjuk: satu langkah per kartu di Beranda, dengan bahasa sehari-hari. */
export const guideSteps: Step[] = [
  {
    icon: Sprout,
    title: "Selamat datang di FertiMata",
    body: [
      "Aplikasi ini menampilkan keadaan greenhouse melon dari sensor, dan dipakai untuk menyalakan atau mematikan pompa.",
      "Petunjuk singkat ini menjelaskan arti tiap kartu di Beranda. Bisa dibuka lagi kapan saja dari halaman Pengaturan.",
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
      "Bila air tangki rendah, pompa dan pengaduk tidak bisa dinyalakan sampai tangki diisi.",
    ],
  },
  {
    icon: Cpu,
    title: "Alat",
    body: [
      "Kartu Alat menunjukkan alat mana yang terhubung (titik hijau) dan mana yang perlu dicek (kuning atau merah).",
      "Kartu \"Alat terhubung\" menunjukkan berapa alat yang menyala dan apakah listrik dari PLN atau baterai. Warnanya merah saat memakai baterai.",
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
    icon: Camera,
    title: "Kamera dan tanaman",
    body: [
      "Menu Kamera berisi foto tanaman per stasiun beserta hasil pemeriksaan kekurangan N, P, dan K.",
      "Menu Tanaman mencatat umur tanaman (HST) dan fase pertumbuhannya.",
    ],
  },
];

/** Dialog petunjuk bertahap. Ditutup lewat tombol mana pun → dianggap sudah dibaca. */
export function GuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const canWrite = useCanWrite();
  const steps = guideSteps.filter((s) => canWrite || !s.writeOnly);
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  const close = () => {
    setIndex(0);
    onClose();
  };
  const Icon = step.icon;

  return (
    <Dialog
      open={open}
      onClose={close}
      title={step.title}
      description={`Petunjuk ${index + 1} dari ${steps.length}`}
      footer={
        <>
          {!last && (
            <Button variant="ghost" onClick={close} className="mr-auto">
              Lewati
            </Button>
          )}
          {index > 0 && (
            <Button variant="soft" onClick={() => setIndex(index - 1)}>
              Sebelumnya
            </Button>
          )}
          <Button variant="accent" onClick={last ? close : () => setIndex(index + 1)}>
            {last ? "Mulai pakai" : "Lanjut"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <span className="grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
          <Icon aria-hidden className="size-7" strokeWidth={1.8} />
        </span>
        {step.body.map((p) => (
          <p key={p} className="text-[15px] leading-relaxed text-ink-2">
            {p}
          </p>
        ))}
        <div className="flex justify-center gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span key={s.title} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-accent" : "w-1.5 bg-line")} />
          ))}
        </div>
      </div>
    </Dialog>
  );
}

/** Petunjuk yang terbuka sendiri sekali di Beranda untuk pengguna baru di perangkat ini. */
export function FirstVisitGuide() {
  const [seen, setSeen] = useLocalChoice(GUIDE_KEY, ["seen", "new"] as const, "new");
  return <GuideDialog open={seen === "new"} onClose={() => setSeen("seen")} />;
}
