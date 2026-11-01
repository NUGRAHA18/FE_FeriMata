import { Bell, CalendarClock, CircleHelp, Camera, Gauge, Home, Settings, Sprout, ToggleRight, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; /** Hanya untuk peran yang boleh mengubah data. */ writeOnly?: boolean };

/* Label pendek, satu kata, bahasa sehari-hari: selalu ditampilkan di bawah ikon. */
export const primaryNav: NavItem[] = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/sensors", label: "Sensor", icon: Gauge },
  // Jadwal siram: juga tombol bulat di tengah bottom nav mobile; terbuka untuk semua peran (Pelihat hanya melihat).
  { href: "/jadwal-siram", label: "Siram", icon: CalendarClock },
  { href: "/actuators", label: "Kontrol", icon: ToggleRight, writeOnly: true },
  { href: "/ai", label: "Kamera", icon: Camera },
  { href: "/alerts", label: "Peringatan", icon: Bell },
];

export const secondaryNav: NavItem[] = [
  { href: "/cultivation", label: "Tanaman", icon: Sprout },
  { href: "/settings", label: "Pengaturan", icon: Settings },
  /** Tautannya kontekstual: /panduan#<bagian halaman yang sedang dibuka> (lib/guide-content). */
  { href: "/panduan", label: "Panduan", icon: CircleHelp },
  { href: "/profile", label: "Akun", icon: UserRound },
];

/** Tombol bulat di tengah bottom nav mobile: Jadwal siram. */
export const mobileFab: NavItem = primaryNav.find((i) => i.href === "/jadwal-siram")!;

/** Bottom nav mobile: [kiri ×2] (Siram) [kanan ×1] [Lainnya]; sisanya masuk "Lainnya".
 * Tanpa hak ubah, Kontrol hilang sehingga Kamera naik ke slot kanan. */
export function mobileNav(canWrite: boolean) {
  const all = navFor(primaryNav, canWrite).filter((i) => i.href !== mobileFab.href);
  const left = all.slice(0, 2);
  const right = all.slice(2, 3);
  const more = [...all.slice(3), ...secondaryNav];
  return { left, right, more };
}

/** Menu yang boleh dilihat peran ini. */
export function navFor(items: NavItem[], canWrite: boolean) {
  return canWrite ? items : items.filter((i) => !i.writeOnly);
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
