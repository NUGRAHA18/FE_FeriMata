import { Bell, Camera, Gauge, Home, Settings, Sprout, ToggleRight, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; /** Hanya untuk peran yang boleh mengubah data. */ writeOnly?: boolean };

/* Label pendek, satu kata, bahasa sehari-hari: selalu ditampilkan di bawah ikon. */
export const primaryNav: NavItem[] = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/sensors", label: "Sensor", icon: Gauge },
  { href: "/actuators", label: "Kontrol", icon: ToggleRight, writeOnly: true },
  { href: "/ai", label: "Kamera", icon: Camera },
  { href: "/alerts", label: "Peringatan", icon: Bell },
];

export const secondaryNav: NavItem[] = [
  { href: "/cultivation", label: "Tanaman", icon: Sprout },
  { href: "/settings", label: "Pengaturan", icon: Settings },
  { href: "/profile", label: "Akun", icon: UserRound },
];

/** Menu yang boleh dilihat peran ini. */
export function navFor(items: NavItem[], canWrite: boolean) {
  return canWrite ? items : items.filter((i) => !i.writeOnly);
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
