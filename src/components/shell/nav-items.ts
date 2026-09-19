import { Bell, Gauge, Home, ScanEye, Settings, SlidersHorizontal, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const primaryNav: NavItem[] = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/sensors", label: "Sensor", icon: Gauge },
  { href: "/actuators", label: "Kontrol", icon: SlidersHorizontal },
  { href: "/ai", label: "AI/Kamera", icon: ScanEye },
  { href: "/alerts", label: "Alert", icon: Bell },
];

export const secondaryNav: NavItem[] = [
  { href: "/settings", label: "Pengaturan", icon: Settings },
  { href: "/profile", label: "Profil", icon: UserRound },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
