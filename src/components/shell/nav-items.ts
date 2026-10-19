import { Bell, Camera, Gauge, Home, Settings, ToggleRight, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/* Label pendek, satu kata, bahasa sehari-hari: selalu ditampilkan di bawah ikon. */
export const primaryNav: NavItem[] = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/sensors", label: "Sensor", icon: Gauge },
  { href: "/actuators", label: "Kontrol", icon: ToggleRight },
  { href: "/ai", label: "Kamera", icon: Camera },
  { href: "/alerts", label: "Peringatan", icon: Bell },
];

export const secondaryNav: NavItem[] = [
  { href: "/settings", label: "Pengaturan", icon: Settings },
  { href: "/profile", label: "Akun", icon: UserRound },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
