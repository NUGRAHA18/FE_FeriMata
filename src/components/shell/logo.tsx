import Link from "next/link";
import { productName } from "@/config/site";
import { cn } from "@/lib/cn";

/* Logo FERTIMATA punya dua varian: terang (latar putih) dan gelap (latar hijau tua #2B5749). Keduanya
 * dipasang berdampingan dan dipilih lewat varian `dark:` (atribut data-theme), jadi tidak ada kedipan
 * saat tema dimuat. <img> biasa karena berkas sudah diperkecil (logo-mark*.webp kecil, logo-full*.webp
 * untuk login). Aset sumber: documentations/Assets. */

/** Latar varian gelap; harus sama dengan warna latar berkas *-dark agar tepinya menyatu. */
export const logoDarkBg = "dark:bg-[#2B5749]";

/** Ubin logo kecil (mata-daun-tetes) yang menautkan ke Beranda. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${productName} — Beranda`}
      className={cn("grid size-11 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-white shadow-card ring-1 ring-line", logoDarkBg, className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/logo-mark.webp" alt="" width={256} height={256} className="size-full object-contain dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/logo-mark-dark.webp" alt="" width={256} height={256} className="hidden size-full object-contain dark:block" />
    </Link>
  );
}

/** Logo lengkap dengan tulisan "FERTIMATA — Smart Fertigation Melon". */
export function LogoFull({ className }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/logo-full.webp" alt={productName} width={720} height={227} className={cn("h-auto w-full object-contain dark:hidden", className)} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/logo-full-dark.webp" alt={productName} width={720} height={227} className={cn("hidden h-auto w-full object-contain dark:block", className)} />
    </>
  );
}
