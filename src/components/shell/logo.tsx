import Link from "next/link";
import { productName } from "@/config/site";
import { cn } from "@/lib/cn";

/*
 * Logo FertiMata dari public/icons/logo-1.png. Gambarnya berlatar putih, jadi selalu ditaruh di
 * ubin putih (juga pada tema gelap). Ditulis sebagai <img> biasa: berkasnya sudah diperkecil
 * (logo-mark.webp untuk ubin kecil, logo-full.webp dengan tulisan untuk halaman login).
 */

/** Ubin logo kecil (emblem greenhouse) yang menautkan ke Beranda. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${productName} — Beranda`}
      className={cn("grid size-11 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-white shadow-card ring-1 ring-line", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/logo-mark.webp" alt="" width={256} height={256} className="size-full object-contain" />
    </Link>
  );
}

/** Logo lengkap dengan tulisan "FertiMata". */
export function LogoFull({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icons/logo-full.webp" alt={productName} width={720} height={474} className={cn("h-auto w-full object-contain", className)} />
  );
}
